import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseRange, restaurantStats } from "@/lib/stats"

export const runtime = "nodejs"

// Estadísticas del restaurante para un período (por defecto, los últimos 30 días).
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "view_reports")) return NextResponse.json({ error: "Sin permiso para ver estadísticas." }, { status: 403 })
  let range
  try { range = parseRange(request.nextUrl.searchParams.get("from"), request.nextUrl.searchParams.get("to")) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Período inválido." }, { status: 400 }) }
  return NextResponse.json(await restaurantStats(db, range))
}
