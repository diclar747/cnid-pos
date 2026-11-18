import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { cleanText } from "@/lib/service-order-server"
import { conversationRow } from "@/lib/whatsapp/rows"

export const runtime = "nodejs"

// Bandeja de conversaciones de WhatsApp (las más recientes primero).
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const search = cleanText(request.nextUrl.searchParams.get("q"), 60)
  const phone = (request.nextUrl.searchParams.get("phone") ?? "").replace(/\D/g, "").slice(0, 20)
  const values: unknown[] = []
  let where = "c.jid NOT LIKE 'simulator:%'"
  if (search) { values.push(`%${search}%`); where += ` AND (c.name ILIKE $${values.length} OR c.phone ILIKE $${values.length} OR c.last_message ILIKE $${values.length})` }
  if (phone) { values.push(`%${phone.slice(-8)}`); where += ` AND c.phone LIKE $${values.length}` }
  const result = await db.query(`SELECT c.*, (SELECT COUNT(*) FROM service_orders o WHERE o.wa_conversation_id = c.id AND o.status = 'open') AS open_orders
    FROM wa_conversations c WHERE ${where} ORDER BY c.handoff_requested DESC, c.last_message_at DESC NULLS LAST LIMIT 200`, values)
  return NextResponse.json({ items: result.rows.map(conversationRow) })
}
