import "server-only"

import type { QueryResult, QueryResultRow } from "pg"

// Caja y pagos: medios configurables, sesión de caja abierta, pagos de ventas y arqueo.

type Queryable = { query: <T extends QueryResultRow = any>(sql: string, values?: unknown[]) => Promise<QueryResult<T>> }

export class CashError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}

export type PaymentKind = "cash" | "card" | "transfer" | "qr" | "other" | "credit"
export interface PaymentMethod { code: string; name: string; kind: PaymentKind; needsVerification: boolean; isActive: boolean; sortOrder: number }

const methodRow = (row: any): PaymentMethod => ({ code: row.code, name: row.name, kind: row.kind, needsVerification: row.needs_verification,
  isActive: row.is_active, sortOrder: Number(row.sort_order) })

export async function listPaymentMethods(db: Queryable, onlyActive = false): Promise<PaymentMethod[]> {
  const result = await db.query(`SELECT * FROM payment_methods ${onlyActive ? "WHERE is_active" : ""} ORDER BY sort_order, name`)
  return result.rows.map(methodRow)
}

export async function findPaymentMethod(db: Queryable, code: unknown): Promise<PaymentMethod | null> {
  if (typeof code !== "string" || !/^[a-z0-9_]{2,30}$/.test(code)) return null
  const result = await db.query("SELECT * FROM payment_methods WHERE code = $1 AND is_active", [code])
  return result.rows[0] ? methodRow(result.rows[0]) : null
}

export async function openSessionId(db: Queryable, lock = false): Promise<number | null> {
  const result = await db.query(`SELECT id FROM cash_sessions WHERE status = 'open' ${lock ? "FOR UPDATE" : ""}`)
  return result.rows[0] ? Number(result.rows[0].id) : null
}

/** Registra el pago de una venta y lo asocia a la caja abierta. Transferencias y QR quedan pendientes de verificar. */
export async function recordSalePayment(db: Queryable, input: { saleId: number; orderId: number | null; method: PaymentMethod; amount: number
  reference: string; user: { id: string | number; name: string }; customerId?: number | null }) {
  const sessionId = await openSessionId(db)
  const status = input.method.needsVerification ? "pending" : "confirmed"
  const result = await db.query(`INSERT INTO payments (sale_id, order_id, session_id, method, method_name, kind, amount, status, reference, created_by, created_by_name, customer_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [input.saleId, input.orderId, sessionId, input.method.code, input.method.name, input.method.kind, input.amount, status, input.reference,
      Number(input.user.id), input.user.name, input.customerId ?? null])
  return { paymentId: Number(result.rows[0].id), sessionId, status }
}

export interface CashSummary {
  openingAmount: number
  byMethod: { method: string; name: string; kind: string; confirmed: number; pending: number; rejected: number; count: number }[]
  salesTotal: number
  salesCount: number
  incomes: number
  expenses: number
  cashIncomes: number
  cashExpenses: number
  cashSales: number
  /** Ventas cargadas a cuenta corriente (no entra dinero en la caja). */
  creditSales: number
  /** Abonos de clientes a su cuenta corriente, por medio, y el efectivo recibido por abonos. */
  accountPayments: { method: string; name: string; confirmed: number; pending: number; count: number }[]
  accountTotal: number
  cashAccountPayments: number
  expectedCash: number
  pendingCount: number
}

export async function cashSummary(db: Queryable, sessionId: number): Promise<CashSummary> {
  const session = (await db.query("SELECT opening_amount FROM cash_sessions WHERE id = $1", [sessionId])).rows[0]
  if (!session) throw new CashError("Caja no encontrada.", 404)
  const payments = await db.query(`SELECT method, MAX(method_name) AS name, MAX(kind) AS kind,
      COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) AS confirmed,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending,
      COALESCE(SUM(amount) FILTER (WHERE status = 'rejected'), 0) AS rejected,
      COUNT(*) AS count
    FROM payments WHERE session_id = $1 AND purpose = 'sale' GROUP BY method ORDER BY method`, [sessionId])
  const account = await db.query(`SELECT method, MAX(method_name) AS name, COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) AS confirmed,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending, COUNT(*) AS count
    FROM payments WHERE session_id = $1 AND purpose = 'account' GROUP BY method ORDER BY method`, [sessionId])
  const movements = await db.query(`SELECT kind, method, COALESCE(SUM(amount), 0) AS total FROM cash_movements WHERE session_id = $1 GROUP BY kind, method`, [sessionId])
  const cashCodes = new Set((await db.query("SELECT code FROM payment_methods WHERE kind = 'cash'")).rows.map((row) => row.code))
  cashCodes.add("cash")
  const byMethod = payments.rows.map((row) => ({ method: row.method, name: row.name || row.method, kind: row.kind, confirmed: Number(row.confirmed),
    pending: Number(row.pending), rejected: Number(row.rejected), count: Number(row.count) }))
  const sum = (kind: string, onlyCash: boolean) => movements.rows.filter((row) => row.kind === kind && (!onlyCash || cashCodes.has(row.method)))
    .reduce((total, row) => total + Number(row.total), 0)
  const cashSales = byMethod.filter((row) => cashCodes.has(row.method)).reduce((total, row) => total + row.confirmed, 0)
  const openingAmount = Number(session.opening_amount)
  const cashIncomes = sum("income", true), cashExpenses = sum("expense", true)
  const accountPayments = account.rows.map((row) => ({ method: row.method, name: row.name || row.method, confirmed: Number(row.confirmed), pending: Number(row.pending), count: Number(row.count) }))
  const cashAccountPayments = accountPayments.filter((row) => cashCodes.has(row.method)).reduce((total, row) => total + row.confirmed, 0)
  return {
    openingAmount, byMethod,
    salesTotal: byMethod.reduce((total, row) => total + row.confirmed + row.pending, 0),
    salesCount: byMethod.reduce((total, row) => total + row.count, 0),
    incomes: sum("income", false), expenses: sum("expense", false), cashIncomes, cashExpenses, cashSales,
    creditSales: byMethod.filter((row) => row.kind === "credit").reduce((total, row) => total + row.confirmed, 0),
    accountPayments, accountTotal: accountPayments.reduce((total, row) => total + row.confirmed + row.pending, 0), cashAccountPayments,
    expectedCash: openingAmount + cashSales + cashAccountPayments + cashIncomes - cashExpenses,
    pendingCount: (await db.query("SELECT COUNT(*) AS n FROM payments WHERE session_id = $1 AND status = 'pending'", [sessionId])).rows[0].n * 1,
  }
}

export const sessionRow = (row: any) => ({
  id: Number(row.id), status: row.status, openingAmount: Number(row.opening_amount), openedBy: row.opened_by_name, openedAt: new Date(row.opened_at).toISOString(),
  closedBy: row.closed_by_name, closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
  expectedCash: row.expected_cash == null ? null : Number(row.expected_cash), countedCash: row.counted_cash == null ? null : Number(row.counted_cash),
  difference: row.difference == null ? null : Number(row.difference), notes: row.notes, summary: row.summary ?? null,
})

export const paymentRow = (row: any) => ({
  id: Number(row.id), saleId: row.sale_id == null ? null : Number(row.sale_id), orderId: row.order_id == null ? null : Number(row.order_id),
  sessionId: row.session_id == null ? null : Number(row.session_id), method: row.method, methodName: row.method_name, kind: row.kind,
  amount: Number(row.amount), status: row.status, reference: row.reference, createdBy: row.created_by_name, verifiedBy: row.verified_by_name,
  verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null, verifyNote: row.verify_note, createdAt: new Date(row.created_at).toISOString(),
  customerName: row.customer_name ?? "", purpose: row.purpose ?? "sale",
})

export const movementRow = (row: any) => ({
  id: Number(row.id), kind: row.kind, method: row.method, amount: Number(row.amount), description: row.description, userName: row.user_name,
  createdAt: new Date(row.created_at).toISOString(),
})

export const parseAmount = (value: unknown, { allowZero = false } = {}) => {
  const amount = Number(value)
  return Number.isSafeInteger(amount) && (allowZero ? amount >= 0 : amount > 0) && amount <= 10_000_000_000 ? amount : null
}
