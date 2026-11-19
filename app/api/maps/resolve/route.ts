import https from "node:https"
import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { coordinatesFrom } from "@/lib/delivery-pricing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Enlace corto de Google Maps (maps.app.goo.gl/…) → coordenadas. Solo sigue redirecciones dentro de Google.
const GOOGLE = /^(?:maps\.app\.goo\.gl|goo\.gl|(?:www\.|maps\.)?google\.[a-z.]{2,8})$/i

function head(url: URL): Promise<string | null> {
  return new Promise((resolve) => {
    const request = https.get(url, { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0 (RestoPOS)" } }, (response) => {
      response.resume()
      resolve(response.statusCode && response.statusCode >= 300 && response.statusCode < 400 ? response.headers.location ?? null : null)
    })
    request.on("timeout", () => { request.destroy(); resolve(null) })
    request.on("error", () => resolve(null))
  })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const body = await request.json().catch(() => null)
  const text = typeof body?.url === "string" ? body.url.trim().slice(0, 2000) : ""
  const direct = coordinatesFrom(text)
  if (direct) return NextResponse.json({ ...direct, url: text })
  let url: URL
  try { url = new URL(text) } catch { return NextResponse.json({ error: "Pegá el enlace de Google Maps o las coordenadas (ej.: -25.78, -56.44)." }, { status: 400 }) }
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== "https:" || !GOOGLE.test(url.hostname)) break
    const next = await head(url)
    if (!next) break
    url = new URL(next, url)
    const found = coordinatesFrom(url.toString())
    if (found) return NextResponse.json({ ...found, url: text })
  }
  return NextResponse.json({ error: "No encontramos coordenadas en ese enlace. En Google Maps tocá el lugar, «Compartir» → «Copiar enlace», o mantené presionado el punto y copiá las coordenadas." }, { status: 422 })
}
