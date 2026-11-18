import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import https from "node:https"

const address = (await readFile(resolve(".local-cert/address.txt"), "utf8")).trim()
const ca = await readFile(resolve(".local-cert/ca.crt"))
const path = process.argv[2] || "/manifest.webmanifest"
const response = await new Promise((resolveResult, reject) => {
  https.get({ hostname: address, port: 3443, path, ca, rejectUnauthorized: true }, (result) => {
    const authorized = result.socket.authorized
    result.resume()
    result.on("end", () => resolveResult({ status: result.statusCode, authorized }))
  }).on("error", reject)
})
if (!response.authorized || response.status !== 200) throw new Error(`HTTPS respondió ${response.status}.`)
console.log(`HTTPS verificado: https://${address}:3443${path} (200, certificado válido)`)
