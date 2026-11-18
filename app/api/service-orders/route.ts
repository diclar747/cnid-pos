import { NextRequest, NextResponse } from "next/server"
import { canTakeOrders, getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { cleanText, deliveryFeeFor, loadOrder, logOrderEvent, makeOrderLines, mapOrder, resolveWaiter, saveOrderItems, sendDraftToKitchen, ServiceOrderError, upsertCustomer, validOrderType } from "@/lib/service-order-server"
import type { ServiceOrder } from "@/lib/service-order-types"

export const runtime = "nodejs"

const cardPattern = /^CNID-CARD-[A-F0-9]{24}$/
const tablePattern = /^CNID-TABLE-[A-F0-9]{24}$/

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const tableCode = request.nextUrl.searchParams.get("table")?.trim().toUpperCase()
  if (tableCode) {
    if (!tablePattern.test(tableCode)) return NextResponse.json({ error: "QR de mesa inválido." }, { status: 400 })
    const found = await db.query(`SELECT t.id, t.label, t.seats, t.is_active, r.name AS room_name,
      o.id AS order_id FROM dining_tables t JOIN dining_rooms r ON r.id=t.room_id
      LEFT JOIN service_orders o ON o.table_id=t.id AND o.status='open' WHERE t.code=$1`, [tableCode])
    const table = found.rows[0]
    if (!table || !table.is_active) return NextResponse.json({ error: "Mesa no encontrada o inactiva." }, { status: 404 })
    if (!table.order_id) return NextResponse.json({ table: { id: Number(table.id), label: table.label, roomName: table.room_name }, order: null })
    const client = await db.connect()
    try { return NextResponse.json({ table: { id: Number(table.id), label: table.label, roomName: table.room_name }, order: await loadOrder(client, Number(table.order_id)) }) }
    finally { client.release() }
  }
  const cardCode = request.nextUrl.searchParams.get("card")?.trim().toUpperCase()
  if (cardCode) {
    if (!cardPattern.test(cardCode)) return NextResponse.json({ error: "Tarjeta QR inválida." }, { status: 400 })
    const result = await db.query(`SELECT c.id, c.code, c.label, c.is_active, o.id AS order_id
      FROM order_cards c LEFT JOIN service_orders o ON o.card_id = c.id AND o.status = 'open'
      WHERE c.code = $1`, [cardCode])
    const card = result.rows[0]
    if (!card || !card.is_active) return NextResponse.json({ error: "Tarjeta no encontrada o inactiva." }, { status: 404 })
    if (!card.order_id) return NextResponse.json({ card: { id: Number(card.id), code: card.code, label: card.label }, order: null })
    const client = await db.connect()
    try {
      const order = await loadOrder(client, Number(card.order_id))
      return NextResponse.json({ card: { id: Number(card.id), code: card.code, label: card.label }, order })
    } finally { client.release() }
  }
  const search = cleanText(request.nextUrl.searchParams.get("q"), 100)
  const values: unknown[] = []
  let where = "WHERE o.status = 'open' OR o.updated_at > NOW() - INTERVAL '2 days'"
  if (search) {
    values.push(`%${search}%`)
    where = `WHERE o.id::text ILIKE $1 OR o.table_label ILIKE $1 OR o.customer_name ILIKE $1 OR c.code ILIKE $1`
  }
  const result = await db.query(`SELECT o.*, c.code AS card_code FROM service_orders o
    LEFT JOIN order_cards c ON c.id = o.card_id ${where}
    ORDER BY CASE WHEN o.status = 'open' THEN 0 ELSE 1 END, o.updated_at DESC LIMIT 200`, values)
  return NextResponse.json({ items: result.rows.map(mapOrder) })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!canTakeOrders(user)) {
    return NextResponse.json({ error: "Sin permiso para registrar órdenes." }, { status: 403 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Orden inválida." }, { status: 400 })
  const orderId = body.orderId == null ? null : Number(body.orderId)
  if (orderId !== null && (!Number.isSafeInteger(orderId) || orderId <= 0)) return NextResponse.json({ error: "Número de orden inválido." }, { status: 400 })
  const cardCode = cleanText(body.cardCode, 40).toUpperCase()
  const tableId = body.tableId == null ? null : Number(body.tableId)
  if (tableId !== null && (!Number.isSafeInteger(tableId) || tableId <= 0)) return NextResponse.json({ error: "Mesa inválida." }, { status: 400 })
  if (cardCode && !cardPattern.test(cardCode)) return NextResponse.json({ error: "Tarjeta QR inválida." }, { status: 400 })
  if (body.orderType != null && !validOrderType(body.orderType)) return NextResponse.json({ error: "Tipo de pedido inválido." }, { status: 400 })
  const rawItems = body.items ?? []
  if (!Array.isArray(rawItems)) return NextResponse.json({ error: "Productos inválidos." }, { status: 400 })
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    let cardId: number | null = null
    if (cardCode) {
      const found = await client.query("SELECT id, is_active FROM order_cards WHERE code = $1 FOR UPDATE", [cardCode])
      if (!found.rows[0] || !found.rows[0].is_active) throw new ServiceOrderError("Tarjeta no encontrada o inactiva.", 404)
      cardId = Number(found.rows[0].id)
    }
    let tableLabel = cleanText(body.tableLabel, 30)
    if (tableId) {
      const found = await client.query(`SELECT t.id, t.label, r.name AS room_name FROM dining_tables t
        JOIN dining_rooms r ON r.id=t.room_id WHERE t.id=$1 AND t.is_active AND r.is_active FOR UPDATE OF t`, [tableId])
      if (!found.rows[0]) throw new ServiceOrderError("Mesa no encontrada o inactiva.", 404)
      tableLabel = `${found.rows[0].room_name} · ${found.rows[0].label}`.slice(0, 80)
    }
    let order: ServiceOrder | null = orderId ? await loadOrder(client, orderId, true) : null
    if (!order && tableId) {
      const existing = await client.query("SELECT id FROM service_orders WHERE table_id=$1 AND status='open' FOR UPDATE", [tableId])
      if (existing.rows[0]) order = await loadOrder(client, Number(existing.rows[0].id), true)
    }
    if (!order && cardId) {
      const existing = await client.query("SELECT id FROM service_orders WHERE card_id = $1 AND status = 'open' FOR UPDATE", [cardId])
      if (existing.rows[0]) order = await loadOrder(client, Number(existing.rows[0].id), true)
    }
    if (order && order.status !== "open") throw new ServiceOrderError("La orden ya fue cerrada.")
    if (order && tableId && order.tableId !== tableId) {
      if (order.tableId) throw new ServiceOrderError("La orden ya está asignada a otra mesa.", 409)
      const occupied = await client.query("SELECT id FROM service_orders WHERE table_id=$1 AND status='open'", [tableId])
      if (occupied.rows[0]) throw new ServiceOrderError("La mesa tiene otra cuenta abierta.", 409)
      await client.query("UPDATE service_orders SET table_id=$1, table_label=$2, updated_at=NOW() WHERE id=$3", [tableId, tableLabel, order.id])
      order = await loadOrder(client, order.id, true)
    }
    if (order && cardId && order.cardId !== cardId) {
      if (order.cardId) throw new ServiceOrderError("La orden ya tiene otra tarjeta asignada.")
      const occupied = await client.query("SELECT id FROM service_orders WHERE card_id = $1 AND status = 'open'", [cardId])
      if (occupied.rows[0]) throw new ServiceOrderError("La tarjeta ya tiene otra orden abierta.")
      await client.query("UPDATE service_orders SET card_id = $1, updated_at = NOW() WHERE id = $2", [cardId, order.id])
      order = await loadOrder(client, order.id, true)
    }
    // Mesero: el indicado en la orden; si no se indica y quien la abre es mesero, queda asignado.
    // Un valor vacío no quita el mesero de una cuenta existente; para eso está «Datos» en Órdenes.
    const waiter = body.waiterId != null && body.waiterId !== ""
      ? await resolveWaiter(client, body.waiterId, user.restaurantId)
      : !order && user.role === "waiter" ? { id: Number(user.id), name: user.name } : undefined
    const actor = { id: user.id, name: user.name }
    const zoneId = body.deliveryZoneId == null || body.deliveryZoneId === "" ? null : Number(body.deliveryZoneId)
    if (zoneId !== null && (!Number.isSafeInteger(zoneId) || zoneId <= 0)) throw new ServiceOrderError("Zona de delivery inválida.")
    if (!order) {
      const orderType = body.orderType ?? "dineIn"
      const customerId = await upsertCustomer(client, { name: body.customerName, phone: body.customerPhone, address: body.deliveryAddress })
      const zone = orderType === "delivery" ? await deliveryFeeFor(client, zoneId, 0) : null
      const result = await client.query(`INSERT INTO service_orders
        (card_id, table_id, order_type, table_label, customer_name, customer_phone, notes, created_by, waiter_id, waiter_name,
         customer_id, delivery_zone_id, delivery_zone_name, delivery_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`, [
        cardId, tableId, orderType, tableLabel,
        cleanText(body.customerName, 120), cleanText(body.customerPhone, 40),
        cleanText(body.notes, 500), Number(user.id), waiter?.id ?? null, waiter?.name ?? "",
        customerId, zone?.id ?? null, zone?.name ?? "", orderType === "delivery" ? cleanText(body.deliveryAddress, 300) : "",
      ])
      order = await loadOrder(client, Number(result.rows[0].id), true)
      await logOrderEvent(client, order.id, "created", { status: orderType, note: tableLabel, actor })
      if (waiter) await logOrderEvent(client, order.id, "waiter", { note: waiter.name, actor })
    } else if (["tableLabel", "customerName", "customerPhone", "notes"].some((key) => body[key] !== undefined)) {
      const customerPhone = body.customerPhone === undefined ? order.customerPhone : cleanText(body.customerPhone, 40)
      const customerName = body.customerName === undefined ? order.customerName : cleanText(body.customerName, 120)
      const customerId = await upsertCustomer(client, { name: customerName, phone: customerPhone }) ?? order.customerId
      await client.query(`UPDATE service_orders SET table_label = $1, customer_name = $2,
        customer_phone = $3, notes = $4, customer_id = $5, updated_at = NOW() WHERE id = $6`, [
        tableId || order.tableId ? order.tableLabel : body.tableLabel === undefined ? order.tableLabel : cleanText(body.tableLabel, 30),
        customerName, customerPhone,
        body.notes === undefined ? order.notes : cleanText(body.notes, 500), customerId, order.id,
      ])
      order = await loadOrder(client, order.id, true)
    }
    if (waiter !== undefined && order.waiterId !== (waiter?.id ?? null)) {
      await client.query("UPDATE service_orders SET waiter_id = $1, waiter_name = $2, updated_at = NOW() WHERE id = $3",
        [waiter?.id ?? null, waiter?.name ?? "", order.id])
      await logOrderEvent(client, order.id, "waiter", { note: waiter?.name ?? "", actor })
      order = await loadOrder(client, order.id, true)
    }
    const newLines = await makeOrderLines(client, rawItems, order.orderType)
    if (newLines.length) {
      order = await saveOrderItems(client, order, newLines)
      await logOrderEvent(client, order.id, "items_added", {
        note: newLines.map((line) => `${line.quantity} × ${line.productName}`).join(", "), actor })
    }
    let ticket = null
    if (body.sendToKitchen === true) {
      const sent = await sendDraftToKitchen(client, order, Number(user.id))
      order = sent.order
      ticket = sent.ticket
      await logOrderEvent(client, order.id, "sent_to_kitchen", { status: "pending", ticketId: ticket.id, actor })
    }
    order = await loadOrder(client, order.id)
    await client.query("COMMIT")
    return NextResponse.json({ order, ticket }, { status: 201 })
  } catch (error) {
    await client.query("ROLLBACK")
    if (error instanceof ServiceOrderError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Service order failed", error)
    return NextResponse.json({ error: "No se pudo guardar la orden." }, { status: 500 })
  } finally { client.release() }
}
