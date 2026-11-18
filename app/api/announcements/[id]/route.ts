import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { authDb } from "@/lib/db"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (user?.role !== "superadmin") return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id)) return NextResponse.json({ error: "Aviso inválido." }, { status: 400 })
  await authDb.query(`UPDATE public.announcements SET is_active = FALSE WHERE id = $1`, [id])
  return NextResponse.json({ ok: true })
}
