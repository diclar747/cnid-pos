import { NextRequest, NextResponse } from "next/server"
import { canTakeOrders, getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { cleanText, deliveryFeeFor, loadOrder, logOrderEvent, refreshDeliveryFee, resolveWaiter, sendDraftToKitchen, ServiceOrderError, upsertCustomer } from "@/lib/service-order-server"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Orden inválida." }, { status: 400 })
  const client = await db.connect()
  try { return NextResponse.json({ order: await loadOrder(client, id) }) }
  catch (error) {
    if (error instanceof ServiceOrderError) return NextResponse.json({ error: error.message }, { status: error.status })
    throw error
  } finally { client.release() }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!canTakeOrders(user)) {
    return NextResponse.json({ error: "Sin permiso para cambiar órdenes." }, { status: 403 })
  }
  const id = Number((await params).id)
  const body = await request.json().catch(() => null)
  if (!Number.isSafeInteger(id) || id <= 0 || !["details", "send", "cancel", "bill", "confirm", "reject"].includes(body?.action)) {
    return NextResponse.json({ error: "Orden o acción inválida." }, { status: 400 })
  }
  // Cancelar o rechazar devuelve stock y anula la cuenta: queda reservado a quien puede cobrar.
  if ((body.action === "cancel" || body.action === "reject") && !hasPermission(user, "manage_sales")) {
    return NextResponse.json({ error: "Solo caja puede cancelar o rechazar una orden." }, { status: 403 })
  }
  const actor = { id: user.id, name: user.name }
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    let order = await loadOrder(client, id, true)
    if (order.status !== "open") throw new ServiceOrderError("La orden ya fue cerrada.", 409)
    let ticket = null
    if (body.action === "confirm") {
      if (order.confirmation !== "pending") throw new ServiceOrderError("La orden no está pendiente de confirmación.", 409)
      await client.query("UPDATE service_orders SET confirmation = 'confirmed', updated_at = NOW() WHERE id = $1", [id])
      await logOrderEvent(client, id, "confirmed", { note: cleanText(body.note, 300), actor })
      if (body.sendToKitchen === true && order.items.some((line) => line.ticketId == null)) {
        const sent = await sendDraftToKitchen(client, { ...order, confirmation: "confirmed" }, Number(user.id))
        ticket = sent.ticket
        await logOrderEvent(client, id, "sent_to_kitchen", { status: "pending", ticketId: ticket.id, actor })
      }
    } else if (body.action === "details") {
      let tableId = order.tableId
      let tableLabel = order.tableLabel
      if (body.tableId !== undefined) {
        tableId = body.tableId === null || body.tableId === "" ? null : Number(body.tableId)
        if (tableId !== null) {
          if (!Number.isSafeInteger(tableId) || tableId <= 0) throw new ServiceOrderError("Mesa inválida.")
          const table = await client.query(`SELECT t.label, r.name AS room_name FROM dining_tables t
            JOIN dining_rooms r ON r.id=t.room_id WHERE t.id=$1 AND t.is_active AND r.is_active`, [tableId])
          if (!table.rows[0]) throw new ServiceOrderError("Mesa no disponible.", 404)
          const occupied = await client.query("SELECT id FROM service_orders WHERE table_id=$1 AND status='open' AND id<>$2", [tableId, id])
          if (occupied.rows[0]) throw new ServiceOrderError("La mesa tiene otra cuenta abierta.", 409)
          tableLabel = `${table.rows[0].room_name} · ${table.rows[0].label}`
        }
      }
      if (!tableId && body.tableLabel !== undefined) tableLabel = cleanText(body.tableLabel, 80)
      const waiter = body.waiterId === undefined
        ? (order.waiterId ? { id: order.waiterId, name: order.waiterName } : null)
        : await resolveWaiter(client, body.waiterId, user.restaurantId)
      const customerName = body.customerName === undefined ? order.customerName : cleanText(body.customerName, 120)
      const customerPhone = body.customerPhone === undefined ? order.customerPhone : cleanText(body.customerPhone, 40)
      const deliveryAddress = body.deliveryAddress === undefined ? order.deliveryAddress : cleanText(body.deliveryAddress, 300)
      const customerId = await upsertCustomer(client, { name: customerName, phone: customerPhone, address: deliveryAddress }) ?? order.customerId
      // Delivery: zona (define el costo de envío) y repartidor.
      let zone = order.deliveryZoneId ? { id: order.deliveryZoneId, name: order.deliveryZoneName } : null
      if (body.deliveryZoneId !== undefined) {
        const zoneId = body.deliveryZoneId === null || body.deliveryZoneId === "" ? null : Number(body.deliveryZoneId)
        if (zoneId !== null && (!Number.isSafeInteger(zoneId) || zoneId <= 0)) throw new ServiceOrderError("Zona de delivery inválida.")
        zone = await deliveryFeeFor(client, zoneId, order.total)
      }
      let courier = order.courierId ? { id: order.courierId, name: order.courierName } : null
      if (body.courierId !== undefined) {
        const courierId = body.courierId === null || body.courierId === "" ? null : Number(body.courierId)
        if (courierId !== null) {
          if (!Number.isSafeInteger(courierId) || courierId <= 0) throw new ServiceOrderError("Repartidor inválido.")
          const found = await client.query("SELECT id, name FROM couriers WHERE id = $1 AND is_active", [courierId])
          if (!found.rows[0]) throw new ServiceOrderError("Repartidor no disponible.", 404)
          courier = { id: Number(found.rows[0].id), name: String(found.rows[0].name) }
        } else courier = null
        if ((courier?.id ?? null) !== order.courierId) await logOrderEvent(client, id, "courier", { note: courier?.name ?? "Sin repartidor", actor })
      }
      if ((waiter?.id ?? null) !== order.waiterId) await logOrderEvent(client, id, "waiter", { note: waiter?.name ?? "Sin mesero", actor })
      await client.query(`UPDATE service_orders SET table_id=$1, table_label = $2, customer_name = $3,
        customer_phone = $4, notes = $5, waiter_id = $6, waiter_name = $7, customer_id = $8,
        delivery_zone_id = $9, delivery_zone_name = $10, delivery_address = $11, courier_id = $12, courier_name = $13,
        updated_at = NOW() WHERE id = $14`, [
        tableId, tableLabel, customerName, customerPhone,
        body.notes === undefined ? order.notes : cleanText(body.notes, 500),
        waiter?.id ?? null, waiter?.name ?? "", customerId,
        order.orderType === "delivery" ? zone?.id ?? null : null, order.orderType === "delivery" ? zone?.name ?? "" : "",
        order.orderType === "delivery" ? deliveryAddress : "", courier?.id ?? null, courier?.name ?? "", id,
      ])
      await refreshDeliveryFee(client, id)
      await logOrderEvent(client, id, "details", { actor })
    } else if (body.action === "bill") {
      if (!order.items.length) throw new ServiceOrderError("La cuenta no tiene consumos para la precuenta.")
      await client.query("UPDATE service_orders SET billed_at = NOW(), bill_count = bill_count + 1, updated_at = NOW() WHERE id = $1", [id])
      await logOrderEvent(client, id, "billed", { status: String(order.billCount + 1), actor })
    } else if (body.action === "send") {
      const sent = await sendDraftToKitchen(client, order, Number(user.id))
      ticket = sent.ticket
      await logOrderEvent(client, id, "sent_to_kitchen", { status: "pending", ticketId: ticket.id, actor })
    } else {
      const tickets = await client.query("SELECT status FROM kitchen_tickets WHERE order_id = $1 FOR UPDATE", [id])
      if (tickets.rows.some((row) => ["ready", "served", "out_for_delivery", "delivered"].includes(row.status))) {
        throw new ServiceOrderError("Esta orden ya está lista o entregada. Resolvé una devolución antes de cancelarla.", 409)
      }
      const quantities = new Map<number, number>()
      for (const line of order.items) if (line.stockReserved) {
        quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity)
      }
      for (const [productId, quantity] of [...quantities].sort((a, b) => a[0] - b[0])) {
        const productResult = await client.query("SELECT data FROM products WHERE id = $1 FOR UPDATE", [productId])
        const product = productResult.rows[0]?.data
        if (!product) throw new ServiceOrderError("No se puede devolver el stock de un producto eliminado.", 409)
        if (product.trackStock === false) continue
        const stock = Number(product.stock) + quantity
        if (!Number.isSafeInteger(stock)) throw new ServiceOrderError("Stock fuera de rango.")
        await client.query("UPDATE products SET data = jsonb_set(data, '{stock}', to_jsonb($1::integer)), updated_at = NOW() WHERE id = $2", [stock, productId])
        await client.query(`INSERT INTO stock_movements (product_id, previous_stock, new_stock, reason, user_id)
          VALUES ($1, $2, $3, 'cancel_service_order', $4)`, [productId, product.stock, stock, Number(user.id)])
      }
      await client.query("UPDATE kitchen_tickets SET status = 'cancelled', updated_at = NOW() WHERE order_id = $1", [id])
      const rejected = body.action === "reject"
      await client.query(`UPDATE service_orders SET status = 'cancelled', closed_at = NOW(), updated_at = NOW()
        ${rejected ? ", confirmation = 'rejected'" : ""} WHERE id = $1`, [id])
      await logOrderEvent(client, id, rejected ? "rejected" : "cancelled", { note: cleanText(body.reason ?? body.note, 300), actor })
    }
    order = await loadOrder(client, id)
    await client.query("COMMIT")
    return NextResponse.json({ order, ticket })
  } catch (error) {
    await client.query("ROLLBACK")
    if (error instanceof ServiceOrderError) return NextResponse.json({ error: error.message }, { status: error.status })
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "La mesa ya tiene una cuenta abierta." }, { status: 409 })
    console.error("Order update failed", error)
    return NextResponse.json({ error: "No se pudo actualizar la orden." }, { status: 500 })
  } finally { client.release() }
}
