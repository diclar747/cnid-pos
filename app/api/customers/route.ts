import { NextRequest, NextResponse } from "next/server"
import { canTakeOrders, getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { mapCustomer, recordError, validateCredit, validateCustomer } from "@/lib/customer-records"

export const runtime = "nodejs"

// Clientes del restaurante: búsqueda por nombre, teléfono o RUC.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80)
  const withBalance = request.nextUrl.searchParams.get("balance") === "1"
  const limit = Math.min(500, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 100))
  const digits = q.replace(/\D/g, "").replace(/^0/, "")
  const result = withBalance
    ? await db.query("SELECT * FROM customers WHERE balance <> 0 ORDER BY balance DESC LIMIT $1", [limit])
    : q
    ? await db.query(`SELECT * FROM customers WHERE name ILIKE $1 OR ruc ILIKE $1 OR ($2 <> '' AND phone LIKE $2)
        ORDER BY last_order_at DESC NULLS LAST, name LIMIT $3`, [`%${q}%`, digits.length >= 3 ? `%${digits}%` : "", limit])
    : await db.query("SELECT * FROM customers ORDER BY last_order_at DESC NULLS LAST, created_at DESC LIMIT $1", [limit])
  const totals = await db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE orders_count > 1)::int AS returning,
    COUNT(*) FILTER (WHERE balance > 0)::int AS debtors, COALESCE(SUM(balance) FILTER (WHERE balance > 0), 0)::bigint AS receivable FROM customers`)
  return NextResponse.json({ items: result.rows.map(mapCustomer), total: totals.rows[0].total, returning: totals.rows[0].returning,
    debtors: totals.rows[0].debtors, receivable: Number(totals.rows[0].receivable) })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!canTakeOrders(user)) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  try {
    const body = await request.json().catch(() => null)
    const c = validateCustomer(body)
    const credit = hasPermission(user, "manage_sales") ? validateCredit(body) : undefined
    const result = await db.query(`INSERT INTO customers (name, phone, ruc, email, address, notes, credit_enabled, credit_limit, billing_cycle)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [c.name, c.phone, c.ruc, c.email, c.address, c.notes,
      credit?.creditEnabled ?? false, credit?.creditLimit ?? null, credit?.billingCycle ?? "monthly"])
    return NextResponse.json({ item: mapCustomer(result.rows[0]) }, { status: 201 })
  } catch (error) {
    const { message, status } = recordError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
