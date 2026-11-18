import { NextRequest, NextResponse } from "next/server"
import { storedImage } from "@/lib/marketplace"

export const runtime = "nodejs"
type Context = { params: Promise<{ slug: string }> }

export async function GET(_request: NextRequest, { params }: Context) {
  const image = await storedImage((await params).slug, null)
  if (!image) return new NextResponse(null, { status: 404 })
  return new NextResponse(new Uint8Array(image.data), { headers: { "Content-Type": image.mime, "Cache-Control": "public, max-age=600",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } })
}
