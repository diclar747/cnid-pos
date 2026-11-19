import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { decodeDataUrl, downloadImage, ImageError, imageUrlFor, newImageId } from "@/lib/product-images"
import { clientIp, rateLimited } from "@/lib/table-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Foto de un producto: desde la computadora o pegada en base64 ({ dataUrl }) o desde una dirección web ({ url }).
// Con { replace } reemplaza una foto anterior (la versión reducida de una descargada).
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_products")) return NextResponse.json({ error: "Sin permiso para editar productos." }, { status: 403 })
  if (!user.restaurantId) return NextResponse.json({ error: "Elegí un restaurante." }, { status: 400 })
  if (rateLimited(`product-image:${user.id}:${clientIp(request.headers)}`, 60, 10 * 60_000)) return NextResponse.json({ error: "Demasiadas imágenes seguidas. Probá en unos minutos." }, { status: 429 })
  const body = await request.json().catch(() => null)
  try {
    const image = typeof body?.dataUrl === "string" ? { ...decodeDataUrl(body.dataUrl), sourceUrl: "" }
      : typeof body?.url === "string" && body.url.trim() ? await downloadImage(body.url)
      : null
    if (!image) return NextResponse.json({ error: "Elegí una imagen o pegá su dirección." }, { status: 400 })
    if (image.data.length > 4_000_000 && typeof body?.dataUrl === "string") throw new ImageError("La imagen es demasiado pesada (máximo 4 MB).", 413)
    const id = newImageId()
    await db.query("INSERT INTO product_images (id, mime, data, source_url) VALUES ($1,$2,$3,$4)", [id, image.mime, image.data, image.sourceUrl])
    if (typeof body?.replace === "string" && /^[a-f0-9]{24}$/.test(body.replace)) await db.query("DELETE FROM product_images WHERE id = $1", [body.replace])
    return NextResponse.json({ id, url: imageUrlFor(Number(user.restaurantId), id), bytes: image.data.length, mime: image.mime }, { status: 201 })
  } catch (error) {
    if (error instanceof ImageError) return NextResponse.json({ error: error.message }, { status: error.status })
    throw error
  }
}
