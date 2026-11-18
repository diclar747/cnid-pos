import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { listPaymentMethods } from "@/lib/cash"
import { cleanText } from "@/lib/service-order-server"

export const runtime = "nodejs"
const KINDS = ["cash", "card", "transfer", "qr", "other"]

// Medios de pago del restaurante. El POS ve los activos; la configuración, todos.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const all = request.nextUrl.searchParams.get("all") === "1" && hasPermission(user, "manage_company")
  const [methods, open] = await Promise.all([listPaymentMethods(db, !all), db.query("SELECT id FROM cash_sessions WHERE status = 'open'")])
  return NextResponse.json({ items: methods, cashOpen: Boolean(open.rows[0]) })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const body = await request.json().catch(() => null)
  const name = cleanText(body?.name, 60)
  if (!name || !KINDS.includes(body?.kind)) return NextResponse.json({ error: "Completá nombre y tipo." }, { status: 400 })
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24)
  const code = base.length >= 2 ? base : `medio_${Date.now().toString(36)}`
  const sort = Number((await db.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM payment_methods")).rows[0].n)
  const verify = body.kind === "cash" ? false : body.needsVerification === true || body.kind === "transfer" || body.kind === "qr"
  const created = await db.query(`INSERT INTO payment_methods (code, name, kind, needs_verification, sort_order) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (code) DO NOTHING RETURNING code`, [code, name, body.kind, verify, sort])
  if (!created.rows[0]) return NextResponse.json({ error: "Ya existe un medio de pago con ese nombre." }, { status: 409 })
  return NextResponse.json({ items: await listPaymentMethods(db) }, { status: 201 })
}
