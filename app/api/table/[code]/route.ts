import { NextRequest, NextResponse } from "next/server"
import { authDb } from "@/lib/db"
import { cleanText, loadOrder, makeOrderLines, saveOrderItems, sendDraftToKitchen, ServiceOrderError } from "@/lib/service-order-server"

export const runtime = "nodejs"
type Context = { params: Promise<{ code: string }> }
const codePattern = /^CNID-TABLE-[A-F0-9]{24}$/

async function locate(code: string) {
  if (!codePattern.test(code)) return null
  const result = await authDb.query(`SELECT r.id, r.name, r.schema_name FROM public.table_directory d
    JOIN public.restaurants r ON r.id=d.restaurant_id WHERE d.code=$1 AND r.status='active'`, [code])
  const place = result.rows[0]
  return place && /^(public|restaurant_[0-9]+)$/.test(place.schema_name) ? place : null
}

export async function GET(_request: NextRequest, { params }: Context) {
  const code = (await params).code.toUpperCase()
  const place = await locate(code)
  if (!place) return NextResponse.json({ error: "Mesa no disponible." }, { status: 404 })
  const client = await authDb.connect()
  try {
    await client.query("BEGIN")
    await client.query(`SET LOCAL search_path TO "${place.schema_name}"`)
    const table = (await client.query(`SELECT t.id, t.label, t.seats, r.name AS room_name, r.image_data,
      o.id AS order_id FROM dining_tables t JOIN dining_rooms r ON r.id=t.room_id
      LEFT JOIN service_orders o ON o.table_id=t.id AND o.status='open'
      WHERE t.code=$1 AND t.is_active AND r.is_active`, [code])).rows[0]
    if (!table) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Mesa inactiva." }, { status: 404 }) }
    const rows = await client.query("SELECT id, data FROM products WHERE data->>'isActive' IS DISTINCT FROM 'false' ORDER BY id")
    const products = rows.rows.map((row) => ({ ...row.data, id: Number(row.id) })).filter((p) => p.trackStock === false || Number(p.stock) > 0)
      .map((p) => ({ id: p.id, name: p.name, description: p.description, category: p.category, menuName: p.menuName,
        image: p.image, price: p.pricesByOrderType?.dineIn ?? p.price, stock: p.stock, trackStock: p.trackStock,
        modifierGroups: p.modifierGroups ?? [] }))
    const order = table.order_id ? await loadOrder(client, Number(table.order_id)) : null
    await client.query("COMMIT")
    return NextResponse.json({ restaurant: place.name, table: { id: Number(table.id), label: table.label,
      seats: Number(table.seats), roomName: table.room_name, imageData: table.image_data }, products,
      order: order ? { id: order.id, total: order.total, items: order.items.map((line) => ({ lineId: line.lineId,
        productName: line.productName, quantity: line.quantity, subtotal: line.subtotal, modifiers: line.modifiers })) } : null })
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error }
  finally { client.release() }
}

export async function POST(request: NextRequest, { params }: Context) {
  const code = (await params).code.toUpperCase()
  const place = await locate(code)
  if (!place) return NextResponse.json({ error: "Mesa no disponible." }, { status: 404 })
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.items) || !body.items.length || body.items.length > 30 || JSON.stringify(body).length > 12000)
    return NextResponse.json({ error: "Elegí entre 1 y 30 productos." }, { status: 400 })
  const client = await authDb.connect()
  try {
    await client.query("BEGIN")
    await client.query(`SET LOCAL search_path TO "${place.schema_name}"`)
    const table = (await client.query(`SELECT t.id, t.label, r.name AS room_name FROM dining_tables t
      JOIN dining_rooms r ON r.id=t.room_id WHERE t.code=$1 AND t.is_active AND r.is_active FOR UPDATE OF t`, [code])).rows[0]
    if (!table) throw new ServiceOrderError("Mesa inactiva.", 404)
    const requestId = typeof body.requestId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId) ? body.requestId : null
    if (requestId) {
      const reserved = await client.query(`INSERT INTO guest_order_requests (request_id, table_id) VALUES ($1,$2)
        ON CONFLICT (request_id) DO NOTHING RETURNING request_id`, [requestId, table.id])
      if (!reserved.rows[0]) {
        const previous = (await client.query("SELECT table_id, order_id, ticket_id FROM guest_order_requests WHERE request_id=$1", [requestId])).rows[0]
        if (Number(previous?.table_id) !== Number(table.id)) throw new ServiceOrderError("Pedido repetido en otra mesa.", 409)
        await client.query("COMMIT")
        return NextResponse.json({ orderId: Number(previous.order_id), ticketId: Number(previous.ticket_id), repeated: true })
      }
    }
    const existing = await client.query("SELECT id FROM service_orders WHERE table_id=$1 AND status='open' FOR UPDATE", [table.id])
    let order
    if (existing.rows[0]) order = await loadOrder(client, Number(existing.rows[0].id), true)
    else {
      const inserted = await client.query(`INSERT INTO service_orders (table_id, table_label, order_type, customer_name, notes)
        VALUES ($1,$2,'dineIn',$3,$4) RETURNING id`, [table.id, `${table.room_name} · ${table.label}`,
        cleanText(body.customerName, 120), cleanText(body.notes, 300)])
      order = await loadOrder(client, Number(inserted.rows[0].id), true)
    }
    if (existing.rows[0]) {
      const guestName = cleanText(body.customerName, 120)
      const guestNotes = cleanText(body.notes, 300)
      await client.query(`UPDATE service_orders SET customer_name=CASE WHEN customer_name='' THEN $1 ELSE customer_name END,
        notes=$2, updated_at=NOW() WHERE id=$3`, [guestName, guestNotes, order.id])
      order = await loadOrder(client, order.id, true)
    }
    const lines = await makeOrderLines(client, body.items, "dineIn")
    order = await saveOrderItems(client, order, lines)
    const sent = await sendDraftToKitchen(client, order, null)
    if (requestId) await client.query("UPDATE guest_order_requests SET order_id=$1, ticket_id=$2 WHERE request_id=$3",
      [sent.order.id, sent.ticket.id, requestId])
    await client.query("COMMIT")
    return NextResponse.json({ orderId: sent.order.id, ticketId: sent.ticket.id, total: sent.order.total }, { status: 201 })
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    if (error instanceof ServiceOrderError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Guest table order failed", error)
    return NextResponse.json({ error: "No se pudo enviar el pedido." }, { status: 500 })
  } finally { client.release() }
}
