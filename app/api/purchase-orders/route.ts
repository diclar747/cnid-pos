import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"

const selectOrders = `SELECT po.id, po.product_id AS "productId", po.supplier_id AS "supplierId",
  po.quantity, po.unit_cost AS "unitCost", po.status, po.notes, po.created_at AS "createdAt",
  po.received_at AS "receivedAt", p.data->>'name' AS "productName", s.data->>'name' AS "supplierName"
  FROM purchase_orders po JOIN products p ON p.id = po.product_id
  JOIN suppliers s ON s.id = po.supplier_id`

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_purchases")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const result = await db.query(`${selectOrders} ORDER BY po.created_at DESC, po.id DESC`)
  return NextResponse.json({ items: result.rows.map((row) => ({ ...row, id: Number(row.id), productId: Number(row.productId), supplierId: Number(row.supplierId), unitCost: Number(row.unitCost) })) })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_purchases")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const body = await request.json().catch(() => null)
  const productId = Number(body?.productId)
  const supplierId = Number(body?.supplierId)
  const quantity = Number(body?.quantity)
  const unitCost = Number(body?.unitCost)
  if (![productId, supplierId, quantity].every((n) => Number.isSafeInteger(n) && n > 0) || !Number.isSafeInteger(unitCost) || unitCost < 0 || !Number.isSafeInteger(quantity * unitCost)) {
    return NextResponse.json({ error: "Completá proveedor, producto, cantidad y costo válidos." }, { status: 400 })
  }
  const references = await db.query(`SELECT
    EXISTS(SELECT 1 FROM products WHERE id = $1) AS product,
    EXISTS(SELECT 1 FROM suppliers WHERE id = $2 AND data->>'isActive' <> 'false') AS supplier`, [productId, supplierId])
  if (!references.rows[0].product || !references.rows[0].supplier) {
    return NextResponse.json({ error: "Producto o proveedor no encontrado o inactivo." }, { status: 400 })
  }
  try {
    const result = await db.query(`INSERT INTO purchase_orders (product_id, supplier_id, quantity, unit_cost, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [productId, supplierId, quantity, unitCost, typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "", Number(user.id)])
    const order = await db.query(`${selectOrders} WHERE po.id = $1`, [result.rows[0].id])
    const row = order.rows[0]
    return NextResponse.json({ item: { ...row, id: Number(row.id), productId, supplierId, unitCost } }, { status: 201 })
  } catch (error) {
    console.error("Order creation failed", error)
    return NextResponse.json({ error: "No se pudo crear la orden." }, { status: 500 })
  }
}
