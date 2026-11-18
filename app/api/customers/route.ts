import { NextRequest, NextResponse } from "next/server"
import { canTakeOrders, getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { mapCustomer, recordError, validateCustomer } from "@/lib/customer-records"

export const runtime = "nodejs"

// Clientes del restaurante: búsqueda por nombre, teléfono o RUC.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80)
  const limit = Math.min(500, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 100))
  const digits = q.replace(/\D/g, "").replace(/^0/, "")
  const result = q
    ? await db.query(`SELECT * FROM customers WHERE name ILIKE $1 OR ruc ILIKE $1 OR ($2 <> '' AND phone LIKE $2)
        ORDER BY last_order_at DESC NULLS LAST, name LIMIT $3`, [`%${q}%`, digits.length >= 3 ? `%${digits}%` : "", limit])
    : await db.query("SELECT * FROM customers ORDER BY last_order_at DESC NULLS LAST, created_at DESC LIMIT $1", [limit])
  const totals = await db.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE orders_count > 1)::int AS returning FROM customers")
  return NextResponse.json({ items: result.rows.map(mapCustomer), total: totals.rows[0].total, returning: totals.rows[0].returning })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!canTakeOrders(user)) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  try {
    const c = validateCustomer(await request.json().catch(() => null))
    const result = await db.query(`INSERT INTO customers (name, phone, ruc, email, address, notes)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [c.name, c.phone, c.ruc, c.email, c.address, c.notes])
    return NextResponse.json({ item: mapCustomer(result.rows[0]) }, { status: 201 })
  } catch (error) {
    const { message, status } = recordError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
