import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { listPaymentMethods } from "@/lib/cash"
import { cleanText } from "@/lib/service-order-server"

export const runtime = "nodejs"
type Context = { params: Promise<{ code: string }> }

// Renombrar, activar o desactivar y exigir verificación en un medio de pago.
export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const code = (await params).code
  const body = await request.json().catch(() => null)
  const name = body?.name === undefined ? null : cleanText(body.name, 60)
  if (name === "") return NextResponse.json({ error: "El nombre no puede quedar vacío." }, { status: 400 })
  if (code === "cash" && body?.isActive === false) return NextResponse.json({ error: "El efectivo no se puede desactivar." }, { status: 400 })
  const updated = await db.query(`UPDATE payment_methods SET name = COALESCE($2, name), is_active = COALESCE($3, is_active),
    needs_verification = CASE WHEN kind = 'cash' THEN FALSE ELSE COALESCE($4, needs_verification) END
    WHERE code = $1 RETURNING code`, [code, name, typeof body?.isActive === "boolean" ? body.isActive : null,
    typeof body?.needsVerification === "boolean" ? body.needsVerification : null])
  if (!updated.rows[0]) return NextResponse.json({ error: "Medio de pago no encontrado." }, { status: 404 })
  return NextResponse.json({ items: await listPaymentMethods(db) })
}
