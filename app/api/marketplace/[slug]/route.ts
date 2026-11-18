import { NextRequest, NextResponse } from "next/server"
import { getRestaurant } from "@/lib/marketplace"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ slug: string }> }

// Público: ficha y menú activo de un restaurante.
export async function GET(_request: NextRequest, { params }: Context) {
  const found = await getRestaurant((await params).slug)
  if (!found) return NextResponse.json({ error: "Restaurante no disponible." }, { status: 404 })
  return NextResponse.json(found, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } })
}
