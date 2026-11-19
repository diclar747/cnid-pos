// Prueba de los tableros: mover pedidos y comandas a cualquier columna (saltando pasos o volviendo atrás).
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000) y la base local con De la Casa.
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
const suffix = randomBytes(3).toString("hex")
const created = { users: [], products: [], orders: [] }
const statuses = async (orderId) => (await db.query("SELECT status FROM kitchen_tickets WHERE order_id = $1 AND status <> 'cancelled' ORDER BY id", [orderId])).rows.map((r) => r.status)

try {
  const u = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id)
    VALUES ($1,$2,'Caja tablero','cashier',$3,$4,1) RETURNING id`, [`board-${suffix}@prueba.test`, `board_${suffix}`, ["access_pos", "manage_sales"], hash("Prueba-2026!")])
  created.users.push(Number(u.rows[0].id))
  check((await api("/api/auth/login", "POST", { email: `board-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login")
  const p = await db.query(`INSERT INTO products (data) VALUES ($1::jsonb) RETURNING id`, [JSON.stringify({ name: `Plato tablero ${suffix}`, price: 10000, category: "Pruebas", stock: 0, trackStock: false, isActive: true, barcode: `BRD-${suffix}`, description: "" })])
  const productId = Number(p.rows[0].id); created.products.push(productId)
  const make = async (orderType) => {
    const r = await api("/api/service-orders", "POST", { orderType, customerName: `Tablero ${suffix}`, items: [{ id: productId, quantity: 1 }] })
    check(r.status === 201 || r.status === 200, `Crear orden: ${r.status} ${JSON.stringify(r.body)}`)
    created.orders.push(r.body.order.id)
    return r.body.order.id
  }

  // Pedidos: de «Pendiente» (sin enviar) directo a «Listo», volver a «Confirmado» y terminar en «Entregado».
  const local = await make("dineIn")
  check((await api(`/api/service-orders/${local}`, "PATCH", { action: "move", to: "ready" })).status === 200, "Mover a Listo")
  check((await statuses(local)).every((s) => s === "ready"), `Salta directo a Listo: ${await statuses(local)}`)
  check((await api(`/api/service-orders/${local}`, "PATCH", { action: "move", to: "confirmed" })).status === 200 && (await statuses(local)).every((s) => s === "pending"), "Vuelve atrás")
  check((await api(`/api/service-orders/${local}`, "PATCH", { action: "move", to: "delivery" })).status === 400, "Un pedido del local no va a delivery")
  check((await api(`/api/service-orders/${local}`, "PATCH", { action: "move", to: "done" })).status === 200 && (await statuses(local)).every((s) => s === "served"), "En el local termina como servido")

  // Cocina: una comanda de delivery salta de pendiente a «en reparto» y a una columna propia.
  const delivery = await make("delivery")
  await api(`/api/service-orders/${delivery}`, "PATCH", { action: "send" })
  const ticket = (await db.query("SELECT id FROM kitchen_tickets WHERE order_id = $1", [delivery])).rows[0].id
  const jump = await api(`/api/kitchen-tickets/${ticket}`, "PATCH", { status: "out_for_delivery", jump: true })
  check(jump.status === 200 && jump.body.ticket.status === "out_for_delivery", `Comanda salta a reparto: ${JSON.stringify(jump.body)}`)
  check((await api(`/api/kitchen-tickets/${ticket}`, "PATCH", { status: "ready" })).status >= 400, "Sin «jump» solo avanza un paso")
  const custom = await api(`/api/kitchen-tickets/${ticket}`, "PATCH", { status: "preparing", jump: true, column: "esperando-bebidas" })
  check(custom.status === 200 && custom.body.ticket.status === "preparing" && custom.body.ticket.boardColumn === "esperando-bebidas", "Columna propia")
  const next = await api(`/api/kitchen-tickets/${ticket}`, "PATCH", { status: "ready" })
  check(next.status === 200 && next.body.ticket.boardColumn === null, "Avanzar con el botón vuelve a la columna del estado")
  console.log("OK: tableros con movimiento libre (Pedidos y Cocina), columnas propias y validaciones")
} finally {
  for (const id of created.orders) {
    await db.query("DELETE FROM kitchen_tickets WHERE order_id = $1", [id])
    await db.query("DELETE FROM order_status_history WHERE order_id = $1", [id])
    await db.query("DELETE FROM service_orders WHERE id = $1", [id])
  }
  await db.query("DELETE FROM customers WHERE name = $1", [`Tablero ${suffix}`])
  if (created.products.length) await db.query("DELETE FROM products WHERE id = ANY($1::bigint[])", [created.products])
  if (created.users.length) { await db.query("DELETE FROM public.app_sessions WHERE user_id = ANY($1::bigint[])", [created.users]); await db.query("DELETE FROM public.app_users WHERE id = ANY($1::bigint[])", [created.users]) }
  await db.end()
}
