import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { currentSchema } from "@/lib/db"
import { rateLimited } from "@/lib/table-access"
import { startSession, stopSession } from "@/lib/whatsapp/session"

export const runtime = "nodejs"

// Conectar (genera el QR o reanuda), detener o desvincular el WhatsApp del restaurante.
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Solo la administración conecta WhatsApp." }, { status: 403 })
  const body = await request.json().catch(() => null)
  const schema = await currentSchema()
  if (rateLimited(`wa-session:${schema}`, 10, 60_000)) return NextResponse.json({ error: "Esperá un momento antes de volver a intentar." }, { status: 429 })
  try {
    if (body?.action === "connect") await startSession(schema)
    else if (body?.action === "disconnect") await stopSession(schema)
    else if (body?.action === "logout") await stopSession(schema, { logout: true })
    else return NextResponse.json({ error: "Acción inválida." }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("WhatsApp session action failed", error)
    return NextResponse.json({ error: error instanceof Error ? `No se pudo iniciar WhatsApp: ${error.message}` : "No se pudo iniciar WhatsApp." }, { status: 500 })
  }
}
