import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { currentSchema, db } from "@/lib/db"
import { niroConfigured } from "@/lib/niro"
import { rateLimited } from "@/lib/table-access"
import { runAssistant } from "@/lib/whatsapp/assistant"

export const runtime = "nodejs"

// «Probar asistente»: conversación de prueba con la carta y las reglas reales, sin enviar WhatsApp ni registrar pedidos.
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  if (!niroConfigured()) return NextResponse.json({ error: "Configurá NIRO_API_KEY en el servidor para probar el asistente." }, { status: 503 })
  const body = await request.json().catch(() => null)
  const jid = `simulator:${user.id}`
  const conversation = (await db.query(`INSERT INTO wa_conversations (jid, name, bot_enabled) VALUES ($1, $2, TRUE)
    ON CONFLICT (jid) DO UPDATE SET name = EXCLUDED.name RETURNING id`, [jid, user.name])).rows[0]
  const conversationId = Number(conversation.id)
  if (body?.reset === true) {
    await db.query("DELETE FROM wa_messages WHERE conversation_id = $1", [conversationId])
    await db.query("UPDATE wa_conversations SET cart = '{}'::jsonb WHERE id = $1", [conversationId])
    return NextResponse.json({ messages: [], cart: {} })
  }
  const text = typeof body?.message === "string" ? body.message.trim().slice(0, 1000) : ""
  if (!text) return NextResponse.json({ error: "Escribí un mensaje." }, { status: 400 })
  if (rateLimited(`simulate:${user.id}`, 20, 60_000)) return NextResponse.json({ error: "Demasiados mensajes de prueba por minuto." }, { status: 429 })
  await db.query(`INSERT INTO wa_messages (conversation_id, direction, author, author_name, body, status) VALUES ($1, 'in', 'customer', $2, $3, 'simulated')`, [conversationId, user.name, text])
  const schema = await currentSchema()
  const result = await runAssistant(schema, conversationId, { mode: "simulator" })
  const messages = (await db.query("SELECT author, body, created_at FROM wa_messages WHERE conversation_id = $1 ORDER BY created_at, id", [conversationId])).rows
  const cart = (await db.query("SELECT cart FROM wa_conversations WHERE id = $1", [conversationId])).rows[0]?.cart ?? {}
  return NextResponse.json({ messages: messages.map((row) => ({ author: row.author, body: row.body, createdAt: new Date(row.created_at).toISOString() })), cart, error: result.error },
    { status: result.error ? 502 : 200 })
}
