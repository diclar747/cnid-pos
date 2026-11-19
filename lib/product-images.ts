import "server-only"

import { lookup } from "node:dns"
import http from "node:http"
import https from "node:https"
import { isIP } from "node:net"
import { randomBytes } from "node:crypto"

// Fotos de productos: validación por contenido (no por la extensión), descarga segura desde una URL
// (solo direcciones públicas, con límite de tamaño y tiempo) y lectura de URLs de buscadores (Google Imágenes).

export const MAX_IMAGE_BYTES = 4_000_000
const MAX_DOWNLOAD_BYTES = 8_000_000

export class ImageError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}

export const newImageId = () => randomBytes(12).toString("hex")
export const imageUrlFor = (restaurantId: number, id: string) => `/api/product-images/${restaurantId}/${id}`

/** Tipo real de la imagen según sus primeros bytes. */
export function sniffImage(data: Buffer): "image/png" | "image/jpeg" | "image/webp" | "image/gif" | null {
  if (data.length > 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png"
  if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg"
  if (data.length > 12 && data.subarray(0, 4).toString("latin1") === "RIFF" && data.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp"
  if (data.length > 6 && /^GIF8[79]a$/.test(data.subarray(0, 6).toString("latin1"))) return "image/gif"
  return null
}

/** Imagen en base64 («data:image/…;base64,…»), también con espacios o saltos de línea al pegarla. */
export function decodeDataUrl(value: string) {
  const match = value.trim().match(/^data:image\/[a-z0-9.+-]+;base64,([\sA-Za-z0-9+/=_-]+)$/i)
  if (!match) throw new ImageError("El texto no es una imagen en base64 (data:image/…).")
  const data = Buffer.from(match[1].replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"), "base64")
  const mime = sniffImage(data)
  if (!mime) throw new ImageError("La imagen debe ser PNG, JPG, WEBP o GIF.")
  if (data.length > MAX_IMAGE_BYTES) throw new ImageError("La imagen es demasiado pesada (máximo 4 MB).", 413)
  return { data, mime }
}

/** De un enlace de buscador saca la dirección real de la imagen (Google Imágenes, redirecciones con ?url=). */
export function realImageUrl(value: string) {
  let url: URL
  try { url = new URL(value.trim()) } catch { throw new ImageError("La dirección no es válida.") }
  for (let i = 0; i < 3; i++) {
    const inner = url.searchParams.get("imgurl") ?? url.searchParams.get("mediaurl") ?? (/google\.|bing\.|duckduckgo\./.test(url.hostname) ? url.searchParams.get("url") ?? url.searchParams.get("u") : null)
    if (!inner) break
    try { url = new URL(inner) } catch { break }
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ImageError("Usá una dirección que empiece con http o https.")
  if (url.username || url.password) throw new ImageError("La dirección no puede llevar usuario ni contraseña.")
  return url
}

/** Direcciones que no se pueden descargar desde el servidor (red local, el propio equipo, etc.). */
function privateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224
  }
  const ip = address.toLowerCase()
  if (ip.startsWith("::ffff:")) return privateAddress(ip.slice(7))
  return ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb") || ip.startsWith("ff")
}

// Resolución de nombres que rechaza direcciones privadas en el momento de conectar (evita el cambio de DNS entre chequeo y conexión).
const safeLookup: typeof lookup = ((hostname: string, options: any, callback: any) => {
  const done = typeof options === "function" ? options : callback
  const opts = typeof options === "function" ? {} : options
  lookup(hostname, { ...opts, all: true }, (error, addresses: any) => {
    if (error) return done(error)
    const list = (Array.isArray(addresses) ? addresses : [{ address: addresses, family: 4 }]) as { address: string; family: number }[]
    if (!list.length || list.some((entry) => privateAddress(entry.address))) return done(new ImageError("Esa dirección no es pública."))
    if (opts.all) return done(null, list)
    done(null, list[0].address, list[0].family)
  })
}) as typeof lookup

function get(url: URL): Promise<{ status: number; location?: string; data?: Buffer }> {
  return new Promise((resolve, reject) => {
    if (isIP(url.hostname.replace(/^\[|\]$/g, "")) && privateAddress(url.hostname.replace(/^\[|\]$/g, ""))) return reject(new ImageError("Esa dirección no es pública."))
    const client = url.protocol === "https:" ? https : http
    const request = client.get(url, { lookup: safeLookup, timeout: 12_000, headers: { "User-Agent": "Mozilla/5.0 (RestoPOS)", Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.5" } }, (response) => {
      const status = response.statusCode ?? 0
      if (status >= 300 && status < 400 && response.headers.location) { response.resume(); return resolve({ status, location: response.headers.location }) }
      if (status !== 200) { response.resume(); return resolve({ status }) }
      const declared = Number(response.headers["content-length"] ?? 0)
      if (declared > MAX_DOWNLOAD_BYTES) { response.destroy(); return reject(new ImageError("La imagen de esa dirección es demasiado pesada.", 413)) }
      const chunks: Buffer[] = []; let size = 0
      response.on("data", (chunk: Buffer) => {
        size += chunk.length
        if (size > MAX_DOWNLOAD_BYTES) { response.destroy(); reject(new ImageError("La imagen de esa dirección es demasiado pesada.", 413)) } else chunks.push(chunk)
      })
      response.on("end", () => resolve({ status, data: Buffer.concat(chunks) }))
      response.on("error", reject)
    })
    request.on("timeout", () => request.destroy(new ImageError("La dirección tardó demasiado en responder.", 504)))
    request.on("error", (error) => reject(error instanceof ImageError ? error : new ImageError("No se pudo descargar la imagen de esa dirección.", 502)))
  })
}

/** Descarga la imagen de una URL pública (sigue hasta 4 redirecciones, revisando cada una). */
export async function downloadImage(value: string) {
  let url = realImageUrl(value)
  for (let hop = 0; hop < 5; hop++) {
    const result = await get(url)
    if (result.location) { url = realImageUrl(new URL(result.location, url).toString()); continue }
    if (!result.data) throw new ImageError(result.status === 403 || result.status === 401 ? "Ese sitio no deja descargar la imagen. Guardala en la computadora y subila." : result.status === 404 ? "No se encontró una imagen en esa dirección." : `El sitio respondió con un error (${result.status}). Abrí la imagen en el navegador y copiá su dirección, o guardala y subila.`, 502)
    const mime = sniffImage(result.data)
    if (!mime) throw new ImageError("Esa dirección no es una imagen PNG, JPG, WEBP o GIF (puede ser una página). Abrí la imagen y copiá su dirección.", 415)
    return { data: result.data, mime, sourceUrl: url.toString().slice(0, 2000) }
  }
  throw new ImageError("La dirección redirige demasiadas veces.", 502)
}
