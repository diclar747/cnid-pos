import "server-only"

import { authDb } from "./db"
import { basePrice, effectivePrice } from "./product-price"
import { normalizePhone } from "./service-order-server"
import { deliveryPricing, type DeliveryPricing } from "./delivery-pricing"

// Marketplace público: restaurantes activos con su ficha (dirección, teléfono, WhatsApp, horarios) y su menú.
// Solo expone datos que el restaurante cargó en su ficha pública y el catálogo activo. Nada de clientes ni ventas.

const SCHEMA = /^(public|restaurant_[0-9]+)$/
const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const MAX_INLINE_IMAGE = 400

type Hours = { day: string; open: string; close: string; closed: boolean }
export type MarketplaceRestaurant = {
  slug: string; name: string; slogan: string; description: string; businessType: string
  address: string; city: string; phone: string; whatsapp: string; website: string; mapsUrl: string
  latitude: number | null; longitude: number | null; logo: string; cover: string; color: string
  /** Cómo cobra el delivery (por zona, por km o fijo): la ficha calcula el envío con la ubicación del cliente. */
  deliveryPricing: DeliveryPricing
  serviceModes: { dineIn: boolean; delivery: boolean; pickup: boolean }
  openingHours: Hours[]; openNow: boolean | null; todayHours: string
  productCount: number; categories: string[]; promoCount: number
}
export type MarketplaceProduct = {
  id: number; name: string; description: string; category: string; image: string; price: number; regularPrice: number
  prepMinutes: number | null; hasOptions: boolean
  /** Opciones para elegir al pedir (guarnición, tamaño…). */
  groups: { id: number; name: string; required: boolean; multiple: boolean; options: { id: number; name: string; price: number }[] }[]
}
export type MarketplaceZone = { id: number; name: string; areas: string; fee: number; freeOver: number | null; etaMinutes: number | null }

const text = (value: unknown, max = 300) => typeof value === "string" ? value.trim().slice(0, max) : ""
const coordinate = (value: unknown) => { const n = Number(value); return Number.isFinite(n) && n !== 0 ? n : null }
const minutes = (value: string) => { const [h, m] = value.split(":").map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null }

/** ¿Está abierto ahora? (zona horaria de Paraguay; contempla cierres después de medianoche). */
export function openState(hours: Hours[], now = new Date()) {
  if (!Array.isArray(hours) || hours.length !== 7) return { openNow: null, todayHours: "" }
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Asuncion", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now)
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday")?.value ?? "")
  const current = Number(parts.find((p) => p.type === "hour")?.value) * 60 + Number(parts.find((p) => p.type === "minute")?.value)
  const find = (index: number) => hours.find((h) => h.day === DAYS[(index + 7) % 7])
  const today = find(weekday), yesterday = find(weekday - 1)
  const inside = (day: Hours | undefined, sinceYesterday: boolean) => {
    if (!day || day.closed) return false
    const open = minutes(day.open), close = minutes(day.close)
    if (open == null || close == null) return false
    if (close > open) return !sinceYesterday && current >= open && current < close
    return sinceYesterday ? current < close : current >= open
  }
  const openNow = inside(today, false) || inside(yesterday, true)
  return { openNow, todayHours: !today ? "" : today.closed ? "Cerrado hoy" : `Hoy ${today.open} a ${today.close}` }
}

/** Imagen apta para listar: rutas y URLs se usan tal cual; las subidas en base64 se sirven por su propia ruta. */
function imageUrl(value: unknown, fallback: string) {
  const image = typeof value === "string" ? value : ""
  if (!image || image.includes("placeholder")) return ""
  if (image.startsWith("data:image/")) return image.length <= MAX_INLINE_IMAGE ? image : fallback
  if (image.startsWith("/") || /^https:\/\//.test(image)) return image.length <= 4000 ? image : ""
  return ""
}

/** Logo o portada subidos desde Empresa → Apariencia: se sirven por la ruta pública del marketplace. */
function brandUrl(value: unknown, slug: string, kind: "logo" | "cover") {
  const match = typeof value === "string" ? value.match(/^\/api\/brand\/(logo|cover)(?:\?v=([a-z0-9]{1,16}))?$/) : null
  return match && match[1] === kind ? `/api/marketplace/${slug}/${kind}${match[2] ? `?v=${match[2]}` : ""}` : ""
}

async function restaurantRows(slug?: string) {
  const result = await authDb.query(`SELECT id, name, slug, schema_name, phone, address FROM public.restaurants
    WHERE status = 'active' ${slug ? "AND slug = $1" : ""} ORDER BY name`, slug ? [slug] : [])
  return result.rows.filter((row) => SCHEMA.test(row.schema_name))
}

async function readSchema(schema: string) {
  const [config, products, session] = await Promise.all([
    authDb.query(`SELECT data FROM "${schema}".company_config WHERE id = 1`),
    authDb.query(`SELECT id, data FROM "${schema}".products WHERE data->>'isActive' IS DISTINCT FROM 'false' ORDER BY id`),
    authDb.query(`SELECT phone, status FROM "${schema}".whatsapp_session WHERE id = 1`).catch(() => ({ rows: [] as any[] })),
  ])
  return { config: config.rows[0]?.data ?? {}, products: products.rows, session: session.rows[0] }
}

function profile(row: any, config: any, session: any, products: MarketplaceProduct[]): MarketplaceRestaurant {
  const hours = Array.isArray(config.openingHours) && config.openingHours.length === 7 ? config.openingHours as Hours[] : []
  const whatsapp = normalizePhone(config.socialMedia?.whatsapp) || (session?.status === "connected" ? normalizePhone(session.phone) : "") || normalizePhone(config.phone || row.phone)
  const categories = [...new Set(products.map((p) => p.category))]
  const modes = config.serviceModes ?? {}
  return {
    slug: row.slug, name: text(config.name, 120) || row.name, slogan: text(config.slogan, 160), description: text(config.description, 600),
    businessType: text(config.businessType, 60), address: text(config.address, 200) || text(row.address, 200), city: text(config.city, 80),
    phone: text(config.phone, 40) || text(row.phone, 40), whatsapp, website: /^https?:\/\//.test(config.website ?? "") ? text(config.website, 200) : "",
    mapsUrl: /^https:\/\//.test(config.mapsUrl ?? "") ? text(config.mapsUrl, 300) : "",
    latitude: coordinate(config.latitude), longitude: coordinate(config.longitude),
    logo: brandUrl(config.logo, row.slug, "logo") || imageUrl(config.logo, `/api/marketplace/${row.slug}/logo`),
    cover: brandUrl(config.coverImage, row.slug, "cover") || products.find((p) => p.image)?.image || "",
    color: /^#[0-9a-f]{6}$/i.test(config.colors?.primary ?? "") ? config.colors.primary : "#4f46e5",
    serviceModes: { dineIn: modes.dineIn !== false, delivery: modes.delivery !== false, pickup: modes.pickup !== false },
    deliveryPricing: deliveryPricing(config),
    openingHours: hours, ...openState(hours), productCount: products.length, categories, promoCount: products.filter((p) => p.price < p.regularPrice).length,
  }
}

function catalog(slug: string, rows: any[]): MarketplaceProduct[] {
  return rows.map((row) => ({ ...row.data, id: Number(row.id) }))
    .filter((p) => p.trackStock === false || Number(p.stock) > 0)
    .map((p) => ({
      id: p.id, name: text(p.name, 120), description: text(p.description, 300), category: text(p.category, 80) || "Otros",
      image: imageUrl(p.image, `/api/marketplace/${slug}/image/${p.id}`),
      price: effectivePrice(p, "pickup"), regularPrice: basePrice(p, "pickup"),
      prepMinutes: Number.isSafeInteger(p.prepMinutes) ? p.prepMinutes : null, hasOptions: Array.isArray(p.modifierGroups) && p.modifierGroups.length > 0,
      groups: (Array.isArray(p.modifierGroups) ? p.modifierGroups : []).filter((g: any) => Number.isSafeInteger(g?.legacyId) && Array.isArray(g?.options))
        .map((g: any) => ({ id: g.legacyId, name: text(g.name, 80), required: Boolean(g.required), multiple: Boolean(g.multiple),
          options: g.options.filter((o: any) => Number.isSafeInteger(o?.legacyId) && Number.isSafeInteger(o?.price) && o.price >= 0).map((o: any) => ({ id: o.legacyId, name: text(o.name, 80), price: o.price })) }))
        .filter((g: any) => g.options.length > 0),
    }))
    .filter((p) => p.name && Number.isFinite(p.price))
}

/** Restaurantes activos que no se ocultaron del marketplace. */
export async function listRestaurants() {
  const rows = await restaurantRows()
  const items = await Promise.all(rows.map(async (row) => {
    try {
      const data = await readSchema(row.schema_name)
      if (data.config.showInMarketplace === false) return null
      return profile(row, data.config, data.session, catalog(row.slug, data.products))
    } catch (error) {
      console.error("Marketplace: no se pudo leer", row.slug, error)
      return null
    }
  }))
  return items.filter((item): item is MarketplaceRestaurant => item !== null)
}

export async function getRestaurant(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null
  const row = (await restaurantRows(slug))[0]
  if (!row) return null
  const data = await readSchema(row.schema_name)
  if (data.config.showInMarketplace === false) return null
  const products = catalog(row.slug, data.products)
  const zones = (await authDb.query(`SELECT id, name, areas, fee, free_over, eta_minutes FROM "${row.schema_name}".delivery_zones WHERE is_active ORDER BY sort_order, id`)
    .catch(() => ({ rows: [] as any[] }))).rows.map((zone): MarketplaceZone => ({ id: Number(zone.id), name: zone.name, areas: zone.areas ?? "", fee: Number(zone.fee),
      freeOver: zone.free_over == null ? null : Number(zone.free_over), etaMinutes: zone.eta_minutes == null ? null : Number(zone.eta_minutes) }))
  return { restaurant: profile(row, data.config, data.session, products), products, zones }
}

/** Salones y mesas activas (para que el cliente elija su mesa al escanear el QR del restaurante). */
export async function restaurantTables(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null
  const row = (await restaurantRows(slug))[0]
  if (!row) return null
  const tables = await authDb.query(`SELECT t.label, t.code, t.seats, r.name AS room FROM "${row.schema_name}".dining_tables t
    JOIN "${row.schema_name}".dining_rooms r ON r.id = t.room_id WHERE t.is_active AND r.is_active ORDER BY r.id, t.label`).catch(() => ({ rows: [] as any[] }))
  return tables.rows.map((table) => ({ label: String(table.label), code: String(table.code), seats: Number(table.seats), room: String(table.room) }))
}

/** Logo o foto subida en base64: se sirve como archivo para no inflar el listado. */
export async function storedImage(slug: string, productId: number | "cover" | null) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null
  const row = (await restaurantRows(slug))[0]
  if (!row) return null
  if (productId == null || productId === "cover") {
    const shown = (await authDb.query(`SELECT data->>'showInMarketplace' AS shown FROM "${row.schema_name}".company_config WHERE id = 1`)).rows[0]?.shown
    if (shown === "false") return null
    const asset = (await authDb.query(`SELECT mime, data FROM "${row.schema_name}".brand_assets WHERE kind = $1`, [productId === "cover" ? "cover" : "logo"])
      .catch(() => ({ rows: [] as any[] }))).rows[0]
    if (asset) return { mime: String(asset.mime), data: Buffer.from(asset.data) }
    if (productId === "cover") return null
  }
  const value = productId == null
    ? (await authDb.query(`SELECT data->>'logo' AS image, data->>'showInMarketplace' AS shown FROM "${row.schema_name}".company_config WHERE id = 1`)).rows[0]
    : (await authDb.query(`SELECT data->>'image' AS image FROM "${row.schema_name}".products WHERE id = $1 AND data->>'isActive' IS DISTINCT FROM 'false'`, [productId])).rows[0]
  const match = typeof value?.image === "string" ? value.image.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/) : null
  if (!match || value?.shown === "false") return null
  return { mime: match[1], data: Buffer.from(match[2], "base64") }
}
