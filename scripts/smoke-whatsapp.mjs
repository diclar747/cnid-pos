// Prueba de las APIs de WhatsApp: estado, permisos, bandeja, tomar/devolver la conversación, responder sin conexión,
// simulador sin NIRO_API_KEY y configuración del asistente.
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000) con WhatsApp desconectado.
import fs from "node:fs/promises"
import { randomBytes, scryptSync } from "node:crypto"
import pg from "pg"

const origin = process.env.POS_ORIGIN ?? "http://127.0.0.1:3000"
const env = await fs.readFile(".env.local", "utf8").catch(() => "")
const db = new pg.Client({ connectionString: process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() })
await db.connect()
const check = (condition, message) => { if (!condition) throw new Error(message) }
const session = () => {
  let cookie = ""
  return async (path, method = "GET", body) => {
    const response = await fetch(origin + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const token = response.headers.get("set-cookie")?.split(";")[0]
    if (token) cookie = token
    return { status: response.status, body: await response.json().catch(() => ({})) }
  }
}
const hash = (password) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}` }
const suffix = randomBytes(4).toString("hex")
const created = { users: [], conversations: [] }
const before = (await db.query("SELECT enabled, instructions, greeting FROM ai_settings WHERE id = 1")).rows[0]
try {
  for (const [role, perms] of [["admin", ["access_pos", "manage_company", "manage_sales"]], ["waiter", ["access_pos", "take_orders"]]]) {
    const r = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id) VALUES ($1,$2,$3,$4,$5,$6,1) RETURNING id`,
      [`wa-${role}-${suffix}@prueba.test`, `wa_${role}_${suffix}`, `WA ${role}`, role, perms, hash("Prueba-2026!")])
    created.users.push(Number(r.rows[0].id))
  }
  const admin = session(), waiter = session(), anonymous = session()
  check((await admin("/api/auth/login", "POST", { email: `wa-admin-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login admin")
  check((await waiter("/api/auth/login", "POST", { email: `wa-waiter-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login mesero")
  check((await anonymous("/api/whatsapp")).status === 401, "Sin sesión")
  const status = await admin("/api/whatsapp")
  check(status.status === 200 && typeof status.body.session.status === "string" && status.body.canManage === true, "Estado para la administración")
  const waiterStatus = await waiter("/api/whatsapp")
  check(waiterStatus.body.canManage === false && waiterStatus.body.session.qr === null && waiterStatus.body.logs.length === 0, "El mesero no ve QR ni registros")
  check((await waiter("/api/whatsapp/session", "POST", { action: "connect" })).status === 403, "El mesero no conecta WhatsApp")
  check((await admin("/api/whatsapp/session", "POST", { action: "nada" })).status === 400, "Acción inválida")

  // Configuración del asistente.
  check((await waiter("/api/whatsapp/ai", "PUT", { enabled: true })).status === 403, "El mesero no configura la IA")
  check((await admin("/api/whatsapp/ai", "PUT", { greeting: `Hola ${suffix}`, instructions: "Recomendá el menú del día." })).status === 200, "Guardar asistente")
  check((await admin("/api/whatsapp")).body.ai.greeting === `Hola ${suffix}`, "Saludo guardado")
  if (!status.body.ai.configured) check((await admin("/api/whatsapp/simulate", "POST", { message: "Hola" })).status === 503, "Simulador sin NIRO_API_KEY")

  // Bandeja: conversación con un mensaje del cliente.
  const conversation = await db.query(`INSERT INTO wa_conversations (jid, phone, name, unread, last_message, last_message_at) VALUES ($1, $2, $3, 1, 'Hola', NOW()) RETURNING id`,
    [`595981${suffix.slice(0, 6).replace(/\D/g, "2").padEnd(6, "2")}@s.whatsapp.net`, `595981${suffix.slice(0, 6).replace(/\D/g, "2").padEnd(6, "2")}`, `Cliente ${suffix}`])
  const id = Number(conversation.rows[0].id)
  created.conversations.push(id)
  await db.query("INSERT INTO wa_messages (conversation_id, wa_id, direction, author, author_name, body, status) VALUES ($1, $2, 'in', 'customer', $3, 'Hola', 'received')", [id, `T-${suffix}`, `Cliente ${suffix}`])
  const list = await waiter(`/api/whatsapp/conversations?q=${suffix}`)
  check(list.body.items.length === 1 && list.body.items[0].unread === 1, "La conversación aparece en la bandeja")
  const detail = await waiter(`/api/whatsapp/conversations/${id}`)
  check(detail.status === 200 && detail.body.messages.length === 1, "Detalle con mensajes")
  check((await waiter(`/api/whatsapp/conversations?q=${suffix}`)).body.items[0].unread === 0, "Al abrirla se marca leída")
  check((await waiter(`/api/whatsapp/conversations/${id}`, "POST", { action: "take" })).status === 200, "Tomar conversación")
  let row = (await db.query("SELECT bot_enabled, assigned_name FROM wa_conversations WHERE id = $1", [id])).rows[0]
  check(row.bot_enabled === false && row.assigned_name === "WA waiter", "El asistente se pausa y queda quién atiende")
  check((await waiter(`/api/whatsapp/conversations/${id}`, "POST", { action: "send", text: "" })).status === 400, "Mensaje vacío")
  if (status.body.session.status !== "connected") {
    const send = await waiter(`/api/whatsapp/conversations/${id}`, "POST", { action: "send", text: "Ya te atiendo" })
    check(send.status === 409, "Sin conexión el mensaje no se envía y se avisa")
    check((await db.query("SELECT status FROM wa_messages WHERE conversation_id = $1 AND author = 'staff'", [id])).rows[0]?.status === "failed", "Queda guardado como no enviado")
  }
  check((await waiter(`/api/whatsapp/conversations/${id}`, "POST", { action: "release" })).status === 200, "Devolver al asistente")
  row = (await db.query("SELECT bot_enabled, handoff_requested FROM wa_conversations WHERE id = $1", [id])).rows[0]
  check(row.bot_enabled === true && row.handoff_requested === false, "Vuelve al asistente")
  check((await waiter("/api/whatsapp/conversations/999999999")).status === 404, "Conversación inexistente")
  console.log("OK: WhatsApp: estado y permisos, configuración del asistente, bandeja, leer, tomar, responder sin conexión y devolver al asistente")
} finally {
  await db.query("UPDATE ai_settings SET enabled = $1, instructions = $2, greeting = $3 WHERE id = 1", [before.enabled, before.instructions, before.greeting])
  for (const id of created.conversations) await db.query("DELETE FROM wa_conversations WHERE id = $1", [id])
  if (created.users.length) { await db.query("DELETE FROM public.app_sessions WHERE user_id = ANY($1::bigint[])", [created.users]); await db.query("DELETE FROM public.app_users WHERE id = ANY($1::bigint[])", [created.users]) }
  await db.end()
}
