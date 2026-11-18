import { createCipheriv, createECDH, createPrivateKey, hkdfSync, randomBytes, sign } from "node:crypto"

// Criptografía de Web Push con el módulo crypto de Node, sin dependencias ni acceso a la base:
// - VAPID (RFC 8292): JWT ES256 que identifica al servidor ante el servicio push.
// - Cifrado del mensaje aes128gcm (RFC 8188 / RFC 8291).
// Se prueba contra el vector oficial del RFC 8291 en scripts/test-web-push.mjs.

export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export const b64url = (buffer: Buffer) => buffer.toString("base64url")
export const fromB64url = (value: string) => Buffer.from(value, "base64url")

/** JWT VAPID firmado con ES256 para el origen del servicio push. */
export function vapidJwt(audience: string, privateJwk: Record<string, string>, subject: string, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })))
  const claims = b64url(Buffer.from(JSON.stringify({ aud: audience, exp: now + 12 * 60 * 60, sub: subject })))
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
    key: createPrivateKey({ key: privateJwk, format: "jwk" }), dsaEncoding: "ieee-p1363",
  })
  return `${header}.${claims}.${b64url(signature)}`
}

/**
 * Cifra el contenido para una suscripción (aes128gcm, un solo registro de 4096 bytes).
 * `salt` y `ephemeral` solo se pasan en pruebas para obtener un resultado determinista.
 */
export function encryptPayload(payload: Buffer, subscription: PushSubscriptionInput,
  options: { salt?: Buffer; ephemeral?: ReturnType<typeof createECDH> } = {}) {
  const uaPublic = fromB64url(subscription.keys.p256dh)
  const authSecret = fromB64url(subscription.keys.auth)
  if (uaPublic.length !== 65 || authSecret.length < 16) throw new Error("Suscripción push inválida.")
  if (payload.length > 3800) throw new Error("Mensaje push demasiado largo.")
  const ephemeral = options.ephemeral ?? createECDH("prime256v1")
  if (!options.ephemeral) ephemeral.generateKeys()
  const asPublic = ephemeral.getPublicKey()
  const ecdhSecret = ephemeral.computeSecret(uaPublic)
  const salt = options.salt ?? randomBytes(16)
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic])
  const ikm = Buffer.from(hkdfSync("sha256", ecdhSecret, authSecret, keyInfo, 32))
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16))
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12))
  const cipher = createCipheriv("aes-128-gcm", cek, nonce)
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()])
  const recordSize = Buffer.alloc(4)
  recordSize.writeUInt32BE(4096)
  return Buffer.concat([salt, recordSize, Buffer.from([asPublic.length]), asPublic, encrypted])
}

/** Servicios push de los navegadores: el servidor solo envía a estos, nunca a una dirección arbitraria. */
const PUSH_HOSTS = [/^fcm.googleapis.com$/, /^android.googleapis.com$/, /(^|.)push.services.mozilla.com$/, /(^|.)notify.windows.com$/, /^web.push.apple.com$/, /(^|.)push.apple.com$/]
export function isPushServiceUrl(endpoint: string) {
  try {
    const url = new URL(endpoint)
    return url.protocol === "https:" && !url.port && !url.username && PUSH_HOSTS.some((pattern) => pattern.test(url.hostname))
  } catch { return false }
}

export function validSubscription(value: unknown): PushSubscriptionInput | null {
  const sub = value as PushSubscriptionInput
  if (!sub || typeof sub.endpoint !== "string" || sub.endpoint.length > 1000 || !isPushServiceUrl(sub.endpoint)) return null
  if (typeof sub.keys?.p256dh !== "string" || typeof sub.keys?.auth !== "string") return null
  try {
    if (fromB64url(sub.keys.p256dh).length !== 65 || fromB64url(sub.keys.auth).length < 16) return null
  } catch { return null }
  return { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }
}
