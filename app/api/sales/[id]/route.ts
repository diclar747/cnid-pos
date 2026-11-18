import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUser, hasPermission } from "@/lib/auth"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

// Una venta para reimprimir su comprobante.
export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Venta inválida." }, { status: 400 })
  const result = await db.query("SELECT id, data, created_at FROM sales WHERE id = $1", [id])
  const row = result.rows[0]
  if (!row) return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 })
  return NextResponse.json({ sale: { ...row.data, id: Number(row.id), date: row.data.date ?? new Date(row.created_at).toISOString() } })
}
