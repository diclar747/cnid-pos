import { NextRequest, NextResponse } from "next/server"
import { authDb } from "@/lib/db"
import { getCustomer } from "@/lib/customer-account"
import { validSubscription } from "@/lib/web-push-crypto"
import { sendPush, vapidKeys } from "@/lib/web-push"

export const runtime = "nodejs"

// Clave pública para que el navegador del cliente se suscriba a los avisos.
export async function GET() {
  return NextResponse.json({ publicKey: (await vapidKeys()).publicKey })
}

// El cliente activa los avisos de todos sus pedidos en este teléfono.
export async function POST(request: NextRequest) {
  const account = await getCustomer(request)
  if (!account) return NextResponse.json({ error: "Ingresá a tu cuenta." }, { status: 401 })
  const subscription = validSubscription((await request.json().catch(() => null))?.subscription)
  if (!subscription) return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 })
  await authDb.query(`INSERT INTO public.customer_push (account_id, endpoint, p256dh, auth) VALUES ($1,$2,$3,$4)
    ON CONFLICT (endpoint) DO UPDATE SET account_id = EXCLUDED.account_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, created_at = NOW()`,
    [account.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth])
  const test = await sendPush(subscription, { title: "Avisos activados", body: "Te avisamos cuando tus pedidos se confirmen, estén listos o salgan en camino.", url: "/cuenta", tag: "customer-push" })
  return NextResponse.json({ ok: true, delivered: test.ok })
}

export async function DELETE(request: NextRequest) {
  const account = await getCustomer(request)
  if (!account) return NextResponse.json({ error: "Ingresá a tu cuenta." }, { status: 401 })
  const endpoint = (await request.json().catch(() => null))?.endpoint
  if (typeof endpoint === "string") await authDb.query("DELETE FROM public.customer_push WHERE account_id = $1 AND endpoint = $2", [account.id, endpoint])
  return NextResponse.json({ ok: true })
}
