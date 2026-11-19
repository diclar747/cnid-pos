import { NextRequest, NextResponse } from "next/server"
import { authDb } from "@/lib/db"

export const runtime = "nodejs"
type Context = { params: Promise<{ restaurant: string; id: string }> }

// Foto de un producto (pública: se ve en el POS, la carta de la mesa y el marketplace). No cambia nunca: cada foto nueva tiene otro id.
export async function GET(_request: NextRequest, { params }: Context) {
  const { restaurant, id } = await params
  const restaurantId = Number(restaurant)
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0 || !/^[a-f0-9]{24}$/.test(id)) return new NextResponse(null, { status: 404 })
  const schema = (await authDb.query("SELECT schema_name FROM public.restaurants WHERE id = $1", [restaurantId])).rows[0]?.schema_name
  if (!schema || !/^[a-z0-9_]+$/.test(schema)) return new NextResponse(null, { status: 404 })
  const row = (await authDb.query(`SELECT mime, data FROM "${schema}".product_images WHERE id = $1`, [id]).catch(() => ({ rows: [] as any[] }))).rows[0]
  if (!row) return new NextResponse(null, { status: 404 })
  return new NextResponse(new Uint8Array(row.data), { headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } })
}
