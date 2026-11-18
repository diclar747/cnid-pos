import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { authDb } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  const result = await authDb.query(
    `SELECT a.id, a.title, a.message, a.restaurant_id, a.created_at, r.name AS restaurant_name FROM public.announcements a
      LEFT JOIN public.restaurants r ON r.id = a.restaurant_id
      WHERE a.is_active = TRUE AND a.starts_at <= NOW() AND (a.ends_at IS NULL OR a.ends_at > NOW())
        AND ($2::boolean OR a.restaurant_id IS NULL OR a.restaurant_id = $1)
      ORDER BY a.created_at DESC LIMIT 30`, [user.restaurantId, user.role === "superadmin"],
  )
  return NextResponse.json({ announcements: result.rows })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (user?.role !== "superadmin") return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const body = await request.json().catch(() => null)
  const title = String(body?.title ?? "").trim().slice(0, 120)
  const message = String(body?.message ?? "").trim().slice(0, 2000)
  const restaurantId = body?.restaurantId ? Number(body.restaurantId) : null
  if (!title || !message || (restaurantId != null && !Number.isSafeInteger(restaurantId))) return NextResponse.json({ error: "Completá título y mensaje." }, { status: 400 })
  if (restaurantId != null) {
    const target = await authDb.query(`SELECT id FROM public.restaurants WHERE id = $1 AND status = 'active'`, [restaurantId])
    if (!target.rows[0]) return NextResponse.json({ error: "Restaurante no disponible." }, { status: 400 })
  }
  const result = await authDb.query(
    `INSERT INTO public.announcements (title, message, restaurant_id) VALUES ($1,$2,$3) RETURNING *`,
    [title, message, restaurantId],
  )
  return NextResponse.json({ announcement: result.rows[0] }, { status: 201 })
}
