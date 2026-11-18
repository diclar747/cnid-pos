import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission, hashPassword } from "@/lib/auth"
import { authDb } from "@/lib/db"
import { userRecord, validateUser } from "@/lib/user-records"

export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

async function authorized(request: NextRequest, params: Context["params"]) {
  const user = await getSessionUser(request)
  if (!user) return { error: NextResponse.json({ error: "Iniciá sesión." }, { status: 401 }) }
  if (!hasPermission(user, "manage_users")) return { error: NextResponse.json({ error: "Sin permiso." }, { status: 403 }) }
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return { error: NextResponse.json({ error: "Usuario inválido." }, { status: 400 }) }
  return { user, id }
}

export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await authorized(request, params)
  if (auth.error) return auth.error
  const { id, user } = auth
  try {
    const input = validateUser(await request.json(), false)
    if (String(id) === user.id && (!input.isActive || input.role !== "admin")) {
      return NextResponse.json({ error: "No podés quitarte el acceso de administrador." }, { status: 400 })
    }
    const result = await authDb.query(
      `UPDATE public.app_users
          SET name = $1, email = $2, username = $3, role = $4, permissions = $5,
              is_active = $6, password_hash = COALESCE($7, password_hash)
        WHERE id = $8 AND restaurant_id = $9
      RETURNING id, name, email, username, role, permissions, is_active, last_login, created_at`,
      [input.name, input.email, input.username, input.role, input.permissions, input.isActive,
        input.password ? hashPassword(input.password) : null, id, user.restaurantId],
    )
    if (!result.rows[0]) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 })
    return NextResponse.json({ user: userRecord(result.rows[0]) })
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "Ya existe ese email o usuario." }, { status: 409 })
    }
    if (error instanceof Error && !("code" in error)) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error("User update failed", error)
    return NextResponse.json({ error: "No se pudo actualizar el usuario." }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await authorized(request, params)
  if (auth.error) return auth.error
  const { id, user } = auth
  if (String(id) === user.id) return NextResponse.json({ error: "No podés eliminar tu propia cuenta." }, { status: 400 })
  const result = await authDb.query(`DELETE FROM public.app_users WHERE id = $1 AND restaurant_id = $2 RETURNING id`, [id, user.restaurantId])
  if (!result.rows[0]) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 })
  return NextResponse.json({ ok: true })
}
