import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { cashSummary, movementRow, paymentRow, sessionRow } from "@/lib/cash"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

// Reporte de una caja (abierta o cerrada) para revisar o imprimir el arqueo.
export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_sales") && !hasPermission(user, "view_reports")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Caja inválida." }, { status: 400 })
  const row = (await db.query("SELECT * FROM cash_sessions WHERE id = $1", [id])).rows[0]
  if (!row) return NextResponse.json({ error: "Caja no encontrada." }, { status: 404 })
  const [summary, movements, payments] = await Promise.all([
    row.status === "closed" && row.summary ? row.summary : cashSummary(db, id),
    db.query("SELECT * FROM cash_movements WHERE session_id = $1 ORDER BY created_at", [id]),
    db.query(`SELECT p.*, COALESCE(s.data->>'customerName', c.name) AS customer_name FROM payments p LEFT JOIN sales s ON s.id = p.sale_id LEFT JOIN customers c ON c.id = p.customer_id
      WHERE p.session_id = $1 ORDER BY p.created_at`, [id]),
  ])
  return NextResponse.json({ session: sessionRow(row), summary, movements: movements.rows.map(movementRow), payments: payments.rows.map(paymentRow) })
}
