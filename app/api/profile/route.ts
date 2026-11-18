import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hashPassword, publicUser, verifyPassword } from "@/lib/auth"
import { authDb } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  return NextResponse.json({ user })
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Datos inválidos." }, { status: 400 })
  const name = String(body.name ?? "").trim().slice(0, 120)
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 180)
  const username = String(body.username ?? "").trim().slice(0, 80)
  const avatarData = String(body.avatarData ?? "")
  const currentPassword = String(body.currentPassword ?? "")
  const newPassword = String(body.newPassword ?? "")
  if (!name || !email.includes("@") || !username) return NextResponse.json({ error: "Completá nombre, email y usuario." }, { status: 400 })
  if (avatarData && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarData) || avatarData.length > 700_000)) {
    return NextResponse.json({ error: "Usá una imagen PNG, JPG o WebP de hasta 500 KB." }, { status: 400 })
  }
  if (newPassword && newPassword.length < 10) return NextResponse.json({ error: "La nueva contraseña debe tener al menos 10 caracteres." }, { status: 400 })
  if (newPassword) {
    const stored = await authDb.query(`SELECT password_hash FROM public.app_users WHERE id = $1`, [user.id])
    if (!stored.rows[0] || !verifyPassword(currentPassword, stored.rows[0].password_hash)) {
      return NextResponse.json({ error: "La contraseña actual no coincide." }, { status: 400 })
    }
  }
  try {
    const result = await authDb.query(
      `UPDATE public.app_users SET name=$1, email=$2, username=$3, avatar_data=$4,
       password_hash=COALESCE($5,password_hash) WHERE id=$6
       RETURNING id, name, email, username, role, permissions, is_active, restaurant_id, avatar_data`,
      [name, email, username, avatarData, newPassword ? hashPassword(newPassword) : null, user.id],
    )
    return NextResponse.json({ user: { ...publicUser(result.rows[0]), restaurantName: user.restaurantName } })
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") return NextResponse.json({ error: "El email o usuario ya está en uso." }, { status: 409 })
    return NextResponse.json({ error: "No se pudo guardar el perfil." }, { status: 500 })
  }
}
