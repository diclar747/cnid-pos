import { randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { cleanText } from "@/lib/service-order-server"
import type { OrderCard } from "@/lib/service-order-types"

export const runtime = "nodejs"

const mapCard = (row: any): OrderCard => ({
  id: Number(row.id), code: row.code, label: row.label,
  isActive: row.is_active, openOrderId: row.open_order_id == null ? null : Number(row.open_order_id),
  createdAt: new Date(row.created_at).toISOString(),
})

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const result = await db.query(`SELECT c.*, o.id AS open_order_id FROM order_cards c
    LEFT JOIN service_orders o ON o.card_id = c.id AND o.status = 'open'
    ORDER BY c.id DESC LIMIT 500`)
  return NextResponse.json({ items: result.rows.map(mapCard) })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos") || !hasPermission(user, "manage_sales")) {
    return NextResponse.json({ error: "Sin permiso para crear tarjetas." }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  const count = Number(body?.count ?? 1)
  if (!Number.isSafeInteger(count) || count < 1 || count > 30) {
    return NextResponse.json({ error: "Creá entre 1 y 30 tarjetas por vez." }, { status: 400 })
  }
  const prefix = cleanText(body?.label, 50)
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    let sequence = 0
    if (prefix && count > 1) {
      const existing = await client.query("SELECT label FROM order_cards")
      const labelPattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (\\d+)$`)
      sequence = existing.rows.reduce((max: number, row: { label: string }) => {
        const found = row.label.match(labelPattern)
        return found ? Math.max(max, Number(found[1])) : max
      }, 0)
    }
    const cards: OrderCard[] = []
    for (let index = 0; index < count; index++) {
      const code = `CNID-CARD-${randomBytes(12).toString("hex").toUpperCase()}`
      const label = prefix ? count === 1 ? prefix : `${prefix} ${sequence + index + 1}` : ""
      const result = await client.query(`INSERT INTO order_cards (code, label) VALUES ($1, $2) RETURNING *, NULL::bigint AS open_order_id`, [code, label])
      await client.query(`INSERT INTO public.card_directory (code, restaurant_id) VALUES ($1, $2)`, [code, user.restaurantId])
      cards.push(mapCard(result.rows[0]))
    }
    await client.query("COMMIT")
    return NextResponse.json({ items: cards }, { status: 201 })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Could not create order cards", error)
    return NextResponse.json({ error: "No se pudieron crear las tarjetas." }, { status: 500 })
  } finally { client.release() }
}
