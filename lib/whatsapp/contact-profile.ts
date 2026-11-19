import "server-only"

import type { SchemaQuery } from "../db"
import { stageOf, staffStageLabel, type CrmStage } from "../order-stage"
import { mapOrder, mapTicket } from "../service-order-server"
import type { KitchenTicket, ServiceOrder } from "../service-order-types"

// Ficha del contacto de WhatsApp: datos del cliente, mesa en la que está y sus pedidos con la etapa real
// (la misma del tablero de Pedidos: nuevo, pendiente, confirmado, en cocina, listo, en delivery, entregado o cancelado).
// Un pedido es del contacto si nació en la conversación o si tiene su mismo teléfono (POS, mesa, web).

/** Últimos 9 dígitos: iguala 0981…, 595981… y +595 981…. */
export const phoneKey = (phone: string | null | undefined) => {
  const digits = String(phone ?? "").replace(/\D/g, "")
  return digits.length >= 8 ? digits.slice(-9) : ""
}

const PHONE_SQL = "RIGHT(REGEXP_REPLACE(COALESCE(o.customer_phone, ''), '\\D', '', 'g'), 9)"

export type ContactOrder = {
  id: number; stage: CrmStage; stageLabel: string; orderType: ServiceOrder["orderType"]; source: string; confirmation: string; status: string
  tableLabel: string; total: number; grandTotal: number; createdAt: string; updatedAt: string; customerName: string; waiterName: string; courierName: string
  deliveryAddress: string; items: { name: string; quantity: number; ticketId: number | null }[]
  tickets: { id: number; status: KitchenTicket["status"]; delayMinutes: number | null }[]
}

export type ContactBadge = { orderId: number; stage: CrmStage; label: string; orderType: string; tableLabel: string; active: number }

async function ordersWithStage(query: SchemaQuery, where: string, values: unknown[], limit: number) {
  const orders = (await query(`SELECT o.*, NULL AS card_code FROM service_orders o WHERE ${where} ORDER BY o.created_at DESC LIMIT ${limit}`, values)).rows.map(mapOrder)
  const ids = orders.map((order) => order.id)
  const tickets = ids.length ? (await query(`SELECT t.*, o.order_type, o.table_label, o.customer_name, NULL AS card_code FROM kitchen_tickets t
    JOIN service_orders o ON o.id = t.order_id WHERE t.order_id = ANY($1::bigint[]) ORDER BY t.id`, [ids])).rows.map(mapTicket) : []
  return orders.map((order) => {
    const own = tickets.filter((ticket) => ticket.orderId === order.id)
    const stage = stageOf(order, own)
    return { order, tickets: own, stage, stageLabel: staffStageLabel(stage, order.orderType) }
  })
}

const isActive = (stage: CrmStage, order: ServiceOrder) => order.status === "open" ? stage !== "cancelled" : stage !== "done" && stage !== "cancelled"

/**
 * Etiqueta de cada conversación para la bandeja: el pedido más reciente (abierto o de las últimas 12 h)
 * y cuántos siguen en curso. Una sola consulta para toda la lista.
 */
export async function contactBadges(query: SchemaQuery, conversations: { id: number; phone: string }[]) {
  const badges = new Map<number, ContactBadge>()
  if (!conversations.length) return badges
  const ids = conversations.map((item) => item.id)
  const keys = [...new Set(conversations.map((item) => phoneKey(item.phone)).filter(Boolean))]
  const rows = await ordersWithStage(query, `(o.wa_conversation_id = ANY($1::bigint[]) OR (${PHONE_SQL} <> '' AND ${PHONE_SQL} = ANY($2::text[])))
    AND (o.status = 'open' OR o.updated_at > NOW() - INTERVAL '12 hours')`, [ids, keys], 500)
  const linked = new Map<number, number>()
  for (const row of (await query("SELECT id, wa_conversation_id FROM service_orders WHERE id = ANY($1::bigint[])", [rows.map((row) => row.order.id)])).rows)
    if (row.wa_conversation_id != null) linked.set(Number(row.id), Number(row.wa_conversation_id))
  for (const conversation of conversations) {
    const key = phoneKey(conversation.phone)
    const own = rows.filter((row) => linked.get(row.order.id) === conversation.id || (key && phoneKey(row.order.customerPhone) === key))
    if (!own.length) continue
    const active = own.filter((row) => isActive(row.stage, row.order))
    const shown = active[0] ?? own[0] // ya vienen del más nuevo al más viejo
    badges.set(conversation.id, { orderId: shown.order.id, stage: shown.stage, label: shown.stageLabel, orderType: shown.order.orderType,
      tableLabel: shown.order.orderType === "dineIn" ? shown.order.tableLabel : "", active: active.length })
  }
  return badges
}

/** Ficha completa del contacto para el panel lateral del chat. */
export async function contactProfile(query: SchemaQuery, conversation: { id: number; phone: string; name: string; cart?: any }) {
  const key = phoneKey(conversation.phone)
  const rows = await ordersWithStage(query, `(o.wa_conversation_id = $1 OR ($2 <> '' AND ${PHONE_SQL} = $2))`, [conversation.id, key], 25)
  const customer = key ? (await query(`SELECT id, name, phone, ruc, email, address, notes, orders_count, total_spent, last_order_at, created_at
    FROM customers WHERE RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 9) = $1 ORDER BY last_order_at DESC NULLS LAST LIMIT 1`, [key])).rows[0] : null
  const account = key ? (await query(`SELECT name, created_at, last_login_at, COALESCE(is_guest, FALSE) AS is_guest FROM public.customer_accounts
    WHERE RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g'), 9) = $1 LIMIT 1`, [key]).catch(() => ({ rows: [] }))).rows[0] : null
  const orders: ContactOrder[] = rows.map(({ order, tickets, stage, stageLabel }) => ({
    id: order.id, stage, stageLabel, orderType: order.orderType, source: order.source, confirmation: order.confirmation, status: order.status,
    tableLabel: order.tableLabel, total: order.total, grandTotal: order.grandTotal, createdAt: order.createdAt, updatedAt: order.updatedAt,
    customerName: order.customerName, waiterName: order.waiterName, courierName: order.courierName, deliveryAddress: order.deliveryAddress,
    items: order.items.map((line) => ({ name: line.productName, quantity: line.quantity, ticketId: line.ticketId ?? null })),
    tickets: tickets.map((ticket) => ({ id: ticket.id, status: ticket.status, delayMinutes: ticket.delayMinutes })),
  }))
  const active = rows.filter((row) => isActive(row.stage, row.order))
  const tables = [...new Set(active.filter((row) => row.order.orderType === "dineIn" && row.order.tableLabel).map((row) => row.order.tableLabel))]
  const paid = rows.filter((row) => row.order.status === "paid")
  const cart = conversation.cart ?? {}
  return {
    customer: customer ? {
      id: Number(customer.id), name: customer.name, phone: customer.phone, ruc: customer.ruc, email: customer.email, address: customer.address, notes: customer.notes,
      ordersCount: Number(customer.orders_count), totalSpent: Number(customer.total_spent),
      lastOrderAt: customer.last_order_at ? new Date(customer.last_order_at).toISOString() : null, since: new Date(customer.created_at).toISOString(),
    } : null,
    account: account ? { name: account.is_guest ? "" : account.name, guest: Boolean(account.is_guest), since: new Date(account.created_at).toISOString() } : null,
    tables,
    activeOrders: active.length,
    stats: { orders: rows.length, paid: paid.length, spent: paid.reduce((sum, row) => sum + row.order.grandTotal, 0) },
    cart: { items: Array.isArray(cart.items) ? cart.items.length : 0, orderType: typeof cart.orderType === "string" ? cart.orderType : "",
      address: typeof cart.address === "string" ? cart.address.slice(0, 200) : "",
      location: cart.location && Number.isFinite(Number(cart.location.lat)) && Number.isFinite(Number(cart.location.lng)) ? { lat: Number(cart.location.lat), lng: Number(cart.location.lng) } : null },
    orders,
  }
}

export type ContactProfile = Awaited<ReturnType<typeof contactProfile>>
