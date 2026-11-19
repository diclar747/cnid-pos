import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

// Archivo de WhatsApp (audio, imagen, video, sticker o documento) para verlo o descargarlo en el chat (solo personal).
// Se muestran en el navegador solo tipos seguros; el resto se descarga. Videos y audios admiten rangos (adelantar).
const INLINE = /^(image\/(jpeg|png|webp|gif)|audio\/[a-z0-9.+-]+|video\/(mp4|webm|3gpp|quicktime)|application\/pdf)$/i

export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Archivo inválido." }, { status: 400 })
  const row = (await db.query("SELECT mime, data, file_name FROM wa_media WHERE id = $1", [id])).rows[0]
  if (!row) return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 })
  const data: Buffer = row.data
  const mime = String(row.mime ?? "")
  const inline = INLINE.test(mime) && request.nextUrl.searchParams.get("download") !== "1"
  const name = (String(row.file_name || "") || `archivo-${id}`).replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/g, "_").slice(0, 120)
  const headers: Record<string, string> = {
    "Content-Type": inline ? mime : "application/octet-stream", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox", "Accept-Ranges": "bytes",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`,
  }
  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/)
  if (range && (range[1] || range[2])) {
    const size = data.length
    let start = range[1] ? Number(range[1]) : size - Number(range[2])
    let end = range[1] && range[2] ? Number(range[2]) : size - 1
    start = Math.max(0, start); end = Math.min(size - 1, end)
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } })
    return new Response(new Uint8Array(data.subarray(start, end + 1)), { status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) } })
  }
  return new Response(new Uint8Array(data), { headers: { ...headers, "Content-Length": String(data.length) } })
}
