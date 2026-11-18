import { NextRequest, NextResponse } from "next/server"
import { storedImage } from "@/lib/marketplace"

export const runtime = "nodejs"
type Context = { params: Promise<{ slug: string; id: string }> }

export async function GET(_request: NextRequest, { params }: Context) {
  const { slug, id } = await params
  const productId = Number(id)
  if (!Number.isSafeInteger(productId) || productId <= 0) return new NextResponse(null, { status: 404 })
  const image = await storedImage(slug, productId)
  if (!image) return new NextResponse(null, { status: 404 })
  return new NextResponse(new Uint8Array(image.data), { headers: { "Content-Type": image.mime, "Cache-Control": "public, max-age=600",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } })
}
