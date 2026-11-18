// Prueba del tablero CRM: columnas según estados reales, confirmación, cocina (prioridad, demora y falta),
// avance por el flujo, cancelación, búsqueda, filtro por origen y eventos en vivo (SSE).
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000). Crea registros temporales y los elimina.
import fs from "node:fs/promises"
import { randomBytes, scryptSync } from "node:crypto"
import pg from "pg"

const origin = process.env.POS_ORIGIN ?? "http://127.0.0.1:3000"
const env = await fs.readFile(".env.local", "utf8").catch(() => "")
const db = new pg.Client({ connectionString: process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() })
await db.connect()
const check = (condition, message) => { if (!condition) throw new Error(message) }
let cookie = ""
const api = async (path, method = "GET", body) => {
  const response = await fetch(origin + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const token = response.headers.get("set-cookie")?.split(";")[0]
  if (token) cookie = token
  return { status: response.status, body: await response.json().catch(() => ({})) }
}
const hash = (password) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}` }
const suffix = randomBytes(4).toString("hex")
const created = { users: [], products: [], orders: [] }
const stageOf = async (id) => (await api(`/api/crm?q=${id}`)).body.items.find((item) => item.order.id === id)

try {
  const user = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id) VALUES ($1,$2,'CRM prueba','admin',$3,$4,1) RETURNING id`,
    [`crm-${suffix}@prueba.test`, `crm_${suffix}`, ["access_pos", "take_orders", "manage_sales", "manage_products"], hash("Prueba-2026!")])
  created.users.push(Number(user.rows[0].id))
  check((await api("/api/auth/login", "POST", { email: `crm-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login")
  const product = await api("/api/data/products", "POST", { name: `Plato CRM ${suffix}`, price: 40000, category: "Pruebas", image: "", stock: 0, trackStock: false, barcode: `CRM-${suffix}`, description: "", isActive: true })
  created.products.push(product.body.item.id)

  // Eventos en vivo: abrimos el canal antes de operar.
  const controller = new AbortController()
  const stream = await fetch(origin + "/api/events", { headers: { cookie }, signal: controller.signal })
  check(stream.status === 200 && stream.headers.get("content-type")?.includes("text/event-stream"), "Canal de eventos")
  let received = ""
  const reader = stream.body.getReader(); const decoder = new TextDecoder()
  void (async () => { for (;;) { const { value, done } = await reader.read(); if (done) break; received += decoder.decode(value) } })().catch(() => undefined)

  // Pedido remoto: entra en «Nuevos».
  const remote = await api("/api/service-orders", "POST", { orderType: "pickup", customerName: `Cliente CRM ${suffix}`, customerPhone: "0981 555 123", items: [{ id: product.body.item.id, quantity: 2 }] })
  check(remote.status === 201, `Pedido remoto: ${remote.status}`)
  const remoteId = remote.body.order.id
  created.orders.push(remoteId)
  await db.query("UPDATE service_orders SET confirmation = 'pending', source = 'whatsapp' WHERE id = $1", [remoteId])
  check((await stageOf(remoteId)).stage === "new", "Nuevo pedido en «Nuevos»")
  await new Promise((resolve) => setTimeout(resolve, 1200))
  check(/event: change/.test(received) && received.includes("service_orders"), `Evento en vivo: ${received.slice(0, 200)}`)

  check((await api(`/api/service-orders/${remoteId}`, "PATCH", { action: "confirm", sendToKitchen: true })).status === 200, "Confirmar y enviar")
  let item = await stageOf(remoteId)
  check(item.stage === "confirmed" && item.tickets.length === 1 && item.tickets[0].status === "pending", `Confirmado: ${item.stage}`)
  const ticketId = item.tickets[0].id

  // Avisos de cocina.
  check((await api(`/api/kitchen-tickets/${ticketId}`, "PATCH", { status: "ready" })).status === 409, "No se saltea la preparación")
  check((await api(`/api/kitchen-tickets/${ticketId}`, "POST", { action: "priority", priority: "high" })).body.ticket.priority === "high", "Prioridad")
  check((await api(`/api/kitchen-tickets/${ticketId}`, "POST", { action: "delay", minutes: 0 })).status === 400, "Demora inválida")
  check((await api(`/api/kitchen-tickets/${ticketId}`, "POST", { action: "delay", minutes: 15, note: "Mucho movimiento" })).body.ticket.delayMinutes === 15, "Demora")
  check((await api(`/api/kitchen-tickets/${ticketId}`, "POST", { action: "missing" })).status === 400, "Falta sin detalle")
  check((await api(`/api/kitchen-tickets/${ticketId}`, "POST", { action: "missing", note: "queso cheddar" })).status === 200, "Falta de producto")
  const history = (await api(`/api/service-orders/${remoteId}/history`)).body.items.map((event) => event.event)
  check(["confirmed", "sent_to_kitchen", "priority", "delay", "missing"].every((event) => history.includes(event)), `Historial: ${history}`)

  // Avance por el flujo hasta «Entregados».
  check((await api(`/api/kitchen-tickets/${ticketId}`, "PATCH", { status: "preparing" })).status === 200, "Cocina acepta")
  check((await stageOf(remoteId)).stage === "kitchen", "En cocina")
  check((await api(`/api/kitchen-tickets/${ticketId}`, "PATCH", { status: "ready" })).status === 200, "Listo")
  item = await stageOf(remoteId)
  check(item.stage === "ready" && item.tickets[0].delayMinutes === null, "Listo y sin demora pendiente")
  check((await api(`/api/kitchen-tickets/${ticketId}`, "PATCH", { status: "delivered" })).status === 200, "Retiro entregado")
  check((await stageOf(remoteId)).stage === "done", "Entregados")

  // Cuenta en el local con consumos sin enviar: «Pendientes»; luego se cancela.
  const local = await api("/api/service-orders", "POST", { orderType: "dineIn", tableLabel: `Mesa CRM ${suffix}`, items: [{ id: product.body.item.id, quantity: 1 }] })
  const localId = local.body.order.id
  created.orders.push(localId)
  check((await stageOf(localId)).stage === "pending", "Pendiente con consumos sin enviar")
  check((await api(`/api/service-orders/${localId}`, "PATCH", { action: "send" })).status === 200, "Enviar a cocina")
  check((await stageOf(localId)).stage === "confirmed", "Enviado: confirmado")
  check((await api(`/api/service-orders/${localId}`, "PATCH", { action: "cancel", reason: "Prueba" })).status === 200, "Cancelar")
  check((await stageOf(localId)).stage === "cancelled", "Cancelados")

  // Búsqueda y filtro por origen.
  const whatsapp = (await api(`/api/crm?source=whatsapp&q=${encodeURIComponent(`Cliente CRM ${suffix}`)}`)).body.items
  check(whatsapp.length === 1 && whatsapp[0].order.id === remoteId, "Filtro por WhatsApp y búsqueda por cliente")
  check(!(await api(`/api/crm?source=whatsapp&q=${localId}`)).body.items.some((entry) => entry.order.id === localId), "El filtro excluye otros orígenes")
  controller.abort()
  console.log("OK: tablero CRM por estados reales, confirmación, cocina con prioridad/demora/falta, flujo hasta entrega, cancelación, filtros y eventos en vivo")
} finally {
  for (const id of created.orders) {
    await db.query("DELETE FROM kitchen_tickets WHERE order_id = $1", [id])
    await db.query("DELETE FROM service_orders WHERE id = $1", [id])
  }
  await db.query("DELETE FROM customers WHERE name = $1", [`Cliente CRM ${suffix}`])
  if (created.products.length) { await db.query("DELETE FROM stock_movements WHERE product_id = ANY($1::bigint[])", [created.products]); await db.query("DELETE FROM products WHERE id = ANY($1::bigint[])", [created.products]) }
  if (created.users.length) { await db.query("DELETE FROM public.app_sessions WHERE user_id = ANY($1::bigint[])", [created.users]); await db.query("DELETE FROM public.app_users WHERE id = ANY($1::bigint[])", [created.users]) }
  await db.end()
}
