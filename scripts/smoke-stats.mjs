// Prueba de estadísticas: una venta nueva se refleja en ventas, ticket, productos, medios de pago y origen.
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000). Crea registros temporales y los elimina.
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
const created = { users: [], products: [], sales: [] }
try {
  for (const [role, perms] of [["admin", ["access_pos", "manage_sales", "manage_products", "view_reports"]], ["waiter", ["access_pos", "take_orders"]]]) {
    const r = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id) VALUES ($1,$2,$3,$4,$5,$6,1) RETURNING id`,
      [`stats-${role}-${suffix}@prueba.test`, `stats_${role}_${suffix}`, `Stats ${role}`, role, perms, hash("Prueba-2026!")])
    created.users.push(Number(r.rows[0].id))
  }
  const admin = session(), waiter = session()
  check((await admin("/api/auth/login", "POST", { email: `stats-admin-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login admin")
  check((await waiter("/api/auth/login", "POST", { email: `stats-waiter-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login mesero")
  check((await waiter("/api/stats")).status === 403, "El mesero no ve estadísticas")
  check((await admin("/api/stats?from=2020-01-01&to=2026-12-31")).status === 400, "Período mayor a un año")
  const before = await admin("/api/stats")
  check(before.status === 200 && before.body.daily.length === 30 && before.body.weekly.length === 12 && before.body.monthly.length === 12, `Estadísticas: ${before.status}`)
  const product = await admin("/api/data/products", "POST", { name: `Plato estadística ${suffix}`, price: 77000, category: "Pruebas", image: "", stock: 0, trackStock: false, barcode: `ST-${suffix}`, description: "", isActive: true })
  created.products.push(product.body.item.id)
  const sale = await admin("/api/checkout", "POST", { items: [{ id: product.body.item.id, quantity: 3 }], paymentMethod: "card", orderType: "pickup" })
  check(sale.status === 201, `Venta: ${sale.status}`)
  created.sales.push(sale.body.sale.id)
  const after = await admin("/api/stats")
  check(after.body.current.revenue - before.body.current.revenue === 231000 && after.body.current.sales - before.body.current.sales === 1, "La venta suma en el período")
  check(after.body.daily.at(-1).revenue - before.body.daily.at(-1).revenue === 231000, "La venta suma en el día de hoy")
  check(after.body.topByRevenue.some((row) => row.name === `Plato estadística ${suffix}` && row.quantity === 3), "El producto aparece en el ranking")
  check(after.body.cashiers.some((row) => row.name === "Stats admin"), "El cajero aparece en el rendimiento")
  const card = (stats) => stats.paymentMethods.find((row) => row.method === "card")?.revenue ?? 0
  check(card(after.body) - card(before.body) === 231000, "Medio de pago")
  console.log("OK: estadísticas por período, serie diaria, semanal y mensual, productos, cajeros, medios de pago y permisos")
} finally {
  if (created.sales.length) await db.query("DELETE FROM sales WHERE id = ANY($1::bigint[])", [created.sales])
  if (created.products.length) await db.query("DELETE FROM products WHERE id = ANY($1::bigint[])", [created.products])
  if (created.users.length) { await db.query("DELETE FROM public.app_sessions WHERE user_id = ANY($1::bigint[])", [created.users]); await db.query("DELETE FROM public.app_users WHERE id = ANY($1::bigint[])", [created.users]) }
  await db.end()
}
