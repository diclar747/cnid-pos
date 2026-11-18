import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db, schemaQuery } from "@/lib/db"
import { notifyOrder, ticketStatusMessage } from "@/lib/web-push"
import { logOrderEvent, mapTicket } from "@/lib/service-order-server"
import type { KitchenStatus, ServiceOrderType } from "@/lib/service-order-types"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

const nextStatus = (status: KitchenStatus, type: ServiceOrderType): KitchenStatus | null => {
  if (status === "pending") return "preparing"
  if (status === "preparing") return "ready"
  if (status === "ready") return type === "dineIn" ? "served" : type === "delivery" ? "out_for_delivery" : "delivered"
  if (status === "out_for_delivery") return "delivered"
  return null
}

async function findTicket(id: number) {
  const result = await db.query(`SELECT t.*, o.order_type, o.table_label, o.customer_name, o.waiter_name, o.courier_name, o.delivery_address, c.code AS card_code
    FROM kitchen_tickets t JOIN service_orders o ON o.id = t.order_id
    LEFT JOIN order_cards c ON c.id = o.card_id WHERE t.id = $1`, [id])
  return result.rows[0] ? mapTicket(result.rows[0]) : null
}

export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Comanda inválida." }, { status: 400 })
  const ticket = await findTicket(id)
  return ticket ? NextResponse.json({ ticket }) : NextResponse.json({ error: "Comanda no encontrada." }, { status: 404 })
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos") || !hasPermission(user, "manage_sales")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  const body = await request.json().catch(() => null)
  if (!Number.isSafeInteger(id) || id <= 0 || typeof body?.status !== "string") {
    return NextResponse.json({ error: "Comanda o estado inválido." }, { status: 400 })
  }
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const result = await client.query(`SELECT t.status, t.order_id, o.order_type, dt.code AS table_code FROM kitchen_tickets t
      JOIN service_orders o ON o.id = t.order_id LEFT JOIN dining_tables dt ON dt.id = o.table_id WHERE t.id = $1 FOR UPDATE OF t`, [id])
    const row = result.rows[0]
    if (!row) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Comanda no encontrada." }, { status: 404 }) }
    if (body.status !== nextStatus(row.status, row.order_type)) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "El cambio de estado no sigue el flujo de esta comanda." }, { status: 409 })
    }
    await client.query("UPDATE kitchen_tickets SET status = $1, updated_at = NOW() WHERE id = $2", [body.status, id])
    await logOrderEvent(client, Number(row.order_id), "ticket_status", { status: body.status, ticketId: id, actor: { id: user.id, name: user.name } })
    await client.query("COMMIT")
    const message = ticketStatusMessage(body.status, row.order_type)
    if (message) {
      const query = await schemaQuery()
      void notifyOrder(query, Number(row.order_id), { ...message, url: row.table_code ? `/table/${row.table_code}` : undefined })
    }
    return NextResponse.json({ ticket: await findTicket(id) })
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Ticket status failed", error)
    return NextResponse.json({ error: "No se pudo actualizar la comanda." }, { status: 500 })
  } finally { client.release() }
}
