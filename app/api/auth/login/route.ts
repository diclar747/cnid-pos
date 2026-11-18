import { NextRequest, NextResponse } from "next/server"
import { authDb } from "@/lib/db"
import { createSessionToken, hashToken, publicUser, SESSION_COOKIE, SESSION_MAX_AGE, verifyPassword } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  if (!email || !password) {
    return NextResponse.json({ error: "Ingresá el usuario y la contraseña." }, { status: 400 })
  }

  const result = await authDb.query(
    `SELECT u.*, r.name AS restaurant_name, r.status AS restaurant_status
       FROM public.app_users u LEFT JOIN public.restaurants r ON r.id = u.restaurant_id
      WHERE LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1) LIMIT 1`,
    [email],
  )
  const account = result.rows[0]
  if (!account || !account.is_active || (account.role !== "superadmin" && account.restaurant_status !== "active") || !verifyPassword(password, account.password_hash)) {
    return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 })
  }

  const token = createSessionToken()
  await authDb.query(
    `INSERT INTO public.app_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [hashToken(token), account.id],
  )
  await authDb.query(`UPDATE public.app_users SET last_login = NOW() WHERE id = $1`, [account.id])

  const response = NextResponse.json({ user: publicUser(account) })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
  return response
}
