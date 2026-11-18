import { NextRequest, NextResponse } from "next/server"
import { clientIp, findTable, locateTable, rateLimited } from "@/lib/table-access"
import { validSubscription } from "@/lib/web-push-crypto"
import { sendPush } from "@/lib/web-push"

export const runtime = "nodejs"
type Context = { params: Promise<{ code: string }> }

// El cliente activa los avisos de su pedido: se vincula a la cuenta abierta de la mesa.
export async function POST(request: NextRequest, { params }: Context) {
  const place = await locateTable((await params).code)
  if (!place) return NextResponse.json({ error: "Mesa no disponible." }, { status: 404 })
  if (rateLimited(`push:${clientIp(request.headers)}`, 10, 60_000)) return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 })
  const subscription = validSubscription((await request.json().catch(() => null))?.subscription)
  if (!subscription) return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 })
  const table = await findTable(place)
  if (!table) return NextResponse.json({ error: "Mesa inactiva." }, { status: 404 })
  if (!table.orderId) return NextResponse.json({ error: "Hacé tu pedido para recibir avisos." }, { status: 409 })
  await place.query(`INSERT INTO push_subscriptions (endpoint, p256dh, auth, scope, order_id, table_id)
    VALUES ($1, $2, $3, 'order', $4, $5)
    ON CONFLICT (endpoint, scope) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
      order_id = EXCLUDED.order_id, table_id = EXCLUDED.table_id, created_at = NOW()`,
    [subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, table.orderId, table.id])
  const test = await sendPush(subscription, { title: "Avisos activados", body: `Te avisamos cuando tu pedido de ${table.label} cambie de estado.`, url: `/table/${place.code}`, tag: "order-status" })
  return NextResponse.json({ ok: true, delivered: test.ok })
}
