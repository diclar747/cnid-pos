import { NextRequest, NextResponse } from "next/server"
import { canTakeOrders, getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { mapCustomer, recordError, validateCustomer } from "@/lib/customer-records"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

// Un cliente con sus últimas compras y sus cuentas abiertas.
export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Cliente inválido." }, { status: 400 })
  const found = await db.query("SELECT * FROM customers WHERE id = $1", [id])
  if (!found.rows[0]) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 })
  const sales = await db.query(`SELECT id, data->>'date' AS date, (data->>'total')::numeric AS total,
      data->>'paymentMethod' AS payment_method, data->>'orderType' AS order_type,
      jsonb_array_length(COALESCE(data->'items', '[]'::jsonb)) AS item_count
    FROM sales WHERE data->>'customerId' = $1::text ORDER BY id DESC LIMIT 50`, [id])
  const open = await db.query(`SELECT id, order_type, total, delivery_fee, created_at FROM service_orders
    WHERE customer_id = $1 AND status = 'open' ORDER BY id DESC`, [id])
  return NextResponse.json({
    item: mapCustomer(found.rows[0]),
    sales: sales.rows.map((row) => ({ id: Number(row.id), date: row.date, total: Number(row.total),
      paymentMethod: row.payment_method, orderType: row.order_type, itemCount: Number(row.item_count) })),
    openOrders: open.rows.map((row) => ({ id: Number(row.id), orderType: row.order_type,
      total: Number(row.total) + Number(row.delivery_fee), createdAt: new Date(row.created_at).toISOString() })),
  })
}

export async function PUT(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!canTakeOrders(user)) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Cliente inválido." }, { status: 400 })
  try {
    const c = validateCustomer(await request.json().catch(() => null))
    const result = await db.query(`UPDATE customers SET name=$1, phone=$2, ruc=$3, email=$4, address=$5, notes=$6, updated_at=NOW()
      WHERE id=$7 RETURNING *`, [c.name, c.phone, c.ruc, c.email, c.address, c.notes, id])
    if (!result.rows[0]) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 })
    return NextResponse.json({ item: mapCustomer(result.rows[0]) })
  } catch (error) {
    const { message, status } = recordError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
