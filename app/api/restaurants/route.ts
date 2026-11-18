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
  // Indicadores por restaurante (cada uno en su esquema): ventas de hoy y 30 días, pedidos abiertos y WhatsApp.
  const metrics = await Promise.all(result.rows.map(async (row) => {
    if (row.status === "deleted" || !/^(public|restaurant_[0-9]+)$/.test(row.schema_name)) return null
    try {
      const schema = row.schema_name
      const values = (await authDb.query(`SELECT
          (SELECT COALESCE(SUM((data->>'total')::bigint), 0) FROM "${schema}".sales WHERE created_at >= (NOW() AT TIME ZONE 'America/Asuncion')::date::timestamp AT TIME ZONE 'America/Asuncion'
            AND COALESCE(data->>'paymentStatus', 'confirmed') <> 'rejected') AS sales_today,
          (SELECT COALESCE(SUM((data->>'total')::bigint), 0) FROM "${schema}".sales WHERE created_at > NOW() - INTERVAL '30 days' AND COALESCE(data->>'paymentStatus', 'confirmed') <> 'rejected') AS sales_30d,
          (SELECT COUNT(*) FROM "${schema}".sales WHERE created_at > NOW() - INTERVAL '30 days') AS sales_count_30d,
          (SELECT COUNT(*) FROM "${schema}".service_orders WHERE status = 'open') AS open_orders,
          (SELECT status FROM "${schema}".whatsapp_session WHERE id = 1) AS whatsapp`)).rows[0]
      return { salesToday: Number(values.sales_today), sales30d: Number(values.sales_30d), salesCount30d: Number(values.sales_count_30d),
        openOrders: Number(values.open_orders), whatsapp: values.whatsapp ?? "disconnected" }
    } catch { return null }
  }))
  return NextResponse.json({ restaurants: result.rows.map((row, index) => ({ ...row, metrics: metrics[index] })) })
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
