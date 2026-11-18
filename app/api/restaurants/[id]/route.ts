import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { authDb } from "@/lib/db"
import { requireSuperadmin, restaurantInput } from "@/lib/restaurant-admin"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Context) {
  if (!requireSuperadmin(await getSessionUser(request))) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Restaurante inválido." }, { status: 400 })
  try {
    const body = await request.json()
    if (body && typeof body === "object" && "status" in body) {
      if (!["active", "suspended", "deleted"].includes(body.status)) throw new Error("Estado inválido.")
      if (id === 1 && body.status === "deleted") throw new Error("De la Casa contiene los datos históricos y no se puede eliminar desde aquí.")
      const client = await authDb.connect()
      try {
        await client.query("BEGIN")
        const result = await client.query(`UPDATE public.restaurants SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [body.status, id])
        if (!result.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "No encontrado." }, { status: 404 }) }
        if (body.status !== "active") await client.query(`DELETE FROM public.app_sessions WHERE user_id IN (SELECT id FROM public.app_users WHERE restaurant_id = $1)`, [id])
        await client.query("COMMIT")
        return NextResponse.json({ restaurant: result.rows[0] })
      } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error }
      finally { client.release() }
    }
    const input = restaurantInput(body)
    const result = await authDb.query(
      `UPDATE public.restaurants SET name=$1, slug=$2, legal_name=$3, tax_id=$4, email=$5,
       phone=$6, address=$7, notes=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [input.name, input.slug, input.legalName, input.taxId, input.email, input.phone, input.address, input.notes, id],
    )
    if (!result.rows[0]) return NextResponse.json({ error: "No encontrado." }, { status: 404 })
    return NextResponse.json({ restaurant: result.rows[0] })
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") return NextResponse.json({ error: "El código ya existe." }, { status: 409 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar." }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const confirmation = request.headers.get("x-confirm-restaurant")
  const id = (await context.params).id
  if (confirmation !== id) return NextResponse.json({ error: "Confirmá el restaurante a eliminar." }, { status: 400 })
  return PATCH(new NextRequest(request.url, { method: "PATCH", headers: request.headers, body: JSON.stringify({ status: "deleted" }) }), context)
}
