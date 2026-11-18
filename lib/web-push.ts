import "server-only"

import { generateKeyPairSync } from "node:crypto"
import { authDb, type SchemaQuery } from "./db"
import { b64url, encryptPayload, fromB64url, isPushServiceUrl, vapidJwt, type PushSubscriptionInput } from "./web-push-crypto"

// Envío de notificaciones Web Push (sin dependencias, ver web-push-crypto.ts).
// Las claves VAPID se generan una vez y se guardan en public.system_settings.

export interface PushMessage {
  title: string
  body: string
  url?: string
  tag?: string
}

type VapidKeys = { publicKey: string; privateJwk: Record<string, string> }
let cachedKeys: VapidKeys | null = null

/** Claves VAPID del sistema: se crean la primera vez y se reutilizan siempre. */
export async function vapidKeys(): Promise<VapidKeys> {
  if (cachedKeys) return cachedKeys
  const stored = await authDb.query("SELECT value FROM public.system_settings WHERE key = 'vapid'")
  if (stored.rows[0]) return (cachedKeys = stored.rows[0].value as VapidKeys)
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
  const pub = publicKey.export({ format: "jwk" }) as Record<string, string>
  const keys: VapidKeys = {
    publicKey: b64url(Buffer.concat([Buffer.from([4]), fromB64url(pub.x), fromB64url(pub.y)])),
    privateJwk: privateKey.export({ format: "jwk" }) as Record<string, string>,
  }
  // Si dos procesos generan a la vez, gana el primero y ambos usan el mismo valor.
  await authDb.query("INSERT INTO public.system_settings (key, value) VALUES ('vapid', $1::jsonb) ON CONFLICT (key) DO NOTHING", [JSON.stringify(keys)])
  const final = await authDb.query("SELECT value FROM public.system_settings WHERE key = 'vapid'")
  return (cachedKeys = final.rows[0].value as VapidKeys)
}

export type PushResult = { ok: boolean; status: number; gone: boolean }

/** Envía una notificación. `gone` indica que la suscripción ya no existe y conviene borrarla. */
export async function sendPush(subscription: PushSubscriptionInput, message: PushMessage, ttlSeconds = 3600): Promise<PushResult> {
  let endpoint: URL
  try { endpoint = new URL(subscription.endpoint) } catch { return { ok: false, status: 0, gone: true } }
  if (!isPushServiceUrl(endpoint.href)) return { ok: false, status: 0, gone: true }
  const keys = await vapidKeys()
  const jwt = vapidJwt(endpoint.origin, keys.privateJwk, process.env.VAPID_SUBJECT || "mailto:info@cnid.com.py")
  const body = encryptPayload(Buffer.from(JSON.stringify(message)), subscription)
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${keys.publicKey}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(ttlSeconds),
        Urgency: "high",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    return { ok: response.ok, status: response.status, gone: response.status === 404 || response.status === 410 }
  } catch {
    return { ok: false, status: 0, gone: false }
  }
}

async function deliver(query: SchemaQuery, rows: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>, message: PushMessage) {
  const results = await Promise.all(rows.map(async (row) => ({
    id: row.id, result: await sendPush({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, message),
  })))
  const gone = results.filter((r) => r.result.gone).map((r) => r.id)
  const sent = results.filter((r) => r.result.ok).map((r) => r.id)
  if (gone.length) await query("DELETE FROM push_subscriptions WHERE id = ANY($1::bigint[])", [gone])
  if (sent.length) await query("UPDATE push_subscriptions SET last_sent_at = NOW() WHERE id = ANY($1::bigint[])", [sent])
  return { sent: sent.length, removed: gone.length }
}

/** Avisa a quienes siguen una orden (clientes que pidieron desde el QR de la mesa). Nunca lanza errores. */
export async function notifyOrder(query: SchemaQuery, orderId: number, message: PushMessage) {
  try {
    const rows = await query("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE scope = 'order' AND order_id = $1", [orderId])
    if (!rows.rows.length) return { sent: 0, removed: 0 }
    if (!message.url) {
      const table = await query("SELECT t.code FROM service_orders o JOIN dining_tables t ON t.id = o.table_id WHERE o.id = $1", [orderId])
      if (table.rows[0]?.code) message = { ...message, url: `/table/${table.rows[0].code}` }
    }
    return await deliver(query, rows.rows, message)
  } catch (error) {
    console.error("Push al cliente falló", error)
    return { sent: 0, removed: 0 }
  }
}

/** Avisa al personal del restaurante que activó las notificaciones. Nunca lanza errores. */
export async function notifyStaff(query: SchemaQuery, message: PushMessage) {
  try {
    const rows = await query("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE scope = 'staff'")
    return await deliver(query, rows.rows, message)
  } catch (error) {
    console.error("Push al personal falló", error)
    return { sent: 0, removed: 0 }
  }
}

/** Mensaje para el cliente según el estado de su comanda. */
export function ticketStatusMessage(status: string, orderType: string): Omit<PushMessage, "url"> | null {
  const messages: Record<string, Omit<PushMessage, "url">> = {
    preparing: { title: "Tu pedido fue aceptado", body: "La cocina ya lo está preparando.", tag: "order-status" },
    ready: { title: "¡Tu pedido está listo!", body: orderType === "dineIn" ? "En un momento lo llevamos a tu mesa." : "Ya podés retirarlo.", tag: "order-status" },
    served: { title: "¡Buen provecho!", body: "Tu pedido ya está en la mesa.", tag: "order-status" },
    out_for_delivery: { title: "Tu pedido va en camino", body: "El repartidor ya salió.", tag: "order-status" },
    delivered: { title: "Pedido entregado", body: "¡Gracias por tu compra!", tag: "order-status" },
    cancelled: { title: "Pedido cancelado", body: "Consultá con el personal del local.", tag: "order-status" },
  }
  return messages[status] ?? null
}
