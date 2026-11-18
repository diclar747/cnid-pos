import fs from 'node:fs/promises'
import { resolve } from 'node:path'

const search = JSON.parse(await fs.readFile(resolve('artifacts/menu-photo-search.json'), 'utf8'))
const picks = {
  empanadas: 4, pizza: 0, carbonara: 1, pesto: 1, 'spaghetti-bolognese': 1,
  ravioli: 0, alfredo: 2, gnocchi: 3, lasagna: 2, 'arroz-leche': 0,
  crema: 4, 'tres-leches': 0, jugo: 0, delivery: 0, tarta: 0,
  milanesa: 0, omelette: 1, guiso: 0, cerdo: 3, strogonoff: 4,
  yakisoba: 2, vino: 2, cola: 3, salad: 0, sandwich: 0, cocido: 2,
  bife: 0, salsa: 2, polenta: 1, feijoada: 1, albondigas: 6,
  burger: 0, 'pastelon-papa': 0, asado: 1, 'tortilla-soo': 4,
  arroz: 0, wings: 3, fries: 1, water: 0, pan: 0, risotto: 0,
  'pollo-curry': 0, locro: 0, 'empanadas-pollo': 4,
  'empanadas-queso': 0, 'milanesa-pollo': 0, 'strogonoff-pollo': 1,
  'yakisoba-pollo': 0, 'ensalada-cesar': 0, pure: 1,
}

const pinned = {
  'lomo-cerdo-mostaza': search['lomo-cerdo-mostaza'][1],
  puchero: {
    title: 'Puchero uruguayo', creator: 'Diosverde', license: 'by-sa',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    page: 'https://commons.wikimedia.org/wiki/File:Puchero_uruguayo.jpg',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Puchero_uruguayo.jpg',
  },
}

const extraQueries = {
  'pollo-grille': 'grilled chicken', 'vori-vori': 'chicken soup paraguay',
  soyo: 'ground beef soup', beer: 'beer pint glass',
}
const extraIndex = { 'pollo-grille': 1, 'vori-vori': 0, soyo: 0, beer: 0 }

async function searchExtra(query) {
  const url = new URL('https://api.openverse.org/v1/images/')
  url.searchParams.set('q', query)
  url.searchParams.set('license', 'cc0,pdm,by,by-sa')
  url.searchParams.set('page_size', '12')
  const response = await fetch(url, { headers: { 'User-Agent': 'CNID-POS/1.0' } })
  if (!response.ok) throw new Error(`Busqueda ${query}: ${response.status}`)
  return (await response.json()).results.map((item) => ({
    title: item.title, creator: item.creator, license: item.license,
    licenseUrl: item.license_url, page: item.foreign_landing_url,
    url: item.url, width: item.width, height: item.height,
  }))
}

const selected = { ...pinned }
for (const [slug, index] of Object.entries(picks)) {
  const item = search[slug]?.[index]
  if (!item) throw new Error(`No hay resultado ${index} para ${slug}`)
  selected[slug] = item
}
for (const [slug, query] of Object.entries(extraQueries)) {
  const items = await searchExtra(query)
  selected[slug] = items[extraIndex[slug]]
}

const target = resolve('public/menu-web')
await fs.mkdir(target, { recursive: true })
const credits = JSON.parse(await fs.readFile(resolve(target, 'credits.json'), 'utf8').catch(() => '{}'))
const failures = []
let next = 0
const entries = Object.entries(selected).filter(([slug]) => !credits[slug])

async function download(slug, item, attempt = 0) {
  let response = await fetch(item.url, { headers: { 'User-Agent': 'CNID-POS/1.0 (menu illustration)' }, redirect: 'follow' })
  if (response.status === 429 && new URL(item.url).hostname === 'upload.wikimedia.org') {
    const originalPath = new URL(item.url).pathname.replace('/wikipedia/commons/', '')
    const filename = originalPath.split('/').at(-1)
    const thumbnail = `https://thumb.wikimedia.org/wikipedia/commons/thumb/${originalPath}/330px-${filename}`
    response = await fetch(thumbnail, { headers: { 'User-Agent': 'CNID-POS/1.0 (menu illustration)' } })
  }
  if (response.status === 429 && attempt < 4) {
    await new Promise((done) => setTimeout(done, 3000 * (attempt + 1)))
    return download(slug, item, attempt + 1)
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim()
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) throw new Error(`Tipo ${contentType}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 3000 || bytes.length > 9_000_000) throw new Error(`Tamano ${bytes.length}`)
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const path = `/menu-web/${slug}.${extension}`
  await fs.writeFile(resolve('public', path.slice(1)), bytes)
  credits[slug] = {
    path, title: item.title, creator: item.creator || 'Autor no indicado',
    license: item.license, licenseUrl: item.licenseUrl,
    sourceUrl: item.page, originalUrl: item.url,
  }
  console.log(`${slug}: ${path} (${Math.round(bytes.length / 1024)} KB)`)
}

async function worker() {
  while (next < entries.length) {
    const [slug, item] = entries[next++]
    try { await download(slug, item) }
    catch (error) { failures.push({ slug, error: String(error.message ?? error) }); console.error(`${slug}: ${error.message}`) }
  }
}
await Promise.all([worker(), worker(), worker()])
await fs.writeFile(resolve(target, 'credits.json'), JSON.stringify(Object.fromEntries(Object.entries(credits).sort()), null, 2))
console.log(JSON.stringify({ downloaded: Object.keys(credits).length, failures }, null, 2))
if (failures.length) process.exitCode = 1
