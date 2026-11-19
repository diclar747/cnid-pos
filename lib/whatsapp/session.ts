import "server-only"

import { authDb, schemaQuery, type SchemaQuery } from "../db"
import { registerWhatsAppNotifier } from "../order-flow"

// Administrador de sesiones de WhatsApp (Baileys): una sesión independiente por restaurante (esquema).
// Las credenciales se guardan en la base del restaurante (whatsapp_auth), nunca en disco.
// Baileys es una integración no oficial de WhatsApp Web: este módulo puede reemplazarse por la API oficial
// manteniendo las mismas funciones (startSession, stopSession, sendText).

type Baileys = typeof import("@whiskeysockets/baileys")
type Socket = ReturnType<Baileys["default"]>
type Runtime = { sock: Socket | null; stopping: boolean; retries: number; qrCount: number; registered: boolean; timer: ReturnType<typeof setTimeout> | null; starting: Promise<void> | null }

declare global {
  var restoposWhatsApp: Map<string, Runtime> | undefined
  var restoposBaileys: Promise<Baileys> | undefined
}
const runtimes = () => (globalThis.restoposWhatsApp ??= new Map())
const loadBaileys = () => (globalThis.restoposBaileys ??= import("@whiskeysockets/baileys"))
const validSchema = (schema: string) => /^(public|restaurant_[0-9]+)$/.test(schema)

// Logger mínimo compatible con Baileys: solo deja pasar errores.
const quietLogger: any = { level: "error", child() { return quietLogger }, trace() {}, debug() {}, info() {}, warn() {},
  error(obj: unknown, msg?: string) { if (process.env.WHATSAPP_DEBUG === "1") console.error("[whatsapp]", msg ?? "", obj) } }

export async function logSession(query: SchemaQuery, event: string, detail = "") {
  await query("INSERT INTO whatsapp_session_log (event, detail) VALUES ($1, $2)", [event, detail.slice(0, 500)]).catch(() => undefined)
}

async function updateSession(query: SchemaQuery, fields: Record<string, unknown>) {
  const keys = Object.keys(fields)
  await query(`UPDATE whatsapp_session SET ${keys.map((key, index) => `${key} = $${index + 1}`).join(", ")}, updated_at = NOW() WHERE id = 1`, keys.map((key) => fields[key]))
}

/** Estado de autenticación de Baileys guardado en PostgreSQL. */
async function databaseAuthState(query: SchemaQuery, baileys: Baileys) {
  const { BufferJSON, initAuthCreds, proto } = baileys
  const read = async (key: string) => {
    const row = (await query("SELECT value FROM whatsapp_auth WHERE key = $1", [key])).rows[0]
    return row ? JSON.parse(row.value, BufferJSON.reviver) : null
  }
  const write = async (entries: [string, unknown][]) => {
    const upserts = entries.filter(([, value]) => value != null)
    const removals = entries.filter(([, value]) => value == null).map(([key]) => key)
    if (upserts.length) await query(`INSERT INTO whatsapp_auth (key, value) SELECT * FROM UNNEST($1::text[], $2::text[])
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, [upserts.map(([key]) => key), upserts.map(([, value]) => JSON.stringify(value, BufferJSON.replacer))])
    if (removals.length) await query("DELETE FROM whatsapp_auth WHERE key = ANY($1::text[])", [removals])
  }
  const creds = (await read("creds")) ?? initAuthCreds()
  return {
    state: {
      creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const rows = ids.length ? (await query("SELECT key, value FROM whatsapp_auth WHERE key = ANY($1::text[])", [ids.map((id) => `${type}-${id}`)])).rows : []
          const found = new Map(rows.map((row) => [row.key as string, row.value as string]))
          const data: Record<string, unknown> = {}
          for (const id of ids) {
            const raw = found.get(`${type}-${id}`)
            let value = raw ? JSON.parse(raw, BufferJSON.reviver) : undefined
            if (type === "app-state-sync-key" && value) value = proto.Message.AppStateSyncKeyData.fromObject(value)
            data[id] = value
          }
          return data
        },
        set: async (data: Record<string, Record<string, unknown>>) => {
          const entries: [string, unknown][] = []
          for (const category of Object.keys(data)) for (const id of Object.keys(data[category])) entries.push([`${category}-${id}`, data[category][id]])
          await write(entries)
        },
      },
    },
    saveCreds: () => write([["creds", creds]]),
  }
}

function runtime(schema: string): Runtime {
  let entry = runtimes().get(schema)
  if (!entry) { entry = { sock: null, stopping: false, retries: 0, qrCount: 0, registered: false, timer: null, starting: null }; runtimes().set(schema, entry) }
  return entry
}

export function sessionSocket(schema: string) { return runtimes().get(schema)?.sock ?? null }

/** Inicia (o reanuda) la sesión del restaurante. Si no hay credenciales, WhatsApp emite un QR para vincular el teléfono. */
export async function startSession(schema: string): Promise<void> {
  if (!validSchema(schema)) throw new Error("Esquema inválido.")
  const state = runtime(schema)
  if (state.sock || state.starting) return state.starting ?? undefined
  if (state.timer) { clearTimeout(state.timer); state.timer = null }
  state.stopping = false
  state.starting = (async () => {
    const query = await schemaQuery(schema)
    const baileys = await loadBaileys()
    const { default: makeWASocket, Browsers, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidDecode,
      isJidGroup, isJidBroadcast, isJidStatusBroadcast, isJidNewsletter } = baileys
    await updateSession(query, { enabled: true, status: "connecting", last_error: "" })
    const { state: auth, saveCreds } = await databaseAuthState(query, baileys)
    state.registered = Boolean(auth.creds.registered)
    const version = await fetchLatestBaileysVersion().then((result) => result.version).catch(() => undefined)
    const sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: { creds: auth.creds, keys: makeCacheableSignalKeyStore(auth.keys as any, quietLogger) },
      logger: quietLogger,
      browser: Browsers.ubuntu("RestoPOS"),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      shouldIgnoreJid: (jid: string) => Boolean(isJidGroup(jid) || isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid)),
      getMessage: async () => undefined,
    })
    state.sock = sock
    state.qrCount = 0
    sock.ev.on("creds.update", () => { void saveCreds().catch((error) => console.error("WhatsApp: no se guardaron las credenciales", error)) })
    sock.ev.on("connection.update", (update: any) => {
      void (async () => {
        if (update.qr) {
          state.qrCount += 1
          // Cada QR dura unos 20 s. Si nadie lo escanea en ~2 minutos, se detiene para no quedar en bucle.
          if (state.qrCount > 6) { await stopSession(schema, { reason: "qr_timeout" }); return }
          await updateSession(query, { status: "qr", qr: update.qr, qr_at: new Date() })
          if (state.qrCount === 1) await logSession(query, "qr", "Esperando que se escanee el código QR")
        }
        if (update.connection === "open") {
          state.retries = 0
          state.registered = true
          const me = sock.user
          const phone = me?.id ? jidDecode(me.id)?.user ?? "" : ""
          await updateSession(query, { status: "connected", qr: null, qr_at: null, phone, push_name: me?.name ?? "", connected_at: new Date(), last_error: "" })
          await logSession(query, "connected", phone ? `Conectado como +${phone}` : "Conectado")
        }
        if (update.connection === "close") {
          if (state.sock === sock) state.sock = null
          const code = Number(update.lastDisconnect?.error?.output?.statusCode ?? 0)
          const reason = String(update.lastDisconnect?.error?.message ?? "")
          if (state.stopping) return
          if (code === DisconnectReason.loggedOut) {
            await query("DELETE FROM whatsapp_auth")
            await updateSession(query, { enabled: false, status: "logged_out", qr: null, phone: "", push_name: "", last_error: "La sesión se cerró desde el teléfono." })
            await logSession(query, "logged_out", "Se desvinculó el dispositivo desde WhatsApp")
            return
          }
          if (code === DisconnectReason.connectionReplaced) {
            await updateSession(query, { enabled: false, status: "error", qr: null, last_error: "La sesión se abrió en otro lugar. Volvé a conectar desde acá." })
            await logSession(query, "replaced", "Otra conexión tomó la sesión")
            return
          }
          if (!state.registered && code !== DisconnectReason.restartRequired) {
            await updateSession(query, { enabled: false, status: "disconnected", qr: null, last_error: "No se completó la vinculación." })
            await logSession(query, "pairing_failed", reason || `Código ${code}`)
            return
          }
          const delay = code === DisconnectReason.restartRequired ? 500 : Math.min(60_000, 2000 * 2 ** state.retries++)
          await updateSession(query, { status: "connecting", last_error: reason ? `Reconectando: ${reason}`.slice(0, 200) : "" })
          await logSession(query, "reconnect", `Código ${code || "?"} · reintento en ${Math.round(delay / 1000)} s`)
          state.timer = setTimeout(() => { state.timer = null; void startSession(schema).catch((error) => console.error("WhatsApp: no se pudo reconectar", error)) }, delay)
        }
      })().catch((error) => console.error("WhatsApp: error de conexión", error))
    })
    sock.ev.on("messages.upsert", (event: any) => {
      void import("./inbox").then(({ handleUpsert }) => handleUpsert(schema, sock, event)).catch((error) => console.error("WhatsApp: error al procesar mensajes", error))
    })
  })().catch(async (error) => {
    state.sock = null
    const query = await schemaQuery(schema)
    await updateSession(query, { status: "error", last_error: (error instanceof Error ? error.message : String(error)).slice(0, 300) }).catch(() => undefined)
    await logSession(query, "error", error instanceof Error ? error.message : String(error))
    throw error
  }).finally(() => { state.starting = null })
  return state.starting
}

/** Detiene la sesión. Con logout también desvincula el dispositivo y borra las credenciales. */
export async function stopSession(schema: string, options: { logout?: boolean; reason?: string } = {}) {
  const state = runtime(schema)
  state.stopping = true
  if (state.timer) { clearTimeout(state.timer); state.timer = null }
  const sock = state.sock
  state.sock = null
  const query = await schemaQuery(schema)
  if (sock) {
    if (options.logout) await sock.logout().catch(() => undefined)
    else sock.end(undefined)
  }
  if (options.logout) await query("DELETE FROM whatsapp_auth")
  const timeout = options.reason === "qr_timeout"
  await updateSession(query, { enabled: false, status: options.logout ? "logged_out" : "disconnected", qr: null, qr_at: null,
    ...(options.logout ? { phone: "", push_name: "" } : {}), last_error: timeout ? "El código QR venció. Tocá «Conectar» para generar otro." : "" })
  await logSession(query, options.logout ? "logout" : timeout ? "qr_timeout" : "stopped", options.logout ? "Dispositivo desvinculado" : timeout ? "Nadie escaneó el QR" : "Sesión detenida")
}

export type SendMeta = { author: "bot" | "staff" | "system"; authorName?: string; orderId?: number | null }

/** Envía un texto y lo guarda en la conversación. Devuelve false si la sesión no está conectada. */
export async function sendText(schema: string, conversationId: number, text: string, meta: SendMeta): Promise<boolean> {
  const query = await schemaQuery(schema)
  const conversation = (await query("SELECT jid FROM wa_conversations WHERE id = $1", [conversationId])).rows[0]
  if (!conversation) return false
  const body = text.slice(0, 4000)
  const sock = sessionSocket(schema)
  let waId: string | null = null
  let status: "sent" | "failed" | "simulated" = "failed"
  if (conversation.jid.startsWith("simulator:")) status = "simulated"
  else if (sock) {
    try { waId = (await sock.sendMessage(conversation.jid, { text: body }))?.key?.id ?? null; status = "sent" }
    catch (error) { console.error("WhatsApp: no se pudo enviar", error instanceof Error ? error.message : error) }
  }
  await query(`INSERT INTO wa_messages (conversation_id, wa_id, direction, author, author_name, kind, body, status, order_id)
    VALUES ($1, $2, 'out', $3, $4, 'text', $5, $6, $7) ON CONFLICT DO NOTHING`, [conversationId, waId, meta.author, meta.authorName ?? "", body, status, meta.orderId ?? null])
  await query("UPDATE wa_conversations SET last_message = $2, last_message_at = NOW(), updated_at = NOW() WHERE id = $1", [conversationId, body.slice(0, 200)])
  return status !== "failed"
}

export type OutgoingMedia = { kind: "image" | "video" | "document" | "audio"; buffer: Buffer; mime: string; fileName?: string; caption?: string; seconds?: number | null; voice?: boolean }

/** Envía un adjunto por WhatsApp y lo guarda en la conversación (con el archivo, para verlo en el chat). */
export async function sendMedia(schema: string, conversationId: number, media: OutgoingMedia, meta: SendMeta): Promise<boolean> {
  const query = await schemaQuery(schema)
  const conversation = (await query("SELECT jid FROM wa_conversations WHERE id = $1", [conversationId])).rows[0]
  if (!conversation) return false
  const caption = (media.caption ?? "").slice(0, 1000)
  const sock = sessionSocket(schema)
  let waId: string | null = null
  let status: "sent" | "failed" | "simulated" = "failed"
  const content = media.kind === "image" ? { image: media.buffer, mimetype: media.mime, caption: caption || undefined }
    : media.kind === "video" ? { video: media.buffer, mimetype: media.mime, caption: caption || undefined }
    : media.kind === "audio" ? { audio: media.buffer, mimetype: media.voice ? "audio/ogg; codecs=opus" : media.mime, ptt: Boolean(media.voice), seconds: media.seconds ?? undefined }
    : { document: media.buffer, mimetype: media.mime, fileName: media.fileName || "archivo", caption: caption || undefined }
  if (conversation.jid.startsWith("simulator:")) status = "simulated"
  else if (sock) {
    try { waId = (await sock.sendMessage(conversation.jid, content as any))?.key?.id ?? null; status = "sent" }
    catch (error) { console.error("WhatsApp: no se pudo enviar el adjunto", error instanceof Error ? error.message : error) }
  }
  const label = media.kind === "image" ? "🖼️ [imagen]" : media.kind === "video" ? "🎬 [video]" : media.kind === "audio" ? "🎤 [audio]" : `📄 ${media.fileName || "archivo"}`
  const body = caption ? `${label} ${caption}` : label
  const inserted = await query(`INSERT INTO wa_messages (conversation_id, wa_id, direction, author, author_name, kind, body, status, order_id)
    VALUES ($1, $2, 'out', $3, $4, $5, $6, $7, $8) RETURNING id`, [conversationId, waId, meta.author, meta.authorName ?? "", media.kind, body, status, meta.orderId ?? null])
  const stored = await query(`INSERT INTO wa_media (message_id, mime, size, seconds, data, file_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [inserted.rows[0].id, media.mime, media.buffer.length, media.seconds ?? null, media.buffer, media.fileName ?? ""])
  await query("UPDATE wa_messages SET media_id = $2 WHERE id = $1", [inserted.rows[0].id, stored.rows[0].id])
  await query("UPDATE wa_conversations SET last_message = $2, last_message_at = NOW(), updated_at = NOW() WHERE id = $1", [conversationId, body.slice(0, 200)])
  return status !== "failed"
}

/** Conversación de un número (la crea si no existe). */
export async function conversationForPhone(query: SchemaQuery, phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 8) return null
  const existing = (await query("SELECT id FROM wa_conversations WHERE phone = $1 ORDER BY last_message_at DESC NULLS LAST LIMIT 1", [digits])).rows[0]
  if (existing) return Number(existing.id)
  const created = await query(`INSERT INTO wa_conversations (jid, phone) VALUES ($1, $2) ON CONFLICT (jid) DO UPDATE SET phone = EXCLUDED.phone RETURNING id`,
    [`${digits}@s.whatsapp.net`, digits])
  return Number(created.rows[0].id)
}

// Avisos de estado de pedidos que llegaron por WhatsApp (los usa notifyCustomer).
registerWhatsAppNotifier(async (schema, phone, text, orderId) => {
  if (!sessionSocket(schema)) return
  const query = await schemaQuery(schema)
  const linked = (await query("SELECT wa_conversation_id FROM service_orders WHERE id = $1", [orderId])).rows[0]?.wa_conversation_id
  const conversationId = linked ? Number(linked) : await conversationForPhone(query, phone)
  if (conversationId) await sendText(schema, conversationId, text, { author: "system", authorName: "Avisos", orderId })
})

/** Al iniciar el servidor: reanuda las sesiones de los restaurantes que tenían WhatsApp conectado. */
export async function bootSessions() {
  const schemas = (await authDb.query("SELECT schema_name FROM public.restaurants WHERE status = 'active'")).rows.map((row) => String(row.schema_name)).filter(validSchema)
  for (const schema of schemas) {
    try {
      const query = await schemaQuery(schema)
      const row = (await query("SELECT enabled FROM whatsapp_session WHERE id = 1")).rows[0]
      if (row?.enabled) await startSession(schema)
    } catch (error) { console.error(`WhatsApp: no se pudo reanudar ${schema}`, error instanceof Error ? error.message : error) }
  }
}
