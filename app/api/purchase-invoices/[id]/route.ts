import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { cancelInvoice, loadInvoices, PurchaseError } from "@/lib/purchase-invoices"

export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_purchases") && !hasPermission(user, "manage_suppliers")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Factura inválida." }, { status: 400 })
  const [invoice] = await loadInvoices(db, [id])
  return invoice ? NextResponse.json({ invoice }) : NextResponse.json({ error: "Factura no encontrada." }, { status: 404 })
}

/** Anular: revierte el stock sumado y el egreso de caja (si la caja sigue abierta). */
export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_purchases")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = Number((await params).id)
  const body = await request.json().catch(() => null)
  if (!Number.isSafeInteger(id) || id <= 0 || body?.action !== "cancel") return NextResponse.json({ error: "Acción inválida." }, { status: 400 })
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (reason.length < 3) return NextResponse.json({ error: "Indicá el motivo de la anulación." }, { status: 400 })
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const note = await cancelInvoice(client, id, reason, user)
    const [invoice] = await loadInvoices(client, [id])
    await client.query("COMMIT")
    return NextResponse.json({ invoice, note })
  } catch (error) {
    await client.query("ROLLBACK")
    if (error instanceof PurchaseError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Purchase cancel failed", error)
    return NextResponse.json({ error: "No se pudo anular la factura." }, { status: 500 })
  } finally { client.release() }
}
