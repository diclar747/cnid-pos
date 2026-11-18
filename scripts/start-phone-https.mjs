import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isIP } from 'node:net'
import https from 'node:https'
import next from 'next'

const certDir = resolve('.local-cert')
const address = (await readFile(resolve(certDir, 'address.txt'), 'utf8')).trim()
const privateIpv4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/
if (isIP(address) !== 4 || !privateIpv4.test(address)) {
  throw new Error('Configurá una dirección IPv4 privada de la red local en setup-phone-cert.ps1.')
}
const [key, cert] = await Promise.all([
  readFile(resolve(certDir, 'server.key')),
  readFile(resolve(certDir, 'server.crt')),
])
const app = next({ dev: false, dir: process.cwd(), hostname: address, port: 3443 })
await app.prepare()
const handler = app.getRequestHandler()
https.createServer({ key, cert }, (request, response) => handler(request, response)).listen(3443, address, () => {
  console.log(`CNID POS para teléfono: https://${address}:3443/login`)
})
