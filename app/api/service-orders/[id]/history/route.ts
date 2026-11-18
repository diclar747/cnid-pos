import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import type { OrderEvent } from "@/lib/service-order-types"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

// Historial de una orden, del más antiguo al más reciente.
export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Orden inválida." }, { status: 400 })
  const result = await db.query(`SELECT id, order_id, ticket_id, event, status, note, actor_name, created_at
    FROM order_status_history WHERE order_id = $1 ORDER BY created_at, id`, [id])
  const items: OrderEvent[] = result.rows.map((row) => ({
    id: Number(row.id), orderId: Number(row.order_id), ticketId: row.ticket_id == null ? null : Number(row.ticket_id),
    event: row.event, status: row.status, note: row.note, actorName: row.actor_name,
    createdAt: new Date(row.created_at).toISOString(),
  }))
  return NextResponse.json({ items })
}
