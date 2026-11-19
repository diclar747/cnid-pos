// Prueba de la ficha del contacto en WhatsApp: etiqueta del pedido en la bandeja (por conversación o por teléfono),
// mesa en la que está, etapas (nuevo, pendiente, en cocina, servido…) y que un envío fallido no pause el asistente.
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
const local = `0971${String(parseInt(suffix, 16) % 1000000).padStart(6, "0")}` // así lo carga el POS
const phone = `595${local.slice(1)}` // así llega por WhatsApp
const created = { users: [], conversations: [], orders: [], customers: [] }
const line = (name, ticketId = null) => ({ lineId: randomBytes(4).toString("hex"), productId: 1, productName: name, quantity: 1, price: 10000, subtotal: 10000, modifiers: [], stockReserved: false, ticketId })
try {
  const user = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id) VALUES ($1,$2,'WA ficha','admin',$3,$4,1) RETURNING id`,
    [`wa-ficha-${suffix}@prueba.test`, `wa_ficha_${suffix}`, ["access_pos", "manage_company"], hash("Prueba-2026!")])
  created.users.push(Number(user.rows[0].id))
  const admin = session()
  check((await admin("/api/auth/login", "POST", { email: `wa-ficha-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login")

  const conversation = await db.query(`INSERT INTO wa_conversations (jid, phone, name, last_message, last_message_at) VALUES ($1, $2, $3, 'Hola', NOW()) RETURNING id`,
    [`${phone}@s.whatsapp.net`, phone, `Ficha ${suffix}`])
  const id = Number(conversation.rows[0].id)
  created.conversations.push(id)
  const listItem = async () => (await admin(`/api/whatsapp/conversations?q=${suffix}`)).body.items?.[0]
  check((await listItem()).order === null, "Sin pedidos no hay etiqueta")
  let profile = (await admin(`/api/whatsapp/conversations/${id}`)).body.profile
  check(profile && profile.orders.length === 0 && profile.customer === null && profile.activeOrders === 0, "Ficha vacía")

  // Pedido en la mesa cargado desde el POS con el teléfono en formato local, enviado a cocina y en preparación.
  const customer = await db.query("INSERT INTO customers (name, phone, ruc, address) VALUES ($1, $2, '80000001-1', 'Calle de prueba 123') RETURNING id", [`Cliente ${suffix}`, phone])
  created.customers.push(Number(customer.rows[0].id))
  const table = await db.query(`INSERT INTO service_orders (status, order_type, table_label, customer_name, customer_phone, items, total, source, confirmation)
    VALUES ('open', 'dineIn', 'Mesa 6', $1, $2, $3::jsonb, 20000, 'pos', 'confirmed') RETURNING id`, [`Cliente ${suffix}`, local, JSON.stringify([line("Milanesa", 0), line("Gaseosa", 0)])])
  const tableId = Number(table.rows[0].id)
  created.orders.push(tableId)
  const ticket = await db.query("INSERT INTO kitchen_tickets (order_id, status, items) VALUES ($1, 'preparing', '[]'::jsonb) RETURNING id", [tableId])
  await db.query("UPDATE service_orders SET items = (SELECT JSONB_AGG(item || JSONB_BUILD_OBJECT('ticketId', $2::bigint)) FROM JSONB_ARRAY_ELEMENTS(items) item) WHERE id = $1", [tableId, ticket.rows[0].id])
  let item = await listItem()
  check(item.order?.orderId === tableId && item.order.stage === "kitchen" && item.order.label === "En cocina" && item.order.tableLabel === "Mesa 6", "Etiqueta «En cocina» con la mesa (por teléfono)")
  profile = (await admin(`/api/whatsapp/conversations/${id}`)).body.profile
  check(profile.tables.includes("Mesa 6") && profile.activeOrders === 1, "La ficha muestra la mesa")
  check(profile.customer?.ruc === "80000001-1" && profile.customer.address === "Calle de prueba 123", "Datos del cliente")
  check(profile.orders[0].tickets[0].status === "preparing" && profile.orders[0].items.length === 2, "Comanda y productos del pedido")

  // Pedido nuevo por WhatsApp (sin teléfono, vinculado a la conversación): queda como «Nuevo · por confirmar».
  const web = await db.query(`INSERT INTO service_orders (status, order_type, customer_name, items, total, source, confirmation, wa_conversation_id)
    VALUES ('open', 'delivery', $1, $2::jsonb, 10000, 'whatsapp', 'pending', $3) RETURNING id`, [`Cliente ${suffix}`, JSON.stringify([line("Pizza")]), id])
  const webId = Number(web.rows[0].id)
  created.orders.push(webId)
  item = await listItem()
  check(item.order?.orderId === webId && item.order.stage === "new" && item.order.label === "Nuevo · por confirmar" && item.order.active === 2, "Muestra el pedido más nuevo y cuántos hay en curso")

  // La mesa se sirve y se cobra; el delivery se rechaza: quedan «Servido» y «Cancelado», sin pedidos en curso.
  await db.query("UPDATE kitchen_tickets SET status = 'served' WHERE order_id = $1", [tableId])
  await db.query("UPDATE service_orders SET status = 'paid', updated_at = NOW() WHERE id = $1", [tableId])
  await db.query("UPDATE service_orders SET status = 'cancelled', confirmation = 'rejected', updated_at = NOW() WHERE id = $1", [webId])
  profile = (await admin(`/api/whatsapp/conversations/${id}`)).body.profile
  const byId = new Map(profile.orders.map((order) => [order.id, order]))
  check(byId.get(tableId)?.stageLabel === "Servido" && byId.get(webId)?.stage === "cancelled" && profile.activeOrders === 0 && profile.tables.length === 0, "Servido y cancelado, sin mesa")
  item = await listItem()
  check(item.order?.active === 0 && item.order.orderId === webId, "Sin pedidos en curso: queda la etiqueta del último")

  // Un envío fallido (WhatsApp desconectado) no pausa el asistente.
  const status = (await admin("/api/whatsapp")).body
  check(typeof status.ai.resumeAfterMinutes === "number", "Tiempo para volver al asistente")
  if (status.session.status !== "connected") {
    check((await admin(`/api/whatsapp/conversations/${id}`, "POST", { action: "send", text: "Hola" })).status === 409, "Sin conexión no se envía")
    check((await db.query("SELECT bot_enabled FROM wa_conversations WHERE id = $1", [id])).rows[0].bot_enabled === true, "El asistente sigue activo tras un envío fallido")
  }
  const before = status.ai.resumeAfterMinutes
  check((await admin("/api/whatsapp/ai", "PUT", { resumeAfterMinutes: 15 })).status === 200 && (await admin("/api/whatsapp")).body.ai.resumeAfterMinutes === 15, "Guardar el tiempo")
  await admin("/api/whatsapp/ai", "PUT", { resumeAfterMinutes: before })
  console.log("OK: WhatsApp ficha: etiqueta del pedido por conversación y por teléfono, mesa, comandas, servido/cancelado, datos del cliente y envío fallido sin pausar el asistente")
} finally {
  for (const id of created.orders) { await db.query("DELETE FROM kitchen_tickets WHERE order_id = $1", [id]); await db.query("DELETE FROM order_events WHERE order_id = $1", [id]).catch(() => undefined); await db.query("DELETE FROM service_orders WHERE id = $1", [id]) }
  for (const id of created.customers) await db.query("DELETE FROM customers WHERE id = $1", [id])
  for (const id of created.conversations) await db.query("DELETE FROM wa_conversations WHERE id = $1", [id])
  if (created.users.length) { await db.query("DELETE FROM public.app_sessions WHERE user_id = ANY($1::bigint[])", [created.users]); await db.query("DELETE FROM public.app_users WHERE id = ANY($1::bigint[])", [created.users]) }
  await db.end()
}
