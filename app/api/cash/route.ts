import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { CashError, cashSummary, findPaymentMethod, listPaymentMethods, movementRow, openSessionId, parseAmount, paymentRow, sessionRow } from "@/lib/cash"
import { cleanText } from "@/lib/service-order-server"

export const runtime = "nodejs"

async function authorize(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return { error: NextResponse.json({ error: "Iniciá sesión." }, { status: 401 }) }
  if (!hasPermission(user, "manage_sales")) return { error: NextResponse.json({ error: "Solo caja puede operar la caja." }, { status: 403 }) }
  return { user }
}

// Estado de la caja: sesión abierta con su resumen, pagos por verificar e historial de cierres.
export async function GET(request: NextRequest) {
  const { user, error } = await authorize(request)
  if (!user) return error
  const sessionId = await openSessionId(db)
  const session = sessionId ? sessionRow((await db.query("SELECT * FROM cash_sessions WHERE id = $1", [sessionId])).rows[0]) : null
  const [summary, movements, payments, pending, history, methods, unassigned] = await Promise.all([
    sessionId ? cashSummary(db, sessionId) : null,
    sessionId ? db.query("SELECT * FROM cash_movements WHERE session_id = $1 ORDER BY created_at DESC LIMIT 200", [sessionId]) : null,
    sessionId ? db.query(`SELECT p.*, s.data->>'customerName' AS customer_name FROM payments p LEFT JOIN sales s ON s.id = p.sale_id
      WHERE p.session_id = $1 ORDER BY p.created_at DESC LIMIT 200`, [sessionId]) : null,
    db.query(`SELECT p.*, s.data->>'customerName' AS customer_name FROM payments p LEFT JOIN sales s ON s.id = p.sale_id
      WHERE p.status = 'pending' ORDER BY p.created_at LIMIT 200`),
    db.query("SELECT * FROM cash_sessions WHERE status = 'closed' ORDER BY closed_at DESC LIMIT 30"),
    listPaymentMethods(db),
    db.query("SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS total FROM payments WHERE session_id IS NULL AND created_at > NOW() - INTERVAL '1 day'"),
  ])
  return NextResponse.json({
    session, summary, methods,
    movements: movements?.rows.map(movementRow) ?? [],
    payments: payments?.rows.map(paymentRow) ?? [],
    pending: pending.rows.map(paymentRow),
    history: history.rows.map(sessionRow),
    withoutSession: { count: Number(unassigned.rows[0].n), total: Number(unassigned.rows[0].total) },
  })
}

// Abrir caja, registrar ingresos o egresos y cerrar con arqueo.
export async function POST(request: NextRequest) {
  const { user, error } = await authorize(request)
  if (!user) return error
  const body = await request.json().catch(() => null)
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    if (body?.action === "open") {
      const amount = parseAmount(body.amount, { allowZero: true })
      if (amount === null) throw new CashError("Indicá el monto inicial de la caja.")
      if (await openSessionId(client, true)) throw new CashError("Ya hay una caja abierta.", 409)
      const created = await client.query(`INSERT INTO cash_sessions (opening_amount, opened_by, opened_by_name, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
        [amount, Number(user.id), user.name, cleanText(body.notes, 300)])
      await client.query("COMMIT")
      return NextResponse.json({ session: sessionRow(created.rows[0]) }, { status: 201 })
    }
    const sessionId = await openSessionId(client, true)
    if (!sessionId) throw new CashError("No hay una caja abierta.", 409)
    if (body?.action === "movement") {
      if (body.kind !== "income" && body.kind !== "expense") throw new CashError("Tipo de movimiento inválido.")
      const amount = parseAmount(body.amount)
      if (amount === null) throw new CashError("Monto inválido.")
      const method = await findPaymentMethod(client, body.method ?? "cash")
      if (!method) throw new CashError("Medio de pago inválido.")
      const description = cleanText(body.description, 200)
      if (!description) throw new CashError("Escribí el motivo del movimiento.")
      if (body.kind === "expense" && method.kind === "cash") {
        const summary = await cashSummary(client, sessionId)
        if (amount > summary.expectedCash) throw new CashError("No hay suficiente efectivo en caja para ese egreso.")
      }
      const created = await client.query(`INSERT INTO cash_movements (session_id, kind, method, amount, description, user_id, user_name)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [sessionId, body.kind, method.code, amount, description, Number(user.id), user.name])
      await client.query("COMMIT")
      return NextResponse.json({ movement: movementRow(created.rows[0]) }, { status: 201 })
    }
    if (body?.action === "close") {
      const counted = parseAmount(body.countedCash, { allowZero: true })
      if (counted === null) throw new CashError("Indicá el efectivo contado.")
      const summary = await cashSummary(client, sessionId)
      const closed = await client.query(`UPDATE cash_sessions SET status = 'closed', closed_at = NOW(), closed_by = $2, closed_by_name = $3,
        expected_cash = $4, counted_cash = $5, difference = $6, summary = $7, notes = CASE WHEN $8 = '' THEN notes ELSE $8 END
        WHERE id = $1 RETURNING *`, [sessionId, Number(user.id), user.name, summary.expectedCash, counted, counted - summary.expectedCash,
        JSON.stringify(summary), cleanText(body.notes, 300)])
      await client.query("COMMIT")
      return NextResponse.json({ session: sessionRow(closed.rows[0]) })
    }
    throw new CashError("Acción inválida.")
  } catch (cause) {
    await client.query("ROLLBACK").catch(() => undefined)
    if (cause instanceof CashError) return NextResponse.json({ error: cause.message }, { status: cause.status })
    if ((cause as { code?: string }).code === "23505") return NextResponse.json({ error: "Ya hay una caja abierta." }, { status: 409 })
    console.error("Cash operation failed", cause)
    return NextResponse.json({ error: "No se pudo registrar la operación de caja." }, { status: 500 })
  } finally { client.release() }
}
