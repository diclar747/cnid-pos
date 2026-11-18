import { NextRequest, NextResponse } from "next/server"
import { authDb } from "@/lib/db"
import type { OrderLine } from "@/lib/service-order-types"

export const runtime = "nodejs"
type Context = { params: Promise<{ code: string }> }
const pattern = /^CNID-CARD-[A-F0-9]{24}$/

export async function GET(_request: NextRequest, { params }: Context) {
  const code = (await params).code.toUpperCase()
  if (!pattern.test(code)) return NextResponse.json({ error: "Tarjeta inválida." }, { status: 400 })
  const directory = await authDb.query(`SELECT r.schema_name, r.name AS restaurant_name FROM public.card_directory d
    JOIN public.restaurants r ON r.id = d.restaurant_id
    WHERE d.code = $1 AND r.status = 'active'`, [code])
  const schema = directory.rows[0]?.schema_name
  const restaurantName = String(directory.rows[0]?.restaurant_name ?? "")
  if (typeof schema !== "string" || !/^(public|restaurant_[0-9]+)$/.test(schema)) {
    return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 })
  }
  const client = await authDb.connect()
  try {
  await client.query("BEGIN")
  await client.query(`SET LOCAL search_path TO "${schema}"`)
  const result = await client.query(`SELECT c.label, c.is_active, o.id AS order_id, o.order_type,
    o.table_label, o.items, o.total FROM order_cards c
    LEFT JOIN service_orders o ON o.card_id = c.id AND o.status = 'open'
    WHERE c.code = $1`, [code])
  const card = result.rows[0]
  if (!card || !card.is_active) return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 })
  if (!card.order_id) return NextResponse.json({ label: card.label, restaurantName, order: null }, { headers: { "Cache-Control": "no-store" } })
  const tickets = await client.query(`SELECT id, status, created_at FROM kitchen_tickets WHERE order_id = $1 ORDER BY id DESC LIMIT 20`, [card.order_id])
  const lines = Array.isArray(card.items) ? card.items as OrderLine[] : []
  return NextResponse.json({ label: card.label, restaurantName, order: {
    id: Number(card.order_id), orderType: card.order_type, tableLabel: card.table_label,
    total: Number(card.total),
    items: lines.map((line) => ({ name: line.productName, quantity: line.quantity,
      subtotal: line.subtotal, modifiers: line.modifiers.map((modifier) => modifier.name) })),
    tickets: tickets.rows.map((ticket) => ({ id: Number(ticket.id), status: ticket.status })),
  } }, { headers: { "Cache-Control": "no-store" } })
  } finally { await client.query("ROLLBACK").catch(() => undefined); client.release() }
}
