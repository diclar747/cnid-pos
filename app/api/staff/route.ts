import { NextRequest, NextResponse } from "next/server"
import { authDb } from "@/lib/db"
import { getSessionUser, hasPermission } from "@/lib/auth"
import type { StaffMember } from "@/lib/service-order-types"

export const runtime = "nodejs"

// Personal activo del restaurante para asignar mesero. Los meseros aparecen primero.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos") || !user.restaurantId) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const result = await authDb.query(`SELECT id, name, role FROM public.app_users
    WHERE restaurant_id = $1 AND is_active = TRUE AND role IN ('waiter', 'cashier', 'manager', 'admin')
    ORDER BY CASE role WHEN 'waiter' THEN 0 ELSE 1 END, name`, [user.restaurantId])
  const staff: StaffMember[] = result.rows.map((row) => ({ id: Number(row.id), name: row.name, role: row.role }))
  return NextResponse.json({ staff })
}
