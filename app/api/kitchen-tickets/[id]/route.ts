import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { currentSchema, db } from "@/lib/db"
import { advanceTicket, FlowError, notifyCustomer, ticketEvent } from "@/lib/order-flow"
import { cleanText, logOrderEvent, mapTicket } from "@/lib/service-order-server"
import type { KitchenStatus } from "@/lib/service-order-types"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

async function findTicket(id: number) {
  const result = await db.query(`SELECT t.*, o.order_type, o.table_label, o.customer_name, o.waiter_name, o.courier_name, o.delivery_address, c.code AS card_code
    FROM kitchen_tickets t JOIN service_orders o ON o.id = t.order_id
    LEFT JOIN order_cards c ON c.id = o.card_id WHERE t.id = $1`, [id])
  return result.rows[0] ? mapTicket(result.rows[0]) : null
}

const ticketId = async (params: Context["params"]) => {
  const id = Number((await params).id)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = await ticketId(params)
  if (!id) return NextResponse.json({ error: "Comanda inválida." }, { status: 400 })
  const ticket = await findTicket(id)
  return ticket ? NextResponse.json({ ticket }) : NextResponse.json({ error: "Comanda no encontrada." }, { status: 404 })
}

// Avanzar el estado de la comanda (Pendiente → Preparando → Listo → Servido / En reparto → Entregado).
export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos") || !hasPermission(user, "manage_sales")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = await ticketId(params)
  const body = await request.json().catch(() => null)
  if (!id || typeof body?.status !== "string") return NextResponse.json({ error: "Comanda o estado inválido." }, { status: 400 })
  const schema = await currentSchema()
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    // jump: arrastrar en el tablero (cualquier estado válido); column: columna propia del restaurante.
    const column = typeof body.column === "string" && /^[a-z0-9-]{1,40}$/.test(body.column) ? body.column : null
    const moved = await advanceTicket(client, id, body.status as KitchenStatus, { id: user.id, name: user.name }, { jump: body.jump === true, column })
    if (body.status === "ready") await client.query("UPDATE kitchen_tickets SET delay_minutes = NULL WHERE id = $1", [id])
    await client.query("COMMIT")
    // Solo se avisa al cliente cuando el pedido avanza (no al corregir hacia atrás).
    const event = moved.forward ? ticketEvent(body.status as KitchenStatus) : null
    if (event) void notifyCustomer(schema, moved.orderId, event)
    return NextResponse.json({ ticket: await findTicket(id) })
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    if (error instanceof FlowError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Ticket status failed", error)
    return NextResponse.json({ error: "No se pudo actualizar la comanda." }, { status: 500 })
  } finally { client.release() }
}

// Avisos de cocina: demora estimada, falta de un producto o cambio de prioridad.
export async function POST(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = await ticketId(params)
  const body = await request.json().catch(() => null)
  if (!id || !["delay", "missing", "priority"].includes(body?.action)) return NextResponse.json({ error: "Acción inválida." }, { status: 400 })
  const schema = await currentSchema()
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const row = (await client.query("SELECT order_id, status FROM kitchen_tickets WHERE id = $1 FOR UPDATE", [id])).rows[0]
    if (!row) throw new FlowError("Comanda no encontrada.", 404)
    if (["served", "delivered", "cancelled"].includes(row.status)) throw new FlowError("La comanda ya terminó.")
    const actor = { id: user.id, name: user.name }
    const note = cleanText(body.note, 200)
    let customer: { event: "delay" | "missing"; minutes?: number; note?: string } | null = null
    if (body.action === "priority") {
      const priority = body.priority === "high" ? "high" : "normal"
      await client.query("UPDATE kitchen_tickets SET priority = $2, updated_at = NOW() WHERE id = $1", [id, priority])
      await logOrderEvent(client, Number(row.order_id), "priority", { status: priority, ticketId: id, actor })
    } else if (body.action === "delay") {
      const minutes = Number(body.minutes)
      if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 240) throw new FlowError("Indicá la demora en minutos (1 a 240).", 400)
      await client.query("UPDATE kitchen_tickets SET delay_minutes = $2, updated_at = NOW() WHERE id = $1", [id, minutes])
      await logOrderEvent(client, Number(row.order_id), "delay", { status: String(minutes), note, ticketId: id, actor })
      customer = { event: "delay", minutes, note: note || undefined }
    } else {
      if (!note) throw new FlowError("Indicá qué producto falta.", 400)
      await logOrderEvent(client, Number(row.order_id), "missing", { note, ticketId: id, actor })
      customer = { event: "missing", note: `Falta: ${note}.` }
    }
    await client.query("COMMIT")
    if (customer) void notifyCustomer(schema, Number(row.order_id), customer.event, { minutes: customer.minutes, note: customer.note })
    return NextResponse.json({ ticket: await findTicket(id) })
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    if (error instanceof FlowError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Kitchen notice failed", error)
    return NextResponse.json({ error: "No se pudo registrar el aviso." }, { status: 500 })
  } finally { client.release() }
}
