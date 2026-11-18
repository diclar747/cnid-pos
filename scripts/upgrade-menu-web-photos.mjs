import fs from 'node:fs/promises'
import { resolve } from 'node:path'

const lines = (await fs.readFile(resolve('artifacts/better-menu-photos.jsonl'), 'utf8')).trim().split(/\r?\n/)
const results = process.argv.includes('--pesto')
  ? JSON.parse(await fs.readFile(resolve('artifacts/menu-photo-search.json'), 'utf8'))
  : Object.fromEntries(lines.map((line) => { const item = JSON.parse(line); return [item.slug, item.results] }))
const picks = process.argv.includes('--pesto') ? { pesto: 0 } : process.argv.includes('--delivery') ? { 'delivery-3': 0 } : process.argv.includes('--additional') ? {
  'asado-2': 5, 'milanesa-2': 0,
} : {
  pizza: 1, empanadas: 1, bife: 0, asado: 0, 'pollo-grille': 1,
  carbonara: 1, fries: 0, lasagna: 1, 'spaghetti-bolognese': 0,
  ravioli: 0, gnocchi: 0,
}
const creditFile = resolve('public/menu-web/credits.json')
const credits = JSON.parse(await fs.readFile(creditFile, 'utf8'))
for (const [sourceSlug, index] of Object.entries(picks)) {
  const slug = sourceSlug.replace(/-[23]$/, '')
  const item = results[sourceSlug]?.[index]
  if (!item) throw new Error(`Sin resultado para ${slug}`)
  const response = await fetch(item.url, { headers: { 'User-Agent': 'CNID-POS/1.0 (menu illustration)' } })
  if (!response.ok) throw new Error(`${slug}: HTTP ${response.status}`)
  const type = response.headers.get('content-type')?.split(';')[0]?.trim()
  const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error(`${slug}: ${type}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 3000 || bytes.length > 9_000_000) throw new Error(`${slug}: ${bytes.length} bytes`)
  const oldPath = credits[slug]?.path
  const path = `/menu-web/${slug}.${extension}`
  await fs.writeFile(resolve('public', path.slice(1)), bytes)
  credits[slug] = {
    path, title: item.title, creator: item.creator || 'WordPress Photo Directory',
    license: item.license, licenseUrl: item.licenseUrl || 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: item.page, originalUrl: item.url,
  }
  if (oldPath && oldPath !== path) await fs.rm(resolve('public', oldPath.slice(1)), { force: true })
  console.log(`${slug}: ${Math.round(bytes.length / 1024)} KB`)
}
await fs.writeFile(creditFile, JSON.stringify(Object.fromEntries(Object.entries(credits).sort()), null, 2))
