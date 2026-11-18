import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission, hashPassword } from "@/lib/auth"
import { authDb } from "@/lib/db"
import { userRecord, validateUser } from "@/lib/user-records"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_users")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const result = await authDb.query(`SELECT id, name, email, username, role, permissions, is_active, last_login, created_at FROM public.app_users WHERE restaurant_id = $1 ORDER BY id`, [user.restaurantId])
  return NextResponse.json({ users: result.rows.map(userRecord) })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_users")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  try {
    const input = validateUser(await request.json(), true)
    const result = await authDb.query(
      `INSERT INTO public.app_users (name, email, username, role, permissions, is_active, password_hash, restaurant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, username, role, permissions, is_active, last_login, created_at`,
      [input.name, input.email, input.username, input.role, input.permissions, input.isActive, hashPassword(input.password), user.restaurantId],
    )
    return NextResponse.json({ user: userRecord(result.rows[0]) }, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "Ya existe ese email o usuario." }, { status: 409 })
    }
    if (error instanceof Error && !("code" in error)) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error("User creation failed", error)
    return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 500 })
  }
}
