import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { mapTicket } from "@/lib/service-order-server"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const all = request.nextUrl.searchParams.get("all") === "1"
  const result = await db.query(`SELECT t.*, o.order_type, o.table_label, o.customer_name, o.waiter_name, c.code AS card_code
    FROM kitchen_tickets t JOIN service_orders o ON o.id = t.order_id
    LEFT JOIN order_cards c ON c.id = o.card_id
    WHERE ${all ? "TRUE" : "t.status NOT IN ('served', 'delivered', 'cancelled') OR t.updated_at > NOW() - INTERVAL '1 day'"}
    ORDER BY t.created_at DESC LIMIT 200`)
  return NextResponse.json({ items: result.rows.map(mapTicket) })
}
