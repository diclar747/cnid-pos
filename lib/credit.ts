import "server-only"

import type { PoolClient, QueryResult, QueryResultRow } from "pg"
import { findPaymentMethod, openSessionId } from "./cash"

// Cuenta corriente de clientes (venta a crédito): cargos al cobrar «a cuenta», abonos en caja y ajustes.

type Queryable = { query: <T extends QueryResultRow = any>(sql: string, values?: unknown[]) => Promise<QueryResult<T>> }
type Actor = { id: string | number; name: string }

export class CreditError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}

export type BillingCycle = "weekly" | "biweekly" | "monthly" | "none"
export const cycleLabel: Record<BillingCycle, string> = { weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual", none: "Sin ciclo" }
const money = (value: number) => `Gs ${value.toLocaleString("es-PY")}`

/** Inicio del período de cobro actual (en la zona horaria del restaurante). */
export function cycleStart(cycle: BillingCycle, now = new Date()): string | null {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion" }).format(now)
  const [y, m, d] = today.split("-").map(Number)
  if (cycle === "monthly") return `${today.slice(0, 8)}01`
  if (cycle === "biweekly") return `${today.slice(0, 8)}${d >= 16 ? "16" : "01"}`
  if (cycle === "weekly") {
    const date = new Date(Date.UTC(y, m - 1, d))
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
    return date.toISOString().slice(0, 10)
  }
  return null
}

async function lockCustomer(client: Queryable, customerId: number) {
  const row = (await client.query("SELECT id, name, credit_enabled, credit_limit, balance FROM customers WHERE id = $1 FOR UPDATE", [customerId])).rows[0]
  if (!row) throw new CreditError("Cliente no encontrado.", 404)
  return { id: Number(row.id), name: String(row.name), enabled: Boolean(row.credit_enabled), limit: row.credit_limit == null ? null : Number(row.credit_limit), balance: Number(row.balance) }
}

async function move(client: Queryable, customerId: number, delta: number, balance: number, entry: { kind: string; saleId?: number | null; paymentId?: number | null
  method?: string; description: string; actor: Actor }) {
  const after = balance + delta
  await client.query("UPDATE customers SET balance = $2, updated_at = NOW() WHERE id = $1", [customerId, after])
  await client.query(`INSERT INTO customer_ledger (customer_id, kind, amount, balance_after, sale_id, payment_id, method, description, user_id, user_name)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [customerId, entry.kind, delta, after, entry.saleId ?? null, entry.paymentId ?? null, entry.method ?? "",
    entry.description.slice(0, 300), Number(entry.actor.id) || null, entry.actor.name])
  return after
}

/** Carga una venta a la cuenta del cliente. Debe tener crédito habilitado y no superar el límite. Usar dentro de una transacción. */
export async function chargeCredit(client: PoolClient, customerId: number, amount: number, saleId: number, actor: Actor) {
  const customer = await lockCustomer(client, customerId)
  if (!customer.enabled) throw new CreditError(`${customer.name || "El cliente"} no tiene crédito habilitado.`)
  if (customer.limit != null && customer.balance + amount > customer.limit) {
    throw new CreditError(`Supera el límite de crédito de ${customer.name}: saldo ${money(customer.balance)}, límite ${money(customer.limit)}.`, 409)
  }
  const balance = await move(client, customerId, amount, customer.balance, { kind: "charge", saleId, method: "credit", description: `Venta #${saleId}`, actor })
  return { balance, customer: customer.name }
}

/** Abono del cliente a su cuenta: entra en la caja abierta con el medio elegido. */
export async function recordAccountPayment(client: PoolClient, customerId: number, input: { method: unknown; amount: unknown; reference?: string; note?: string }, actor: Actor) {
  const amount = Number(input.amount)
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new CreditError("Indicá un monto válido.")
  const method = await findPaymentMethod(client, input.method)
  if (!method || method.kind === "credit") throw new CreditError("Elegí cómo paga (efectivo, transferencia, tarjeta…).")
  const customer = await lockCustomer(client, customerId)
  if (customer.balance <= 0) throw new CreditError("El cliente no tiene saldo pendiente.", 409)
  if (amount > customer.balance) throw new CreditError(`El abono supera el saldo pendiente (${money(customer.balance)}).`)
  const sessionId = await openSessionId(client)
  const payment = await client.query(`INSERT INTO payments (session_id, method, method_name, kind, amount, status, reference, created_by, created_by_name, customer_id, purpose)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'account') RETURNING id, status`, [sessionId, method.code, method.name, method.kind, amount,
    method.needsVerification ? "pending" : "confirmed", (input.reference ?? "").slice(0, 80), Number(actor.id), actor.name, customerId])
  const paymentId = Number(payment.rows[0].id)
  const balance = await move(client, customerId, -amount, customer.balance, { kind: "payment", paymentId, method: method.code,
    description: `Abono en ${method.name}${input.note ? ` · ${input.note.slice(0, 120)}` : ""}`, actor })
  return { paymentId, balance, status: String(payment.rows[0].status), sessionId, methodName: method.name, customer: customer.name }
}

/** Si caja rechaza la transferencia de un abono, la deuda vuelve a la cuenta. */
export async function revertAccountPayment(client: PoolClient, payment: { id: number; customerId: number; amount: number; methodName: string }, note: string, actor: Actor) {
  const customer = await lockCustomer(client, payment.customerId)
  return { balance: await move(client, payment.customerId, payment.amount, customer.balance, { kind: "adjustment", paymentId: payment.id,
    description: `Pago rechazado (${payment.methodName})${note ? ` · ${note}` : ""}`, actor }) }
}

/** Ajuste manual (descuento, corrección o saldo inicial). Con signo: positivo suma deuda, negativo la reduce. */
export async function adjustAccount(client: PoolClient, customerId: number, amount: unknown, note: string, actor: Actor) {
  const delta = Number(amount)
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 10_000_000_000) throw new CreditError("Monto de ajuste inválido.")
  if (!note.trim()) throw new CreditError("Indicá el motivo del ajuste.")
  const customer = await lockCustomer(client, customerId)
  if (customer.balance + delta < 0) throw new CreditError("El ajuste dejaría el saldo en negativo.")
  return { balance: await move(client, customerId, delta, customer.balance, { kind: "adjustment", description: note, actor }) }
}

export async function accountSummary(db: Queryable, customerId: number) {
  const customer = (await db.query("SELECT * FROM customers WHERE id = $1", [customerId])).rows[0]
  if (!customer) throw new CreditError("Cliente no encontrado.", 404)
  const cycle = (customer.billing_cycle ?? "monthly") as BillingCycle
  const start = cycleStart(cycle)
  const [ledger, period] = await Promise.all([
    db.query("SELECT * FROM customer_ledger WHERE customer_id = $1 ORDER BY created_at DESC, id DESC LIMIT 300", [customerId]),
    start ? db.query(`SELECT COALESCE(SUM(amount) FILTER (WHERE kind = 'charge'), 0) AS charges, COALESCE(-SUM(amount) FILTER (WHERE kind = 'payment'), 0) AS payments,
        COUNT(*) FILTER (WHERE kind = 'charge') AS visits
      FROM customer_ledger WHERE customer_id = $1 AND created_at >= ($2::date)::timestamp AT TIME ZONE 'America/Asuncion'`, [customerId, start]) : null,
  ])
  const p = period?.rows[0]
  return {
    balance: Number(customer.balance), creditEnabled: Boolean(customer.credit_enabled), creditLimit: customer.credit_limit == null ? null : Number(customer.credit_limit),
    billingCycle: cycle, cycleLabel: cycleLabel[cycle], cycleStart: start,
    period: p ? { charges: Number(p.charges), payments: Number(p.payments), visits: Number(p.visits) } : null,
    ledger: ledger.rows.map((row) => ({ id: Number(row.id), kind: row.kind, amount: Number(row.amount), balanceAfter: Number(row.balance_after),
      saleId: row.sale_id == null ? null : Number(row.sale_id), method: row.method, description: row.description, userName: row.user_name,
      createdAt: new Date(row.created_at).toISOString() })),
  }
}
