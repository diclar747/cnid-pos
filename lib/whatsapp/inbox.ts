import "server-only"

import { schemaQuery, type SchemaQuery } from "../db"
import { niroConfigured, niroTranscribe } from "../niro"
import { notifyStaff } from "../web-push"

// Mensajes entrantes de WhatsApp: se guardan una sola vez (con el audio o la imagen original para escucharlos
// y verlos en la bandeja), se transcriben los audios si está activado y se pasan al asistente
// (o al personal cuando la conversación está tomada por una persona).

type Media = { buffer: Buffer; mime: string; seconds: number | null }
type Incoming = { kind: "text" | "audio" | "image" | "location" | "other" | "video" | "document" | "sticker"; body: string; media?: Media & { fileName?: string }; location?: { lat: number; lng: number; label: string } }
const queues = new Map<string, Promise<void>>()
const MAX_AUDIO = 16 * 1024 * 1024
const MAX_IMAGE = 5 * 1024 * 1024
const MAX_FILE = 16 * 1024 * 1024

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

async function download(baileys: any, sock: any, msg: any): Promise<Buffer | null> {
  try { return await baileys.downloadMediaMessage(msg, "buffer", {}, { logger: undefined, reuploadRequest: sock.updateMediaMessage }) }
  catch (error) { console.error("WhatsApp: no se pudo descargar el archivo", error instanceof Error ? error.message : error); return null }
}

async function readContent(baileys: any, sock: any, msg: any, query: SchemaQuery, conversationId: number, transcribe: boolean): Promise<Incoming | null> {
  const m = unwrap(msg.message)
  if (!m || m.protocolMessage || m.reactionMessage || m.pollUpdateMessage) return null
  const text = m.conversation ?? m.extendedTextMessage?.text ?? m.buttonsResponseMessage?.selectedDisplayText ?? m.listResponseMessage?.title
    ?? m.templateButtonReplyMessage?.selectedDisplayText
  if (typeof text === "string" && text.trim()) return { kind: "text", body: text.trim().slice(0, 4000) }
  if (m.locationMessage || m.liveLocationMessage) {
    const place = m.locationMessage ?? m.liveLocationMessage
    const lat = Number(place.degreesLatitude), lng = Number(place.degreesLongitude)
    const label = [place.name, place.address].filter(Boolean).join(" · ")
    const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    return { kind: "location", body: `📍 Ubicación compartida${label ? `: ${label}` : ""} https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`,
      location: valid ? { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, label: label.slice(0, 200) } : undefined }
  }
  if (m.audioMessage) {
    const mime = String(m.audioMessage.mimetype ?? "audio/ogg").split(";")[0] || "audio/ogg"
    const seconds = Number(m.audioMessage.seconds) || null
    const buffer = await download(baileys, sock, msg)
    const media = buffer && buffer.length <= MAX_AUDIO ? { buffer, mime, seconds } : undefined
    if (!buffer) return { kind: "audio", body: "🎤 [audio que no se pudo descargar]" }
    if (!transcribe || !niroConfigured()) return { kind: "audio", body: "🎤 [audio sin transcribir]", media }
    if (buffer.length > MAX_AUDIO) return { kind: "audio", body: "🎤 [audio demasiado largo]" }
    const started = Date.now()
    try {
      const result = await niroTranscribe(buffer, "audio.ogg", mime)
      await query(`INSERT INTO ai_interactions (conversation_id, kind, status, latency_ms) VALUES ($1, 'transcription', 'ok', $2)`, [conversationId, result.latencyMs])
      return { kind: "audio", body: result.text ? `🎤 ${result.text}` : "🎤 [audio sin texto reconocible]", media }
    } catch (error) {
      await query(`INSERT INTO ai_interactions (conversation_id, kind, status, latency_ms, error) VALUES ($1, 'transcription', 'error', $2, $3)`,
        [conversationId, Date.now() - started, (error instanceof Error ? error.message : String(error)).slice(0, 300)])
      return { kind: "audio", body: "🎤 [audio que no se pudo transcribir]", media }
    }
  }
  if (m.imageMessage) {
    const buffer = await download(baileys, sock, msg)
    const mime = String(m.imageMessage.mimetype ?? "image/jpeg").split(";")[0] || "image/jpeg"
    return { kind: "image", body: `🖼️ [imagen]${m.imageMessage.caption ? ` ${m.imageMessage.caption}` : ""}`,
      media: buffer && buffer.length <= MAX_IMAGE && /^image\/(jpeg|png|webp|gif)$/.test(mime) ? { buffer, mime, seconds: null } : undefined }
  }
  if (m.videoMessage) {
    const buffer = await download(baileys, sock, msg)
    const mime = String(m.videoMessage.mimetype ?? "video/mp4").split(";")[0] || "video/mp4"
    return { kind: "video", body: `🎬 [video]${m.videoMessage.caption ? ` ${m.videoMessage.caption}` : ""}`,
      media: buffer && buffer.length <= MAX_FILE ? { buffer, mime, seconds: Number(m.videoMessage.seconds) || null } : undefined }
  }
  if (m.stickerMessage) {
    const buffer = await download(baileys, sock, msg)
    return { kind: "sticker", body: "🏷️ [sticker]", media: buffer && buffer.length <= MAX_IMAGE ? { buffer, mime: "image/webp", seconds: null } : undefined }
  }
  const doc = m.documentMessage ?? m.documentWithCaptionMessage?.message?.documentMessage
  if (doc) {
    const buffer = await download(baileys, sock, msg)
    const fileName = String(doc.fileName ?? doc.title ?? "archivo").slice(0, 160)
    return { kind: "document", body: `📄 ${fileName}${doc.caption ? ` · ${doc.caption}` : ""}`,
      media: buffer && buffer.length <= MAX_FILE ? { buffer, mime: String(doc.mimetype ?? "application/octet-stream").split(";")[0], seconds: null, fileName } : undefined }
  }
  if (m.contactMessage) return { kind: "other", body: `👤 Contacto: ${String(m.contactMessage.displayName ?? "").slice(0, 80)}` }
  return null
}

/** Número de teléfono del contacto (en direcciones LID, WhatsApp manda el número en el campo alternativo). */
function phoneOf(baileys: any, key: any) {
  for (const jid of [key.remoteJid, key.remoteJidAlt]) {
    if (jid && baileys.isPnUser?.(jid)) return baileys.jidDecode(jid)?.user ?? ""
  }
  return ""
}

/** Foto de perfil del contacto: se guarda la imagen (los enlaces de WhatsApp vencen) y se revisa cada 24 h. */
async function refreshAvatar(query: SchemaQuery, sock: any, conversationId: number, jids: string[]) {
  const current = (await query("SELECT checked_at FROM wa_avatars WHERE conversation_id = $1", [conversationId])).rows[0]
  if (current && Date.now() - new Date(current.checked_at).getTime() < 24 * 60 * 60 * 1000) return
  let data: Buffer | null = null, mime: string | null = null
  for (const jid of jids.filter(Boolean)) {
    try {
      const url = await sock.profilePictureUrl?.(jid, "image")
      if (!url) continue
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (!response.ok) continue
      const bytes = Buffer.from(await response.arrayBuffer())
      if (bytes.length > 0 && bytes.length <= 2 * 1024 * 1024) { data = bytes; mime = response.headers.get("content-type")?.split(";")[0] || "image/jpeg"; break }
    } catch { /* sin foto o privada */ }
  }
  await query(`INSERT INTO wa_avatars (conversation_id, mime, data, checked_at) VALUES ($1, $2, $3, NOW())
    ON CONFLICT (conversation_id) DO UPDATE SET mime = COALESCE(EXCLUDED.mime, wa_avatars.mime), data = COALESCE(EXCLUDED.data, wa_avatars.data), checked_at = NOW()`,
    [conversationId, mime, data])
}

export async function handleUpsert(schema: string, sock: any, event: { messages: any[]; type: string }) {
  if (event.type !== "notify") return
  const baileys = await import("@whiskeysockets/baileys")
  const query = await schemaQuery(schema)
  const transcribe = (await query("SELECT transcribe_audio FROM ai_settings WHERE id = 1")).rows[0]?.transcribe_audio !== false
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
    const content = await readContent(baileys, sock, msg, query, conversationId, transcribe)
    if (!content) continue
    const inserted = await query(`INSERT INTO wa_messages (conversation_id, wa_id, direction, author, author_name, kind, body, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9)) ON CONFLICT DO NOTHING RETURNING id`,
      [conversationId, waId, fromMe ? "out" : "in", fromMe ? "staff" : "customer", fromMe ? "Desde el teléfono" : conversation.name, content.kind, content.body,
        fromMe ? "sent" : "received", Number(msg.messageTimestamp ?? Date.now() / 1000)])
    if (!inserted.rows[0]) continue
    const messageId = Number(inserted.rows[0].id)
    if (content.media) {
      const media = await query(`INSERT INTO wa_media (message_id, mime, size, seconds, data, file_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [messageId, content.media.mime, content.media.buffer.length, content.media.seconds, content.media.buffer, content.media.fileName ?? ""])
      await query("UPDATE wa_messages SET media_id = $2 WHERE id = $1", [messageId, media.rows[0].id])
    }
    await query(`UPDATE wa_conversations SET last_message = $2, last_message_at = NOW(), unread = unread + $3, updated_at = NOW() WHERE id = $1`,
      [conversationId, content.body.slice(0, 200), fromMe ? 0 : 1])
    // La ubicación compartida queda en el pedido en curso: es la referencia para el delivery.
    if (content.location && !fromMe) await query("UPDATE wa_conversations SET cart = cart || jsonb_build_object('location', $2::jsonb) WHERE id = $1",
      [conversationId, JSON.stringify(content.location)])
    if (fromMe) continue
    void refreshAvatar(query, sock, conversationId, [jid, msg.key.remoteJidAlt]).catch(() => undefined)
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
  const conversation = (await query("SELECT bot_enabled, handoff_requested, assigned_name FROM wa_conversations WHERE id = $1", [conversationId])).rows[0]
  const settings = (await query("SELECT enabled, resume_after_minutes FROM ai_settings WHERE id = 1")).rows[0]
  // Chat tomado por el personal: si nadie del local respondió en el tiempo configurado, vuelve al asistente
  // (no cuando el cliente pidió hablar con una persona).
  const resumeAfter = Number(settings?.resume_after_minutes ?? 30)
  if (conversation && !conversation.bot_enabled && !conversation.handoff_requested && settings?.enabled && niroConfigured() && resumeAfter > 0) {
    const staff = (await query(`SELECT MAX(created_at) AS at FROM wa_messages WHERE conversation_id = $1 AND direction = 'out' AND author IN ('staff', 'system')
      AND NOT (author = 'system' AND body LIKE 'La conversación volvió al asistente%')`, [conversationId])).rows[0]?.at
    const idle = !staff || Date.now() - new Date(staff).getTime() > resumeAfter * 60_000
    if (idle) {
      await query("UPDATE wa_conversations SET bot_enabled = TRUE, assigned_user_id = NULL, assigned_name = '', updated_at = NOW() WHERE id = $1", [conversationId])
      await query(`INSERT INTO wa_messages (conversation_id, direction, author, author_name, body, status) VALUES ($1, 'out', 'system', 'Asistente', $2, 'simulated')`,
        [conversationId, `La conversación volvió al asistente (nadie del local respondió en ${resumeAfter >= 60 ? `${resumeAfter / 60} h` : `${resumeAfter} min`}).`])
      conversation.bot_enabled = true
    }
  }
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
