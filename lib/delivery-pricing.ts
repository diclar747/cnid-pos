// Cómo cobra el delivery cada restaurante (Empresa → Delivery): por zonas, por kilómetro o un precio fijo.
// Sin dependencias del servidor: lo usan el pedido web, el asistente de WhatsApp, Pedidos y la ficha pública.

export type DeliveryPricing = {
  mode: "zones" | "km" | "fixed"
  /** Gs por kilómetro (modo km). */
  perKm: number
  /** Salida fija que se suma al precio por km. */
  baseFee: number
  /** Envío mínimo (modo km). */
  minFee: number
  /** Distancia máxima en km (vacío = sin límite). */
  maxKm: number | null
  /** Precio único (modo fijo). */
  fixedFee: number
  /** Envío gratis desde este subtotal (vacío = nunca). */
  freeOver: number | null
  /** Redondeo hacia arriba (Gs). */
  roundTo: number
}

export const DEFAULT_PRICING: DeliveryPricing = { mode: "zones", perKm: 1000, baseFee: 0, minFee: 0, maxKm: null, fixedFee: 0, freeOver: null, roundTo: 500 }

const money = (value: unknown, fallback: number, max = 10_000_000) => { const n = Math.round(Number(value)); return Number.isFinite(n) && n >= 0 && n <= max ? n : fallback }
const optional = (value: unknown, max: number) => { if (value === null || value === undefined || value === "") return null; const n = Number(value); return Number.isFinite(n) && n > 0 && n <= max ? n : null }

/** Configuración guardada (company_config.deliveryPricing) con valores seguros. */
export function deliveryPricing(config: any): DeliveryPricing {
  const raw = config?.deliveryPricing ?? {}
  const mode = raw.mode === "km" || raw.mode === "fixed" ? raw.mode : "zones"
  const roundTo = [1, 100, 500, 1000].includes(Number(raw.roundTo)) ? Number(raw.roundTo) : DEFAULT_PRICING.roundTo
  return { mode, perKm: money(raw.perKm, DEFAULT_PRICING.perKm, 1_000_000), baseFee: money(raw.baseFee, 0), minFee: money(raw.minFee, 0), maxKm: optional(raw.maxKm, 500),
    fixedFee: money(raw.fixedFee, 0), freeOver: optional(raw.freeOver, 100_000_000), roundTo }
}

export type LatLng = { lat: number; lng: number }

/** Ubicación del local (Empresa → Ficha). */
export function restaurantLocation(config: any): LatLng | null {
  const lat = Number(String(config?.latitude ?? "").replace(",", ".")), lng = Number(String(config?.longitude ?? "").replace(",", "."))
  if (!String(config?.latitude ?? "").trim() || !String(config?.longitude ?? "").trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

/** Distancia en km (línea recta, haversine). */
export function distanceKm(a: LatLng, b: LatLng) {
  const rad = (value: number) => value * Math.PI / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export type DeliveryQuote = { fee: number; km: number | null; label: string; free: boolean }

/**
 * Precio del envío según el modo. En «por km» hace falta la ubicación del cliente y la del local;
 * sin ellas devuelve null (el local la confirma). Lanza si queda fuera de la distancia máxima.
 */
export function quoteDelivery(pricing: DeliveryPricing, origin: LatLng | null, destination: LatLng | null, subtotal: number): DeliveryQuote | null {
  const free = pricing.freeOver != null && subtotal >= pricing.freeOver
  if (pricing.mode === "fixed") return { fee: free ? 0 : pricing.fixedFee, km: origin && destination ? round1(distanceKm(origin, destination)) : null, label: "Envío", free }
  if (pricing.mode !== "km" || !origin || !destination) return null
  const km = round1(distanceKm(origin, destination))
  if (pricing.maxKm != null && km > pricing.maxKm) throw new DeliveryRangeError(km, pricing.maxKm)
  const raw = Math.max(pricing.minFee, pricing.baseFee + km * pricing.perKm)
  const fee = free ? 0 : Math.ceil(raw / pricing.roundTo) * pricing.roundTo
  return { fee, km, label: `${km.toLocaleString("es-PY", { maximumFractionDigits: 1 })} km`, free }
}

const round1 = (value: number) => Math.round(value * 10) / 10

export class DeliveryRangeError extends Error {
  km: number
  maxKm: number
  constructor(km: number, maxKm: number) {
    super(`Tu ubicación está a ${km.toLocaleString("es-PY", { maximumFractionDigits: 1 })} km y el delivery llega hasta ${maxKm} km.`)
    this.km = km; this.maxKm = maxKm
  }
}

/** Coordenadas de un enlace de Google Maps (…/@-25.78,-56.44,17z, ?q=-25.78,-56.44, !3d-25.78!4d-56.44) o «lat, lng». */
export function coordinatesFrom(text: string): LatLng | null {
  const value = decodeURIComponent(String(text ?? "")).trim()
  const patterns = [/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, /[?&](?:q|query|ll|destination|center)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, /^(-?\d{1,2}[.,]\d+)\s*[,;\s]\s*(-?\d{1,3}[.,]\d+)$/]
  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (!match) continue
    const lat = Number(match[1].replace(",", ".")), lng = Number(match[2].replace(",", "."))
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) return { lat, lng }
  }
  return null
}
