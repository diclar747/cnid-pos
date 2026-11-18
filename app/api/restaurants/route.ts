import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { authDb } from "@/lib/db"
import { createRestaurant, requireSuperadmin } from "@/lib/restaurant-admin"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  if (!requireSuperadmin(await getSessionUser(request))) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const result = await authDb.query(`SELECT r.*,
    (SELECT COUNT(*)::integer FROM public.app_users u WHERE u.restaurant_id = r.id) AS user_count,
    (SELECT MAX(u.last_login) FROM public.app_users u WHERE u.restaurant_id = r.id) AS last_login,
    (SELECT u.name FROM public.app_users u WHERE u.restaurant_id = r.id AND u.role = 'admin' ORDER BY u.id LIMIT 1) AS admin_name,
    (SELECT u.email FROM public.app_users u WHERE u.restaurant_id = r.id AND u.role = 'admin' ORDER BY u.id LIMIT 1) AS admin_email
    FROM public.restaurants r ORDER BY r.created_at DESC, r.id DESC`)
  return NextResponse.json({ restaurants: result.rows })
}

export async function POST(request: NextRequest) {
  if (!requireSuperadmin(await getSessionUser(request))) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  try {
    const result = await createRestaurant(await request.json())
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "El código, email o usuario ya existe." }, { status: 409 })
    }
    console.error("Restaurant creation failed", error)
    return NextResponse.json({ error: error instanceof Error && !("code" in error) ? error.message : "No se pudo crear el restaurante." }, { status: 400 })
  }
}
