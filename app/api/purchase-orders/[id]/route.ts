import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_purchases")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  const body = await request.json().catch(() => null)
  if (!Number.isSafeInteger(id) || id <= 0 || !["received", "cancelled"].includes(body?.status)) {
    return NextResponse.json({ error: "Orden o acción inválida." }, { status: 400 })
  }
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const found = await client.query(`SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE`, [id])
    const order = found.rows[0]
    if (!order) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 }) }
    if (order.status !== "pending") { await client.query("ROLLBACK"); return NextResponse.json({ error: "La orden ya fue procesada." }, { status: 409 }) }
    if (body.status === "cancelled") {
      await client.query(`UPDATE purchase_orders SET status = 'cancelled' WHERE id = $1`, [id])
      await client.query("COMMIT")
      return NextResponse.json({ status: "cancelled" })
    }
    const result = await client.query(`SELECT data FROM products WHERE id = $1 FOR UPDATE`, [order.product_id])
    const product = result.rows[0]?.data
    const supplier = await client.query(`SELECT data FROM suppliers WHERE id = $1`, [order.supplier_id])
    if (!product || !supplier.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Producto o proveedor no disponible." }, { status: 409 }) }
    const stock = Number(product.stock) + Number(order.quantity)
    const total = Number(order.unit_cost) * Number(order.quantity)
    if (!Number.isSafeInteger(stock) || !Number.isSafeInteger(total)) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Cantidad fuera de rango." }, { status: 400 }) }
    await client.query(`UPDATE products SET data = jsonb_set(data, '{stock}', to_jsonb($1::integer)), updated_at = NOW() WHERE id = $2`, [stock, order.product_id])
    const purchase = {
      orderId: id, productId: Number(order.product_id), productName: product.name,
      quantity: Number(order.quantity), unitPrice: Number(order.unit_cost), total,
      supplier: supplier.rows[0].data.name, supplierId: Number(order.supplier_id),
      date: new Date().toISOString(), notes: order.notes, createdBy: user.name,
    }
    const saved = await client.query(`INSERT INTO purchases (data) VALUES ($1::jsonb) RETURNING id`, [JSON.stringify(purchase)])
    await client.query(`INSERT INTO stock_movements (product_id, previous_stock, new_stock, reason, user_id)
      VALUES ($1, $2, $3, 'purchase_order', $4)`, [order.product_id, product.stock, stock, Number(user.id)])
    await client.query(`UPDATE purchase_orders SET status = 'received', received_at = NOW() WHERE id = $1`, [id])
    await client.query("COMMIT")
    return NextResponse.json({ status: "received", stock, purchase: { ...purchase, id: Number(saved.rows[0].id) } })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Order reception failed", error)
    return NextResponse.json({ error: "No se pudo recibir la orden." }, { status: 500 })
  } finally { client.release() }
}
