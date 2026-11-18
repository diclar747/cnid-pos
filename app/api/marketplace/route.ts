import { NextResponse } from "next/server"
import { listRestaurants } from "@/lib/marketplace"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Público: restaurantes activos del marketplace con su ficha (sin datos de clientes ni ventas).
export async function GET() {
  const items = await listRestaurants()
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } })
}
