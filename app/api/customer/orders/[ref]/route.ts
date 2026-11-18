import { NextRequest, NextResponse } from "next/server"
import { getCustomer } from "@/lib/customer-account"
import { getOrder } from "@/lib/customer-orders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ ref: string }> }

// Seguimiento de un pedido del cliente: etapa, productos, total e historial de estados.
export async function GET(request: NextRequest, { params }: Context) {
  const account = await getCustomer(request)
  if (!account) return NextResponse.json({ error: "Ingresá a tu cuenta." }, { status: 401 })
  const order = await getOrder(account.id, (await params).ref)
  if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 })
  return NextResponse.json({ order }, { headers: { "Cache-Control": "no-store" } })
}
