// Prueba del marketplace público: listado de restaurantes activos, ficha con menú, ocultar desde la ficha
// y que no se expongan datos internos (stock, costos, clientes).
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000) y la base local con De la Casa.
import fs from "node:fs/promises"
import pg from "pg"

const origin = process.env.POS_ORIGIN ?? "http://127.0.0.1:3000"
const env = await fs.readFile(".env.local", "utf8").catch(() => "")
const db = new pg.Client({ connectionString: process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() })
await db.connect()
const check = (condition, message) => { if (!condition) throw new Error(message) }
const get = async (path) => { const response = await fetch(origin + path); return { status: response.status, body: await response.json().catch(() => null), text: response } }

const target = (await db.query("SELECT slug, schema_name FROM public.restaurants WHERE status = 'active' ORDER BY id DESC LIMIT 1")).rows[0]
const original = (await db.query(`SELECT data FROM "${target.schema_name}".company_config WHERE id = 1`)).rows[0]?.data
try {
  const list = await get("/api/marketplace")
  check(list.status === 200 && Array.isArray(list.body.items) && list.body.items.length >= 1, "Listado del marketplace")
  const item = list.body.items.find((entry) => entry.slug === target.slug)
  check(item && typeof item.name === "string" && "whatsapp" in item && "openNow" in item && Array.isArray(item.categories), `Ficha en el listado: ${JSON.stringify(item)}`)

  const detail = await get(`/api/marketplace/${target.slug}`)
  check(detail.status === 200 && detail.body.restaurant.slug === target.slug && Array.isArray(detail.body.products), "Ficha y menú")
  const json = JSON.stringify(detail.body)
  for (const key of ["\"stock\"", "\"cost\"", "\"barcode\"", "\"customers\"", "\"ruc\""]) check(!json.includes(key), `No debe exponer ${key}`)
  for (const product of detail.body.products) check(Number.isFinite(product.price) && product.price <= product.regularPrice, `Precio de ${product.name}`)

  check((await get("/api/marketplace/no-existe")).status === 404, "Slug inexistente")
  check((await get("/api/marketplace/..%2Fpublic")).status === 404, "Slug inválido")
  const page = await fetch(`${origin}/marketplace/${target.slug}`)
  check(page.status === 200 && (await page.text()).includes("Pedir por WhatsApp") === Boolean(item.whatsapp), "Página pública del restaurante")

  // El restaurante puede ocultarse desde su ficha.
  await db.query(`INSERT INTO "${target.schema_name}".company_config (id, data) VALUES (1, $1::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = company_config.data || $1::jsonb`, [JSON.stringify({ showInMarketplace: false })])
  check(!(await get("/api/marketplace")).body.items.some((entry) => entry.slug === target.slug), "Oculto del listado")
  check((await get(`/api/marketplace/${target.slug}`)).status === 404, "Oculto en la ficha")
  console.log("OK: marketplace con restaurantes activos, ficha, menú, precios, ocultar y sin datos internos")
} finally {
  if (original) await db.query(`UPDATE "${target.schema_name}".company_config SET data = $1::jsonb WHERE id = 1`, [JSON.stringify(original)])
  else await db.query(`DELETE FROM "${target.schema_name}".company_config WHERE id = 1`)
  await db.end()
}
