import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { currentSchema, db } from "@/lib/db"
import { sendMedia } from "@/lib/whatsapp/session"
import { webmOpusToOgg } from "@/lib/whatsapp/opus-ogg"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

const LIMITS = { image: 5 * 1024 * 1024, video: 16 * 1024 * 1024, audio: 16 * 1024 * 1024, document: 16 * 1024 * 1024 }

// Responder con un adjunto desde el chat: imagen, video, documento o nota de voz grabada en el navegador.
// Pausa el asistente en la conversación (igual que responder con texto).
export async function POST(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Conversación inválida." }, { status: 400 })
  const exists = (await db.query("SELECT id FROM wa_conversations WHERE id = $1 AND jid NOT LIKE 'simulator:%'", [id])).rows[0]
  if (!exists) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 })
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Elegí un archivo." }, { status: 400 })
  const mime = (file.type || "application/octet-stream").split(";")[0].toLowerCase()
  const voice = form?.get("voice") === "1"
  const kind = voice || mime.startsWith("audio/") ? "audio" : /^image\/(jpeg|png|webp|gif)$/.test(mime) ? "image" : /^video\/(mp4|3gpp|quicktime|webm)$/.test(mime) ? "video" : "document"
  if (file.size > LIMITS[kind]) return NextResponse.json({ error: kind === "image" ? "La imagen supera 5 MB." : "El archivo supera 16 MB." }, { status: 413 })
  const seconds = Number(form?.get("seconds"))
  const caption = typeof form?.get("caption") === "string" ? String(form?.get("caption")).trim().slice(0, 1000) : ""
  await db.query("UPDATE wa_conversations SET bot_enabled = FALSE, handoff_requested = FALSE, assigned_user_id = $2, assigned_name = $3, unread = 0, updated_at = NOW() WHERE id = $1",
    [id, Number(user.id), user.name])
  let buffer = Buffer.from(await file.arrayBuffer())
  let sendMime = mime
  let duration = Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null
  let asVoice = false
  if (voice) {
    // Nota de voz: WhatsApp la reproduce como tal solo en Ogg/Opus. Chrome graba WebM/Opus: se re-empaqueta.
    const converted = mime.includes("webm") ? webmOpusToOgg(buffer) : null
    if (converted) { buffer = Buffer.from(converted.ogg); sendMime = "audio/ogg"; duration = converted.seconds; asVoice = true }
    else if (mime.includes("ogg")) { sendMime = "audio/ogg"; asVoice = true }
  }
  const sent = await sendMedia(await currentSchema(), id, {
    kind, buffer, mime: sendMime, fileName: file.name?.slice(0, 160) || undefined, caption, seconds: duration, voice: asVoice,
  }, { author: "staff", authorName: user.name })
  return sent ? NextResponse.json({ ok: true }, { status: 201 }) : NextResponse.json({ error: "WhatsApp no está conectado: el archivo quedó guardado sin enviar." }, { status: 409 })
}
