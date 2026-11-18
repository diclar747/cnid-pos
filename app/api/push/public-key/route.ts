import { NextResponse } from "next/server"
import { vapidKeys } from "@/lib/web-push"

export const runtime = "nodejs"

// Clave pública VAPID para que el navegador cree la suscripción push.
export async function GET() {
  return NextResponse.json({ publicKey: (await vapidKeys()).publicKey }, { headers: { "Cache-Control": "public, max-age=3600" } })
}
