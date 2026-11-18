import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { NiroError, niroModels } from "@/lib/niro"

export const runtime = "nodejs"

// Modelos de chat habilitados en Niro (para mostrar en la configuración).
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  try { return NextResponse.json({ models: await niroModels() }) }
  catch (error) { return NextResponse.json({ error: error instanceof NiroError ? error.message : "No se pudo consultar Niro." }, { status: error instanceof NiroError ? error.status : 502 }) }
}

// Activar el asistente y personalizar sus instrucciones y saludo.
export async function PUT(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Datos inválidos." }, { status: 400 })
  const instructions = typeof body.instructions === "string" ? body.instructions.trim().slice(0, 4000) : null
  const greeting = typeof body.greeting === "string" ? body.greeting.trim().slice(0, 600) : null
  const enabled = typeof body.enabled === "boolean" ? body.enabled : null
  await db.query(`UPDATE ai_settings SET enabled = COALESCE($1, enabled), instructions = COALESCE($2, instructions), greeting = COALESCE($3, greeting),
    updated_at = NOW() WHERE id = 1`, [enabled, instructions, greeting])
  return NextResponse.json({ ok: true })
}
