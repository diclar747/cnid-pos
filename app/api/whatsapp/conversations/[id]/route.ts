import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { currentSchema, db, schemaQuery } from "@/lib/db"
import { mapOrder } from "@/lib/service-order-server"
import { sendText } from "@/lib/whatsapp/session"
import { CONVERSATION_COLUMNS, conversationRow, messageRow } from "@/lib/whatsapp/rows"
import { contactProfile } from "@/lib/whatsapp/contact-profile"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

async function conversationId(params: Context["params"]) {
  const id = Number((await params).id)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

// Conversación con sus mensajes, el carrito del asistente y los pedidos vinculados. Marca los mensajes como leídos.
export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = await conversationId(params)
  if (!id) return NextResponse.json({ error: "Conversación inválida." }, { status: 400 })
  const row = (await db.query(`SELECT ${CONVERSATION_COLUMNS} FROM wa_conversations c WHERE c.id = $1 AND c.jid NOT LIKE 'simulator:%'`, [id])).rows[0]
  if (!row) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 })
  const [messages, orders, profile] = await Promise.all([
    db.query(`SELECT m.*, md.mime AS media_mime, md.seconds AS media_seconds, md.file_name AS media_file_name, md.size AS media_size FROM (SELECT * FROM wa_messages WHERE conversation_id = $1 ORDER BY created_at DESC, id DESC LIMIT 300) m
      LEFT JOIN wa_media md ON md.id = m.media_id ORDER BY m.created_at, m.id`, [id]),
    db.query("SELECT o.*, NULL AS card_code FROM service_orders o WHERE o.wa_conversation_id = $1 ORDER BY o.id DESC LIMIT 20", [id]),
    schemaQuery().then((query) => contactProfile(query, { id, phone: row.phone, name: row.name, cart: row.cart })),
  ])
  if (Number(row.unread) > 0) await db.query("UPDATE wa_conversations SET unread = 0 WHERE id = $1", [id])
  return NextResponse.json({ conversation: { ...conversationRow(row), cart: row.cart ?? {} }, messages: messages.rows.map(messageRow), orders: orders.rows.map(mapOrder), profile })
}

// Intervención humana: responder, tomar la conversación (pausa el asistente) o devolverla al asistente.
export async function POST(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = await conversationId(params)
  const body = await request.json().catch(() => null)
  if (!id || !["send", "take", "release"].includes(body?.action)) return NextResponse.json({ error: "Acción inválida." }, { status: 400 })
  const exists = (await db.query("SELECT id FROM wa_conversations WHERE id = $1 AND jid NOT LIKE 'simulator:%'", [id])).rows[0]
  if (!exists) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 })
  const schema = await currentSchema()
  if (body.action === "release") {
    await db.query("UPDATE wa_conversations SET bot_enabled = TRUE, handoff_requested = FALSE, assigned_user_id = NULL, assigned_name = '', updated_at = NOW() WHERE id = $1", [id])
    await db.query(`INSERT INTO wa_messages (conversation_id, direction, author, author_name, body, status) VALUES ($1, 'out', 'system', $2, 'La conversación volvió al asistente.', 'simulated')`, [id, user.name])
    return NextResponse.json({ ok: true })
  }
  // Tomar o responder: el asistente se pausa en esta conversación y queda quién la atiende.
  const takeOver = () => db.query("UPDATE wa_conversations SET bot_enabled = FALSE, handoff_requested = FALSE, assigned_user_id = $2, assigned_name = $3, unread = 0, updated_at = NOW() WHERE id = $1",
    [id, Number(user.id), user.name])
  if (body.action === "take") {
    await takeOver()
    await db.query(`INSERT INTO wa_messages (conversation_id, direction, author, author_name, body, status) VALUES ($1, 'out', 'system', $2, $3, 'simulated')`, [id, user.name, `${user.name} tomó la conversación.`])
    return NextResponse.json({ ok: true })
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : ""
  if (!text) return NextResponse.json({ error: "Escribí un mensaje." }, { status: 400 })
  const sent = await sendText(schema, id, text, { author: "staff", authorName: user.name })
  // Si no salió (WhatsApp desconectado), el asistente sigue atendiendo: el mensaje queda guardado como «no enviado».
  if (sent) await takeOver()
  return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "WhatsApp no está conectado: el mensaje quedó guardado sin enviar." }, { status: 409 })
}
