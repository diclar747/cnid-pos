import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"
type Context = { params: Promise<{ kind: string }> }
const KINDS = ["logo", "cover"] as const
const FIELD = { logo: "logo", cover: "coverImage" } as const
const MAX_BYTES = { logo: 600_000, cover: 1_800_000 }
const isKind = (value: string): value is (typeof KINDS)[number] => (KINDS as readonly string[]).includes(value)
const imageHeaders = (mime: string) => ({ "Content-Type": mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" })

// Logo y portada del restaurante (para el encabezado, los tickets y la ficha).
export async function GET(request: NextRequest, { params }: Context) {
  const kind = (await params).kind
  if (!isKind(kind)) return new NextResponse(null, { status: 404 })
  if (!(await getSessionUser(request))) return new NextResponse(null, { status: 401 })
  const row = (await db.query("SELECT mime, data FROM brand_assets WHERE kind = $1", [kind])).rows[0]
  if (!row) return new NextResponse(null, { status: 404 })
  return new NextResponse(new Uint8Array(row.data), { headers: imageHeaders(row.mime) })
}

// Subir (imagen ya reducida en el navegador, como data URL) o quitar. Solo la administración.
export async function POST(request: NextRequest, { params }: Context) {
  const kind = (await params).kind
  if (!isKind(kind)) return NextResponse.json({ error: "Imagen desconocida." }, { status: 404 })
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Solo la administración cambia la imagen del restaurante." }, { status: 403 })
  const body = await request.json().catch(() => null)
  const match = typeof body?.dataUrl === "string" ? body.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/) : null
  if (!match) return NextResponse.json({ error: "Elegí una imagen PNG, JPG o WEBP." }, { status: 400 })
  const data = Buffer.from(match[2], "base64")
  if (data.length > MAX_BYTES[kind]) return NextResponse.json({ error: "La imagen es demasiado pesada." }, { status: 413 })
  const url = `/api/brand/${kind}?v=${Date.now().toString(36)}`
  await db.query(`INSERT INTO brand_assets (kind, mime, data, updated_at) VALUES ($1,$2,$3,NOW())
    ON CONFLICT (kind) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, updated_at = NOW()`, [kind, match[1], data])
  await db.query(`INSERT INTO company_config (id, data) VALUES (1, jsonb_build_object($1::text, $2::text))
    ON CONFLICT (id) DO UPDATE SET data = company_config.data || jsonb_build_object($1::text, $2::text), updated_at = NOW()`, [FIELD[kind], url])
  return NextResponse.json({ url }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const kind = (await params).kind
  if (!isKind(kind)) return NextResponse.json({ error: "Imagen desconocida." }, { status: 404 })
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  await db.query("DELETE FROM brand_assets WHERE kind = $1", [kind])
  await db.query(`UPDATE company_config SET data = data || jsonb_build_object($1::text, ''::text), updated_at = NOW() WHERE id = 1`, [FIELD[kind]])
  return NextResponse.json({ ok: true })
}
