import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_purchases")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })

  const body = await request.json().catch(() => null)
  const productId = Number(body?.productId)
  const quantity = Number(body?.quantity)
  const unitPrice = Number(body?.unitPrice)
  if (!Number.isSafeInteger(productId) || productId <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0 ||
      !Number.isSafeInteger(unitPrice) || unitPrice < 0) {
    return NextResponse.json({ error: "Producto, cantidad o precio inválido." }, { status: 400 })
  }

  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const result = await client.query(`SELECT data FROM products WHERE id = $1 FOR UPDATE`, [productId])
    const product = result.rows[0]?.data
    if (!product) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 })
    }
    const newStock = Number(product.stock) + quantity
    const total = unitPrice * quantity
    if (!Number.isSafeInteger(newStock) || !Number.isSafeInteger(total)) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "La cantidad excede el límite permitido." }, { status: 400 })
    }

    await client.query(
      `UPDATE products SET data = jsonb_set(data, '{stock}', to_jsonb($1::integer)), updated_at = NOW() WHERE id = $2`,
      [newStock, productId],
    )
    const purchase = {
      productId,
      productName: product.name,
      quantity,
      unitPrice,
      total,
      supplier: typeof body.supplier === "string" ? body.supplier.trim().slice(0, 255) : "",
      date: new Date().toISOString(),
      notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : "",
      createdBy: user.name,
    }
    const saved = await client.query(`INSERT INTO purchases (data) VALUES ($1::jsonb) RETURNING id`, [JSON.stringify(purchase)])
    await client.query(
      `INSERT INTO stock_movements (product_id, previous_stock, new_stock, reason, user_id)
       VALUES ($1, $2, $3, 'purchase', $4)`,
      [productId, product.stock, newStock, Number(user.id)],
    )
    await client.query("COMMIT")
    return NextResponse.json({ purchase: { ...purchase, id: Number(saved.rows[0].id) }, stock: newStock }, { status: 201 })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Purchase failed", error)
    return NextResponse.json({ error: "No se pudo registrar la compra." }, { status: 500 })
  } finally {
    client.release()
  }
}
