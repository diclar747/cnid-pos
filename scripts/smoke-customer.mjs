// Prueba de la cuenta del cliente: registro, ingreso, pedido desde el marketplace (con opciones y validaciones),
// el local lo confirma y lo manda a cocina, el cliente ve el estado en su historial, edita su perfil y sale.
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000) y la base local con De la Casa.
// Crea registros temporales y los elimina al terminar.
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
    if (token) cookie = token.endsWith("=") ? "" : token
    return { status: response.status, body: await response.json().catch(() => ({})) }
  }
}
const hash = (password) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}` }
const suffix = randomBytes(3).toString("hex")
const phone = `0981${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`
const created = { accounts: [], orders: [], users: [] }

try {
  const restaurant = (await db.query("SELECT id, slug FROM public.restaurants WHERE schema_name = 'public'")).rows[0]
  const customer = session(), other = session(), staff = session()
  check((await customer("/api/customer/session")).body.account === null, "Sin sesión al empezar")
  check((await customer("/api/customer/session", "POST", { mode: "register", name: "A", phone, password: "123456" })).status === 400, "Nombre muy corto")
  check((await customer("/api/customer/session", "POST", { mode: "register", name: `Cliente web ${suffix}`, phone, password: "123" })).status === 400, "Contraseña corta")
  const registered = await customer("/api/customer/session", "POST", { mode: "register", name: `Cliente web ${suffix}`, phone, password: "Prueba-2026" })
  check(registered.status === 201 && registered.body.account.phone === `595${phone.slice(1)}`, `Registro: ${JSON.stringify(registered.body)}`)
  created.accounts.push(registered.body.account.id)
  check((await other("/api/customer/session", "POST", { mode: "register", name: "Otro", phone, password: "Prueba-2026" })).status === 409, "Teléfono repetido")
  check((await other("/api/customer/session", "POST", { mode: "login", phone, password: "mala-clave" })).status === 401, "Contraseña incorrecta")
  check((await other("/api/customer/session", "POST", { mode: "login", phone, password: "Prueba-2026" })).status === 200, "Ingreso con teléfono")
  check((await customer("/api/customer/session")).body.account?.name === `Cliente web ${suffix}`, "Sesión activa")

  // Menú público con opciones: un plato simple y, si hay, uno con opción obligatoria.
  const menu = (await fetch(`${origin}/api/marketplace/${restaurant.slug}`).then((r) => r.json()))
  const simple = menu.products.find((p) => p.groups.every((g) => !g.required))
  const withOptions = menu.products.find((p) => p.groups.some((g) => g.required && g.options.length))
  check(simple, "Hay un plato sin opciones obligatorias")
  check((await fetch(`${origin}/api/customer/orders`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: restaurant.slug }) })).status === 401, "Pedir exige cuenta")
  check((await customer("/api/customer/orders", "POST", { slug: restaurant.slug, orderType: "pickup", items: [] })).status === 400, "Pedido vacío")
  check((await customer("/api/customer/orders", "POST", { slug: restaurant.slug, orderType: "delivery", items: [{ id: simple.id, quantity: 1 }] })).status === 400, "Delivery sin dirección")
  check((await customer("/api/customer/orders", "POST", { slug: "no-existe", orderType: "pickup", items: [{ id: simple.id, quantity: 1 }] })).status === 404, "Restaurante inexistente")
  const items = [{ id: simple.id, quantity: 2 }]
  if (withOptions) {
    check((await customer("/api/customer/orders", "POST", { slug: restaurant.slug, orderType: "pickup", items: [{ id: withOptions.id, quantity: 1 }] })).status === 400, "Falta la opción obligatoria")
    const group = withOptions.groups.find((g) => g.required)
    items.push({ id: withOptions.id, quantity: 1, options: [{ groupId: group.id, optionId: group.options[0].id }] })
  }
  const placed = await customer("/api/customer/orders", "POST", { slug: restaurant.slug, orderType: "pickup", notes: "Sin cebolla", items })
  check(placed.status === 201 && /^\d+-\d+$/.test(placed.body.ref), `Pedido web: ${JSON.stringify(placed.body)}`)
  created.orders.push(placed.body.id)
  const expected = simple.price * 2 + (withOptions ? withOptions.price + withOptions.groups.find((g) => g.required).options[0].price : 0)
  check(placed.body.grandTotal === expected, `El servidor calcula el total (${placed.body.grandTotal} vs ${expected})`)
  const row = (await db.query("SELECT source, confirmation, customer_account_id, customer_phone FROM service_orders WHERE id = $1", [placed.body.id])).rows[0]
  check(row.source === "web" && row.confirmation === "pending" && Number(row.customer_account_id) === registered.body.account.id, "Entra como pedido web pendiente de confirmar")

  let list = await customer("/api/customer/orders")
  check(list.status === 200 && list.body.items[0]?.ref === placed.body.ref && list.body.items[0].stage === "new", `Historial: ${JSON.stringify(list.body.items[0])}`)
  check((await other(`/api/customer/orders/${restaurant.id}-999999999`)).status === 404, "Pedido ajeno o inexistente")

  // El local lo ve en el tablero, lo confirma y lo manda a cocina.
  const r = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id)
    VALUES ($1,$2,'Caja web','cashier',$3,$4,1) RETURNING id`, [`web-${suffix}@prueba.test`, `web_${suffix}`, ["access_pos", "manage_sales"], hash("Prueba-2026!")])
  created.users.push(Number(r.rows[0].id))
  check((await staff("/api/auth/login", "POST", { email: `web-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login del local")
  const board = await staff("/api/crm?source=web")
  check(board.body.items.some((entry) => entry.order.id === placed.body.id && entry.stage === "new"), "Aparece en Pedidos como nuevo (origen web)")
  const confirmed = await staff(`/api/service-orders/${placed.body.id}`, "PATCH", { action: "confirm", sendToKitchen: true })
  check(confirmed.status === 200, `Confirmar: ${confirmed.status} ${JSON.stringify(confirmed.body)}`)
  const detail = await customer(`/api/customer/orders/${placed.body.ref}`)
  check(detail.status === 200 && ["confirmed", "kitchen"].includes(detail.body.order.stage) && detail.body.order.history.length >= 2, `Seguimiento: ${JSON.stringify(detail.body.order?.stage)}`)

  // Perfil y salida.
  const profile = await customer("/api/customer/session", "PATCH", { name: `Cliente web ${suffix}`, address: "Calle 1 casi 2", email: "" })
  check(profile.status === 200 && profile.body.account.address === "Calle 1 casi 2", "Editar perfil")
  check((await customer("/api/customer/session", "PATCH", { name: `Cliente web ${suffix}`, newPassword: "otra-clave", currentPassword: "mala" })).status === 400, "Cambiar clave exige la actual")
  await customer("/api/customer/session", "DELETE")
  check((await customer("/api/customer/session")).body.account === null && (await customer("/api/customer/orders")).status === 401, "Cerrar sesión")
  console.log("OK: cuenta del cliente, pedido web con opciones y validaciones, confirmación del local, historial, seguimiento, perfil y salida")
} finally {
  for (const id of created.orders) {
    await db.query("DELETE FROM kitchen_tickets WHERE order_id = $1", [id])
    await db.query("DELETE FROM order_status_history WHERE order_id = $1", [id])
    await db.query("DELETE FROM service_orders WHERE id = $1", [id])
  }
  if (created.accounts.length) {
    await db.query("DELETE FROM public.customer_order_links WHERE account_id = ANY($1::bigint[])", [created.accounts])
    await db.query("DELETE FROM public.customer_accounts WHERE id = ANY($1::bigint[])", [created.accounts])
  }
  await db.query("DELETE FROM customers WHERE name = $1", [`Cliente web ${suffix}`])
  if (created.users.length) { await db.query("DELETE FROM public.app_sessions WHERE user_id = ANY($1::bigint[])", [created.users]); await db.query("DELETE FROM public.app_users WHERE id = ANY($1::bigint[])", [created.users]) }
  await db.end()
}
