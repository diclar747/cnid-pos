import "server-only"

import { schemaQuery, type SchemaQuery } from "../db"
import { niroConfigured, niroTranscribe } from "../niro"
import { notifyStaff } from "../web-push"

// Mensajes entrantes de WhatsApp: se guardan una sola vez, se transcriben los audios y se pasan al asistente
// (o al personal cuando la conversación está tomada por una persona).

type Incoming = { kind: "text" | "audio" | "image" | "location" | "other"; body: string }
const queues = new Map<string, Promise<void>>()

function unwrap(message: any): any {
  let content = message
  for (let i = 0; i < 4 && content; i++) {
    const inner = content.ephemeralMessage?.message ?? content.viewOnceMessage?.message ?? content.viewOnceMessageV2?.message
      ?? content.viewOnceMessageV2Extension?.message ?? content.documentWithCaptionMessage?.message ?? content.editedMessage?.message
    if (!inner) break
    content = inner
  }
  return content
}

async function readContent(baileys: any, sock: any, msg: any, query: SchemaQuery, conversationId: number): Promise<Incoming | null> {
  const m = unwrap(msg.message)
  if (!m || m.protocolMessage || m.reactionMessage || m.pollUpdateMessage) return null
  const text = m.conversation ?? m.extendedTextMessage?.text ?? m.buttonsResponseMessage?.selectedDisplayText ?? m.listResponseMessage?.title
    ?? m.templateButtonReplyMessage?.selectedDisplayText
  if (typeof text === "string" && text.trim()) return { kind: "text", body: text.trim().slice(0, 4000) }
  if (m.locationMessage || m.liveLocationMessage) {
    const place = m.locationMessage ?? m.liveLocationMessage
    const lat = Number(place.degreesLatitude), lng = Number(place.degreesLongitude)
    const label = [place.name, place.address].filter(Boolean).join(" · ")
    return { kind: "location", body: `📍 Ubicación compartida${label ? `: ${label}` : ""} https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}` }
  }
  if (m.audioMessage) {
    if (!niroConfigured()) return { kind: "audio", body: "🎤 [audio]" }
    const started = Date.now()
    try {
      const buffer = await baileys.downloadMediaMessage(msg, "buffer", {}, { logger: undefined, reuploadRequest: sock.updateMediaMessage })
      if (buffer.length > 16 * 1024 * 1024) return { kind: "audio", body: "🎤 [audio demasiado largo]" }
      const result = await niroTranscribe(buffer, "audio.ogg", m.audioMessage.mimetype?.split(";")[0] || "audio/ogg")
      await query(`INSERT INTO ai_interactions (conversation_id, kind, status, latency_ms) VALUES ($1, 'transcription', 'ok', $2)`, [conversationId, result.latencyMs])
      return { kind: "audio", body: result.text ? `🎤 ${result.text}` : "🎤 [audio sin texto reconocible]" }
    } catch (error) {
      await query(`INSERT INTO ai_interactions (conversation_id, kind, status, latency_ms, error) VALUES ($1, 'transcription', 'error', $2, $3)`,
        [conversationId, Date.now() - started, (error instanceof Error ? error.message : String(error)).slice(0, 300)])
      return { kind: "audio", body: "🎤 [audio que no se pudo transcribir]" }
    }
  }
  if (m.imageMessage) return { kind: "image", body: `🖼️ [imagen]${m.imageMessage.caption ? ` ${m.imageMessage.caption}` : ""}` }
  if (m.videoMessage || m.documentMessage || m.stickerMessage || m.contactMessage) return { kind: "other", body: "[archivo adjunto]" }
  return null
}

/** Número de teléfono del contacto (en direcciones LID, WhatsApp manda el número en el campo alternativo). */
function phoneOf(baileys: any, key: any) {
  for (const jid of [key.remoteJid, key.remoteJidAlt]) {
    if (jid && baileys.isPnUser?.(jid)) return baileys.jidDecode(jid)?.user ?? ""
  }
  return ""
}

export async function handleUpsert(schema: string, sock: any, event: { messages: any[]; type: string }) {
  if (event.type !== "notify") return
  const baileys = await import("@whiskeysockets/baileys")
  const query = await schemaQuery(schema)
  for (const msg of event.messages) {
    const jid: string | undefined = msg.key?.remoteJid
    if (!jid || !msg.message || baileys.isJidGroup(jid) || baileys.isJidBroadcast(jid) || baileys.isJidStatusBroadcast(jid) || baileys.isJidNewsletter(jid)) continue
    const waId = String(msg.key.id ?? "")
    if (!waId) continue
    // Si ya existe (WhatsApp reenvía eventos), no se procesa otra vez.
    if ((await query("SELECT 1 FROM wa_messages WHERE wa_id = $1", [waId])).rows[0]) continue
    const fromMe = Boolean(msg.key.fromMe)
    const phone = phoneOf(baileys, msg.key)
    const conversation = (await query(`INSERT INTO wa_conversations (jid, phone, name) VALUES ($1, $2, $3)
      ON CONFLICT (jid) DO UPDATE SET phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE wa_conversations.phone END,
        name = CASE WHEN EXCLUDED.name <> '' AND NOT $4 THEN EXCLUDED.name ELSE wa_conversations.name END, updated_at = NOW()
      RETURNING id, bot_enabled, name`, [jid, phone, fromMe ? "" : String(msg.pushName ?? "").slice(0, 80), fromMe])).rows[0]
    const conversationId = Number(conversation.id)
    const content = await readContent(baileys, sock, msg, query, conversationId)
    if (!content) continue
    const inserted = await query(`INSERT INTO wa_messages (conversation_id, wa_id, direction, author, author_name, kind, body, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9)) ON CONFLICT DO NOTHING RETURNING id`,
      [conversationId, waId, fromMe ? "out" : "in", fromMe ? "staff" : "customer", fromMe ? "Desde el teléfono" : conversation.name, content.kind, content.body,
        fromMe ? "sent" : "received", Number(msg.messageTimestamp ?? Date.now() / 1000)])
    if (!inserted.rows[0]) continue
    await query(`UPDATE wa_conversations SET last_message = $2, last_message_at = NOW(), unread = unread + $3, updated_at = NOW() WHERE id = $1`,
      [conversationId, content.body.slice(0, 200), fromMe ? 0 : 1])
    if (fromMe) continue
    // Un mensaje a la vez por conversación, en orden.
    const key = `${schema}:${conversationId}`
    const previous = queues.get(key) ?? Promise.resolve()
    const next = previous.then(() => respond(schema, conversationId, sock, msg.key, conversation.name, content)).catch((error) => console.error("WhatsApp: el asistente falló", error))
    queues.set(key, next)
    void next.finally(() => { if (queues.get(key) === next) queues.delete(key) })
  }
}

async function respond(schema: string, conversationId: number, sock: any, key: any, name: string, content: Incoming) {
  const query = await schemaQuery(schema)
  const conversation = (await query("SELECT bot_enabled FROM wa_conversations WHERE id = $1", [conversationId])).rows[0]
  const settings = (await query("SELECT enabled FROM ai_settings WHERE id = 1")).rows[0]
  if (!conversation?.bot_enabled || !settings?.enabled || !niroConfigured()) {
    void notifyStaff(query, { title: `WhatsApp · ${name || "Cliente"}`, body: content.body.slice(0, 140), url: `/admin/whatsapp?c=${conversationId}`, tag: `wa-${conversationId}` })
    return
  }
  await sock.readMessages?.([key]).catch(() => undefined)
  await sock.sendPresenceUpdate?.("composing", key.remoteJid).catch(() => undefined)
  try {
    const { runAssistant } = await import("./assistant")
    await runAssistant(schema, conversationId, { mode: "live" })
  } finally {
    await sock.sendPresenceUpdate?.("paused", key.remoteJid).catch(() => undefined)
  }
}
