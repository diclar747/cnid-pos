// Verifica la criptografía de Web Push (lib/web-push-crypto.ts) sin red:
// 1. Cifrado aes128gcm contra el ejemplo del RFC 8291, apéndice A (resultado exacto).
// 2. Ida y vuelta: lo cifrado con una clave nueva se descifra con la clave del navegador.
// 3. El JWT VAPID se verifica con la clave pública.
// Uso: node --experimental-strip-types scripts/test-web-push.mjs
import { createDecipheriv, createECDH, generateKeyPairSync, hkdfSync, verify } from "node:crypto"
import { encryptPayload, isPushServiceUrl, vapidJwt } from "../lib/web-push-crypto.ts"

const check = (condition, message) => { if (!condition) throw new Error(message) }
const b = (v) => Buffer.from(v, "base64url")

// 1. Vector del RFC 8291
const rfc = {
  plaintext: "When I grow up, I want to be a watermelon",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  expected: "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
}
const ephemeral = createECDH("prime256v1")
ephemeral.setPrivateKey(b(rfc.asPrivate))
const body = encryptPayload(Buffer.from(rfc.plaintext), { endpoint: "https://push.example.net", keys: { p256dh: rfc.uaPublic, auth: rfc.auth } }, { salt: b(rfc.salt), ephemeral })
check(body.toString("base64url") === rfc.expected, "El cifrado no coincide con el RFC 8291")

// 2. Ida y vuelta con claves nuevas, descifrando como lo haría el navegador
const browser = createECDH("prime256v1")
browser.generateKeys()
const auth = Buffer.from("0123456789abcdef")
const message = JSON.stringify({ title: "Tu pedido está listo", body: "Mesa #4" })
const sealed = encryptPayload(Buffer.from(message), { endpoint: "https://push.example.net", keys: { p256dh: browser.getPublicKey().toString("base64url"), auth: auth.toString("base64url") } })
const salt = sealed.subarray(0, 16)
const idLength = sealed[20]
const serverPublic = sealed.subarray(21, 21 + idLength)
const secret = browser.computeSecret(serverPublic)
const ikm = Buffer.from(hkdfSync("sha256", secret, auth, Buffer.concat([Buffer.from("WebPush: info\0"), browser.getPublicKey(), serverPublic]), 32))
const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16))
const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12))
const data = sealed.subarray(21 + idLength)
const decipher = createDecipheriv("aes-128-gcm", cek, nonce)
decipher.setAuthTag(data.subarray(data.length - 16))
const plain = Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()])
check(plain[plain.length - 1] === 2 && plain.subarray(0, -1).toString() === message, "La ida y vuelta no recupera el mensaje")

// 3. JWT VAPID verificable con la clave pública
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
const jwt = vapidJwt("https://fcm.googleapis.com", privateKey.export({ format: "jwk" }), "mailto:prueba@example.com")
const [header, claims, signature] = jwt.split(".")
check(verify("sha256", Buffer.from(`${header}.${claims}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, b(signature)), "La firma VAPID no verifica")
const decoded = JSON.parse(b(claims).toString())
check(decoded.aud === "https://fcm.googleapis.com" && decoded.exp > Date.now() / 1000, "Claims VAPID inválidos")

// 4. Solo se aceptan servicios push reales (evita que el servidor llame a direcciones internas).
for (const ok of ["https://fcm.googleapis.com/fcm/send/abc", "https://updates.push.services.mozilla.com/wpush/v2/x", "https://web.push.apple.com/Q", "https://db5p.notify.windows.com/w/?token=1"]) check(isPushServiceUrl(ok), "Debe aceptar " + ok)
for (const bad of ["http://fcm.googleapis.com/x", "https://127.0.0.1/x", "https://fcm.googleapis.com:8443/x", "https://evil.com/fcm.googleapis.com", "https://fcm.googleapis.com.evil.com/x", "https://user@fcm.googleapis.com/x"]) check(!isPushServiceUrl(bad), "Debe rechazar " + bad)

console.log("OK: cifrado igual al RFC 8291, ida y vuelta descifrada, JWT VAPID verificado y endpoints restringidos")
