import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

// Audio o imagen recibido por WhatsApp, para escucharlo o verlo en la bandeja (solo personal del restaurante).
export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Archivo inválido." }, { status: 400 })
  const row = (await db.query("SELECT mime, data FROM wa_media WHERE id = $1", [id])).rows[0]
  if (!row) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 })
  const data: Buffer = row.data
  return new Response(new Uint8Array(data), { headers: { "Content-Type": /^(audio|image)\/[a-z0-9.+-]+$/i.test(row.mime) ? row.mime : "application/octet-stream",
    "Content-Length": String(data.length), "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "Accept-Ranges": "none" } })
}
