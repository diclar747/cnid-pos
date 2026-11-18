import { NextRequest, NextResponse } from "next/server"
import { getCustomer } from "@/lib/customer-account"
import { listOrders, placeOrder } from "@/lib/customer-orders"
import { ServiceOrderError } from "@/lib/service-order-server"
import { rateLimited } from "@/lib/table-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Historial de pedidos del cliente en todos los restaurantes, con su estado actual.
export async function GET(request: NextRequest) {
  const account = await getCustomer(request)
  if (!account) return NextResponse.json({ error: "Ingresá a tu cuenta." }, { status: 401 })
  return NextResponse.json({ items: await listOrders(account.id) }, { headers: { "Cache-Control": "no-store" } })
}

// Nuevo pedido desde el marketplace: entra como «Nuevo» en el tablero del restaurante.
export async function POST(request: NextRequest) {
  const account = await getCustomer(request)
  if (!account) return NextResponse.json({ error: "Ingresá a tu cuenta para pedir." }, { status: 401 })
  if (rateLimited(`customer-order:${account.id}`, 6, 10 * 60_000)) return NextResponse.json({ error: "Hiciste varios pedidos seguidos. Esperá unos minutos." }, { status: 429 })
  const body = await request.json().catch(() => null)
  if (!body || JSON.stringify(body).length > 20_000) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 })
  try {
    const { ref, order } = await placeOrder(account, body)
    return NextResponse.json({ ref, id: order.id, grandTotal: order.grandTotal }, { status: 201 })
  } catch (error) {
    if (error instanceof ServiceOrderError) return NextResponse.json({ error: error.message }, { status: error.status })
    throw error
  }
}
