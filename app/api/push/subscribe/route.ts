import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { validSubscription } from "@/lib/web-push-crypto"
import { sendPush } from "@/lib/web-push"

export const runtime = "nodejs"

// El personal activa en su dispositivo los avisos de pedidos y llamados de mesa.
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const subscription = validSubscription((await request.json().catch(() => null))?.subscription)
  if (!subscription) return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 })
  await db.query(`INSERT INTO push_subscriptions (endpoint, p256dh, auth, scope, user_id)
    VALUES ($1, $2, $3, 'staff', $4)
    ON CONFLICT (endpoint, scope) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_id = EXCLUDED.user_id, created_at = NOW()`,
    [subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, Number(user.id)])
  const test = await sendPush(subscription, { title: "Avisos del local activados", body: "Vas a recibir los pedidos y llamados de las mesas.", url: "/orders", tag: "staff-test" })
  return NextResponse.json({ ok: true, delivered: test.ok })
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  const endpoint = (await request.json().catch(() => null))?.endpoint
  if (typeof endpoint !== "string") return NextResponse.json({ error: "Falta el endpoint." }, { status: 400 })
  await db.query("DELETE FROM push_subscriptions WHERE endpoint = $1 AND scope = 'staff' AND user_id = $2", [endpoint, Number(user.id)])
  return NextResponse.json({ ok: true })
}
