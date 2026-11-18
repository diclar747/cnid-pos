import { NextRequest, NextResponse } from "next/server"
import { findTable, locateTable } from "@/lib/table-access"

export const runtime = "nodejs"
type Context = { params: Promise<{ code: string }> }

// Manifiesto de la carta de cada mesa: al instalarla, abre directo el menú de esa mesa.
export async function GET(_request: NextRequest, { params }: Context) {
  const place = await locateTable((await params).code)
  if (!place) return NextResponse.json({ error: "Mesa no disponible." }, { status: 404 })
  const table = await findTable(place)
  const label = table?.label ?? "Mesa"
  return NextResponse.json({
    id: `/table/${place.code}`,
    name: `${place.restaurantName} · ${label}`,
    short_name: place.restaurantName.slice(0, 24),
    description: `Carta de ${place.restaurantName}: pedí desde ${label} y recibí avisos de tu pedido.`,
    start_url: `/table/${place.code}`,
    scope: "/table/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef2ff",
    theme_color: "#4338ca",
    icons: [
      { src: "/brand/restopos-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/restopos-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" } })
}
