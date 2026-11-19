// Prueba del cobro de delivery por kilómetro y precio fijo: cálculo (redondeo, mínimo, gratis desde, distancia máxima),
// lectura de enlaces de Google Maps y pedido web real con la ubicación del cliente.
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000) y la base local con De la Casa.
// Cambia la configuración de delivery de De la Casa durante la prueba y la deja como estaba.
import fs from "node:fs/promises"
import { randomBytes } from "node:crypto"
import pg from "pg"
import { coordinatesFrom, deliveryPricing, DeliveryRangeError, distanceKm, quoteDelivery } from "../lib/delivery-pricing.ts"

const origin = process.env.POS_ORIGIN ?? "http://127.0.0.1:3000"
const env = await fs.readFile(".env.local", "utf8").catch(() => "")
const db = new pg.Client({ connectionString: process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() })
await db.connect()
const check = (condition, message) => { if (!condition) throw new Error(message) }

// 1. Cálculo.
const local = { lat: -25.7801, lng: -56.4469 }
const at = (km) => ({ lat: local.lat + km / 111.195, lng: local.lng }) // ~km al norte
const km = deliveryPricing({ deliveryPricing: { mode: "km", perKm: 1000, baseFee: 2000, minFee: 5000, maxKm: 8, roundTo: 500, freeOver: 150000 } })
check(Math.abs(distanceKm(local, at(3)) - 3) < 0.01, "Distancia mal calculada")
check(quoteDelivery(km, local, at(1), 0).fee === 5000, "No aplica el envío mínimo")
check(quoteDelivery(km, local, at(4.2), 0).fee === 6500, `Redondeo: ${quoteDelivery(km, local, at(4.2), 0).fee}`)
check(quoteDelivery(km, local, at(4.2), 0).label === "4,2 km", "Etiqueta de distancia")
check(quoteDelivery(km, local, at(4), 200000).fee === 0, "No aplica envío gratis")
let range = null; try { quoteDelivery(km, local, at(9), 0) } catch (error) { range = error }
check(range instanceof DeliveryRangeError && /8 km/.test(range.message), "No rechaza fuera de la distancia máxima")
check(quoteDelivery(km, local, null, 0) === null && quoteDelivery(deliveryPricing({}), local, at(2), 0) === null, "Sin ubicación o por zonas debería ser null")
check(quoteDelivery(deliveryPricing({ deliveryPricing: { mode: "fixed", fixedFee: 12000 } }), null, null, 0).fee === 12000, "Precio fijo")
check(deliveryPricing({ deliveryPricing: { mode: "x", perKm: -5, roundTo: 7 } }).mode === "zones" && deliveryPricing({ deliveryPricing: { perKm: -5 } }).perKm === 1000, "Valores inválidos no se corrigen")
const links = [["https://www.google.com/maps/place/X/@-25.7801,-56.4469,17z/data=!3d-25.78012!4d-56.44691", -25.78012], ["https://maps.google.com/?q=-25.7801,-56.4469", -25.7801], ["-25,7801, -56,4469", -25.7801]]
for (const [text, lat] of links) check(coordinatesFrom(text)?.lat === lat, `No lee coordenadas de ${text}`)
check(coordinatesFrom("hola") === null, "Lee coordenadas de un texto cualquiera")
console.log("✓ Cálculo por km: mínimo, redondeo, gratis desde, distancia máxima y enlaces de Google Maps")

// 2. Pedido web real.
const configRow = (await db.query("SELECT data FROM company_config WHERE id = 1")).rows[0]
const original = configRow?.data ?? {}
const restaurant = (await db.query("SELECT id, slug FROM public.restaurants WHERE schema_name = 'public'")).rows[0]
const product = (await db.query(`SELECT id FROM products WHERE COALESCE((data->>'isActive')::boolean, true)
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(data->'modifierGroups','[]'::jsonb)) g WHERE (g->>'required')::boolean) ORDER BY id LIMIT 1`)).rows[0]
let cookie = ""
const api = async (path, method = "GET", body) => {
  const response = await fetch(origin + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const token = response.headers.get("set-cookie")?.split(";")[0]
  if (token) cookie = token.endsWith("=") ? "" : token
  return { status: response.status, body: await response.json().catch(() => ({})) }
}
const setConfig = (patch) => db.query("UPDATE company_config SET data = $1::jsonb WHERE id = 1", [JSON.stringify({ ...original, ...patch })])
const created = { accounts: [], orders: [] }
try {
  check(product, "No hay producto sin opciones obligatorias")
  await setConfig({ latitude: String(local.lat), longitude: String(local.lng), serviceModes: { ...(original.serviceModes ?? {}), delivery: true }, showInMarketplace: true,
    deliveryPricing: { mode: "km", perKm: 1000, baseFee: 2000, minFee: 5000, maxKm: 8, roundTo: 500, freeOver: null } })
  const phone = `0981${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`
  const registered = await api("/api/customer/session", "POST", { mode: "register", name: "Cliente km prueba", phone, password: "prueba123" })
  check(registered.status === 201, `Registro: ${registered.status}`)
  created.accounts.push(registered.body.account.id)
  const item = [{ id: Number(product.id), quantity: 1 }]
  const placed = await api("/api/customer/orders", "POST", { slug: restaurant.slug, orderType: "delivery", address: "Calle prueba 123", lat: at(4.2).lat, lng: at(4.2).lng, items: item })
  check(placed.status === 201, `Pedido por km: ${placed.status} ${JSON.stringify(placed.body)}`)
  created.orders.push(Number(placed.body.ref.split("-")[1]))
  const saved = (await db.query("SELECT delivery_fee, delivery_zone_name FROM service_orders WHERE id = $1", [Number(placed.body.ref.split("-")[1])])).rows[0]
  check(Number(saved.delivery_fee) === 6500 && saved.delivery_zone_name === "4,2 km", `Envío por km mal guardado: ${JSON.stringify(saved)}`)
  console.log("✓ Pedido web a 4,2 km: envío Gs 6.500 calculado con la ubicación")

  const far = await api("/api/customer/orders", "POST", { slug: restaurant.slug, orderType: "delivery", address: "Lejos", lat: at(12).lat, lng: at(12).lng, items: item })
  check(far.status === 400 && /hasta 8 km/.test(far.body.error ?? ""), `Fuera de alcance: ${far.status} ${JSON.stringify(far.body)}`)
  const noZone = await api("/api/customer/orders", "POST", { slug: restaurant.slug, orderType: "delivery", address: "Sin ubicación 456", items: item })
  check(noZone.status === 201, `Sin ubicación por km debería quedar «a confirmar»: ${noZone.status} ${JSON.stringify(noZone.body)}`)
  created.orders.push(Number(noZone.body.ref.split("-")[1]))
  console.log("✓ Fuera de la distancia máxima se rechaza; sin ubicación queda a confirmar")

  await setConfig({ latitude: String(local.lat), longitude: String(local.lng), serviceModes: { ...(original.serviceModes ?? {}), delivery: true }, showInMarketplace: true,
    deliveryPricing: { mode: "fixed", fixedFee: 12000 } })
  const fixed = await api("/api/customer/orders", "POST", { slug: restaurant.slug, orderType: "delivery", address: "Fijo 789", items: item })
  check(fixed.status === 201, `Pedido con precio fijo: ${fixed.status} ${JSON.stringify(fixed.body)}`)
  created.orders.push(Number(fixed.body.ref.split("-")[1]))
  const fixedRow = (await db.query("SELECT delivery_fee FROM service_orders WHERE id = $1", [Number(fixed.body.ref.split("-")[1])])).rows[0]
  check(Number(fixedRow.delivery_fee) === 12000, `Envío fijo: ${fixedRow.delivery_fee}`)
  console.log("✓ Precio fijo: Gs 12.000")
  console.log("Prueba de delivery por km y precio fijo: OK")
} finally {
  await db.query("UPDATE company_config SET data = $1::jsonb WHERE id = 1", [JSON.stringify(original)])
  for (const id of created.orders) {
    await db.query("DELETE FROM public.customer_order_links WHERE order_id = $1 AND restaurant_id = $2", [id, restaurant.id])
    await db.query("DELETE FROM kitchen_tickets WHERE order_id = $1", [id]); await db.query("DELETE FROM order_status_history WHERE order_id = $1", [id]); await db.query("DELETE FROM service_orders WHERE id = $1", [id])
  }
  for (const id of created.accounts) {
    await db.query("DELETE FROM public.customer_order_links WHERE account_id = $1", [id]); await db.query("DELETE FROM public.customer_sessions WHERE account_id = $1", [id])
    await db.query("DELETE FROM public.customer_accounts WHERE id = $1", [id])
  }
  await db.query("DELETE FROM customers WHERE phone LIKE '5959810%' AND name = 'Cliente km prueba'").catch(() => undefined)
  await db.end()
}
