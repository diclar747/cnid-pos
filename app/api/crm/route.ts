import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { cleanText, mapOrder, mapTicket } from "@/lib/service-order-server"
import type { KitchenTicket, ServiceOrder } from "@/lib/service-order-types"
import { STATS_TZ } from "@/lib/stats"

export const runtime = "nodejs"

export type CrmStage = "new" | "pending" | "confirmed" | "kitchen" | "ready" | "delivery" | "done" | "cancelled"
const RANK: Record<string, number> = { pending: 0, preparing: 1, ready: 2, out_for_delivery: 3, served: 4, delivered: 4 }
const BY_RANK: CrmStage[] = ["confirmed", "kitchen", "ready", "delivery", "done"]

/** Columna del tablero según los estados reales: confirmación, consumos sin enviar y la comanda más atrasada. */
function stageOf(order: ServiceOrder, tickets: KitchenTicket[]): CrmStage {
  if (order.status === "cancelled" || order.confirmation === "rejected") return "cancelled"
  if (order.status === "open" && order.confirmation === "pending") return "new"
  const active = tickets.filter((ticket) => ticket.status !== "cancelled")
  const drafts = order.items.some((line) => line.ticketId == null)
  if (!active.length) return order.status === "paid" ? "done" : "pending"
  const rank = Math.min(...active.map((ticket) => RANK[ticket.status] ?? 0))
  if (rank === 4 && drafts && order.status === "open") return "pending"
  return BY_RANK[rank]
}

// Pedidos del día (y todos los abiertos) agrupables en columnas, con sus comandas.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const params = request.nextUrl.searchParams
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: STATS_TZ }).format(new Date())
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "") ? params.get("date")! : today
  const search = cleanText(params.get("q"), 80)
  const source = ["pos", "table_qr", "whatsapp", "web"].includes(params.get("source") ?? "") ? params.get("source") : null
  const values: unknown[] = [date]
  let where = `(o.created_at >= ($1::date)::timestamp AT TIME ZONE '${STATS_TZ}' AND o.created_at < ($1::date + 1)::timestamp AT TIME ZONE '${STATS_TZ}'
    ${date === today ? "OR o.status = 'open'" : ""})`
  if (search) {
    values.push(`%${search.replace(/^#/, "")}%`)
    const i = values.length
    where += ` AND (o.id::text ILIKE $${i} OR o.customer_name ILIKE $${i} OR o.customer_phone ILIKE $${i} OR o.table_label ILIKE $${i})`
  }
  if (source) { values.push(source); where += ` AND COALESCE(o.source, 'pos') = $${values.length}` }
  const orders = await db.query(`SELECT o.*, c.code AS card_code FROM service_orders o LEFT JOIN order_cards c ON c.id = o.card_id
    WHERE ${where} ORDER BY o.created_at DESC LIMIT 300`, values)
  const ids = orders.rows.map((row) => Number(row.id))
  const tickets = ids.length ? await db.query(`SELECT t.*, o.order_type, o.table_label, o.customer_name, o.waiter_name, o.courier_name, o.delivery_address, NULL AS card_code
    FROM kitchen_tickets t JOIN service_orders o ON o.id = t.order_id WHERE t.order_id = ANY($1::bigint[]) ORDER BY t.id`, [ids]) : { rows: [] }
  const byOrder = new Map<number, KitchenTicket[]>()
  for (const row of tickets.rows) {
    const ticket = mapTicket(row)
    byOrder.set(ticket.orderId, [...(byOrder.get(ticket.orderId) ?? []), ticket])
  }
  const items = orders.rows.map((row) => {
    const order = mapOrder(row)
    const orderTickets = byOrder.get(order.id) ?? []
    return { order, tickets: orderTickets, stage: stageOf(order, orderTickets),
      minutes: Math.max(0, Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)) }
  })
  return NextResponse.json({ date, today, items })
}
