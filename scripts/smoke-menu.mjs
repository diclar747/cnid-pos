// Prueba del menú: precio promocional, tiempo de preparación, disponibilidad, opciones y adicionales
// validados y aplicados igual en el cobro, las órdenes y el QR de mesa.
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
const created = { users: [], products: [], sales: [], orders: [] }
const base = { category: "Pruebas menú", image: "", stock: 0, trackStock: false, description: "Doble carne", isActive: true }
try {
  const user = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id) VALUES ($1,$2,'Menú prueba','admin',$3,$4,1) RETURNING id`,
    [`menu-${suffix}@prueba.test`, `menu_${suffix}`, ["access_pos", "manage_sales", "manage_products", "take_orders"], hash("Prueba-2026!")])
  created.users.push(Number(user.rows[0].id))
  check((await api("/api/auth/login", "POST", { email: `menu-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login")

  // Validaciones de opciones.
  check((await api("/api/data/products", "POST", { ...base, name: `Mal ${suffix}`, price: 1000, barcode: `MAL-${suffix}`, modifierGroups: [{ legacyId: 1, name: "", options: [] }] })).status === 400, "Grupo sin nombre ni opciones")
  check((await api("/api/data/products", "POST", { ...base, name: `Mal2 ${suffix}`, price: 1000, barcode: `MAL2-${suffix}`,
    modifierGroups: [{ legacyId: 1, name: "Extras", options: [{ legacyId: 5, name: "Queso", price: -1 }] }] })).status === 400, "Precio de opción negativo")

  const groups = [{ legacyId: 910000001, name: "Punto", required: true, multiple: false, options: [{ legacyId: 910000011, name: "Jugosa", price: 0 }, { legacyId: 910000012, name: "Cocida", price: 0 }] },
    { legacyId: 910000002, name: "Extras", required: false, multiple: true, options: [{ legacyId: 910000021, name: "Queso extra", price: 5000 }, { legacyId: 910000022, name: "Panceta", price: 7000 }] }]
  const product = await api("/api/data/products", "POST", { ...base, name: `Burger promo ${suffix}`, price: 40000, promoPrice: 35000, prepMinutes: 15, ingredients: "carne, cheddar", barcode: `MENU-${suffix}`, modifierGroups: groups })
  check(product.status === 201, `Producto: ${product.status} ${JSON.stringify(product.body)}`)
  const item = product.body.item
  created.products.push(item.id)
  check(item.promoPrice === 35000 && item.prepMinutes === 15 && item.ingredients === "carne, cheddar" && item.modifierGroups.length === 2, "Campos del menú guardados")
  const invalidPromo = await api("/api/data/products", "POST", { ...base, name: `Promo alta ${suffix}`, price: 10000, promoPrice: 20000, barcode: `PA-${suffix}` })
  created.products.push(invalidPromo.body.item.id)
  check(invalidPromo.body.item.promoPrice === null, "Una promo mayor al precio se descarta")

  // Cobro: opción obligatoria y precio promocional + adicional.
  check((await api("/api/checkout", "POST", { items: [{ id: item.id, quantity: 1 }], paymentMethod: "card", orderType: "pickup" })).status === 400, "Falta la opción obligatoria")
  const sale = await api("/api/checkout", "POST", { items: [{ id: item.id, quantity: 2, selectedModifiers: [{ groupId: 910000001, optionId: 910000011 }, { groupId: 910000002, optionId: 910000021 }] }],
    paymentMethod: "card", orderType: "pickup" })
  check(sale.status === 201, `Cobro: ${sale.status} ${JSON.stringify(sale.body)}`)
  created.sales.push(sale.body.sale.id)
  check(sale.body.sale.total === 80000, `Precio promo + queso (2 × 40.000): ${sale.body.sale.total}`)

  // Orden de servicio con el mismo cálculo.
  const order = await api("/api/service-orders", "POST", { orderType: "pickup", customerName: `Menu ${suffix}`, items: [{ id: item.id, quantity: 1, selectedModifiers: [{ groupId: 910000001, optionId: 910000012 }] }] })
  check(order.status === 201 && order.body.order.total === 35000, `Orden con promo: ${order.body.order?.total}`)
  created.orders.push(order.body.order.id)

  // Producto no disponible: no se vende.
  check((await api(`/api/data/products/${item.id}`, "PUT", { ...item, isActive: false })).status === 200, "Desactivar producto")
  check((await api("/api/checkout", "POST", { items: [{ id: item.id, quantity: 1, selectedModifiers: [{ groupId: 910000001, optionId: 910000011 }] }], paymentMethod: "card" })).status === 400, "Un producto no disponible no se cobra")
  console.log("OK: menú con precio promocional, preparación, ingredientes, opciones obligatorias y adicionales validados, cobro y órdenes con el mismo precio, disponibilidad")
} finally {
  for (const id of created.orders) { await db.query("DELETE FROM kitchen_tickets WHERE order_id = $1", [id]); await db.query("DELETE FROM service_orders WHERE id = $1", [id]) }
  await db.query("DELETE FROM customers WHERE name = $1", [`Menu ${suffix}`])
  if (created.sales.length) await db.query("DELETE FROM sales WHERE id = ANY($1::bigint[])", [created.sales])
  if (created.products.length) { await db.query("DELETE FROM stock_movements WHERE product_id = ANY($1::bigint[])", [created.products]); await db.query("DELETE FROM products WHERE id = ANY($1::bigint[])", [created.products]) }
  if (created.users.length) { await db.query("DELETE FROM public.app_sessions WHERE user_id = ANY($1::bigint[])", [created.users]); await db.query("DELETE FROM public.app_users WHERE id = ANY($1::bigint[])", [created.users]) }
  await db.end()
}
