import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

// Marca un llamado de mesa como atendido.
export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Llamado inválido." }, { status: 400 })
  const result = await db.query(`UPDATE table_calls SET status = 'attended', attended_at = NOW(), attended_by = $2, attended_by_name = $3
    WHERE id = $1 AND status = 'open' RETURNING id`, [id, Number(user.id), user.name])
  return result.rows[0] ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "El llamado ya fue atendido." }, { status: 409 })
}
