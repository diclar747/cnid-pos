// Importa a «De la Casa» (restaurante 1, esquema public) el catálogo exportado del POS web anterior
// (pos.cnid.com.py): artículos, variantes, precios por tipo de pedido, agregados, salón y mesas.
// Las claves de origen coinciden con import-legacy-restaurant.mjs (mariadb:1:1), así que ambos
// importadores reconocen los mismos productos y no los duplican.
//
// Vista previa:  node scripts/import-legacy-export.mjs [.legacy-export/de-la-casa-export.json]
// Aplicar:       node scripts/import-legacy-export.mjs [archivo.json] --apply
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { basename, resolve } from 'node:path'
import pg from 'pg'
import { legacyMenuImage } from './legacy-menu-images.mjs'

const input = process.argv.find((arg) => arg.toLowerCase().endsWith('.json')) ?? '.legacy-export/de-la-casa-export.json'
const apply = process.argv.includes('--apply')
const exported = JSON.parse(await fs.readFile(resolve(input), 'utf8'))
const source = 'mariadb:1:1'
const branchId = 1

const money = (value) => {
  const number = Number(String(value ?? '').trim())
  return Number.isFinite(number) && String(value ?? '').trim() !== '' ? Math.round(number) : null
}
const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()
const norm = (value) => clean(value).toLowerCase()
const categories = new Map(exported.categories.map((c) => [String(c.id), clean(c.name)]))
const menus = new Map(exported.menus.map((m) => [String(m.id), clean(m.name)]))
const groupsByName = new Map(exported.modifierGroups.map((g) => [norm(g.name), g]))

function groupSpec(link) {
  const group = groupsByName.get(norm(link.group))
  if (!group) return null
  const options = (group.options ?? []).filter((o) => o.is_available !== false).map((o) => ({
    legacyId: o.id, name: clean(o.name?.es ?? Object.values(o.name ?? {})[0]), price: Math.round(Number(o.price ?? 0)),
  })).filter((o) => o.name)
  if (!options.length) return null
  return { legacyId: group.id, name: clean(group.name), required: link.required === 'Requerido', multiple: link.multiple === 'Sí', options }
}

// En el listado de modificadores el artículo aparece como «Artículo», «Artículo (Variante)» o «Artículo Variante».
function linksFor(itemName, variationName) {
  const item = norm(itemName)
  const variant = variationName ? norm(variationName) : null
  return exported.itemModifierLinks.filter((link) => {
    const target = norm(link.item)
    if (target === item) return true
    return variant != null && (target === `${item} (${variant})` || target === `${item} ${variant}`)
  })
}

function imageFor(item, variationName) {
  if (item.image) {
    const local = `/menu-legacy/${basename(new URL(item.image).pathname)}`
    if (existsSync(resolve('public' + local))) return local
  }
  return legacyMenuImage(Number(item.menuItemId), variationName ?? undefined) ?? '/placeholder.svg'
}

const products = []
for (const item of exported.items) {
  const itemId = Number(item.menuItemId)
  const variants = item.hasVariations && item.variationIds?.length
    ? item.variationIds.map((id, i) => ({ id: Number(id), name: clean(item.variationName[i]), base: money(item.variationPrice[i]),
        byType: item.variationOrderTypePrices?.[i] ?? {}, delivery: money(item.variationBaseDeliveryPrice?.[i]) }))
    : [{ id: null, name: null, base: money(item.itemPrice), byType: item.orderTypePrices ?? {}, delivery: money(item.baseDeliveryPrice) }]
  for (const variant of variants) {
    const base = variant.base ?? 0
    const prices = {
      dineIn: money(variant.byType['1']) ?? base,
      delivery: money(variant.byType['2']) ?? variant.delivery ?? base,
      pickup: money(variant.byType['3']) ?? base,
    }
    const key = `${source}:item:${itemId}:variant:${variant.id ?? 0}`
    const seen = new Set()
    const modifierGroups = linksFor(item.itemName, variant.name).map(groupSpec).filter((g) => g && !seen.has(g.legacyId) && seen.add(g.legacyId))
    products.push({
      key,
      data: {
        name: `${clean(item.itemName)}${variant.name ? ` · ${variant.name}` : ''}`,
        price: prices.dineIn,
        pricesByOrderType: prices,
        category: categories.get(String(item.itemCategory)) || 'Sin categoría',
        menuName: menus.get(String(item.menu)) || 'Sin menú',
        image: imageFor(item, variant.name),
        stock: 0,
        trackStock: false,
        barcode: `CNID-${branchId}-${itemId}-${variant.id ?? 0}`,
        description: clean(item.itemDescription),
        isActive: item.isAvailable !== false && item.inStock !== false,
        showOnCustomerSite: item.showOnCustomerSite !== false,
        preparationTime: item.preparationTime ?? null,
        itemType: item.itemType ?? null,
        modifierGroups,
        legacy: { key, source, via: 'web-export', exportedAt: exported.exportedAt, branchId, itemId, variationId: variant.id,
          originalImage: item.image ?? null, menuId: Number(item.menu), categoryId: Number(item.itemCategory),
          originalName: item.itemName, originalVariation: variant.name },
      },
    })
  }
}

const unmatchedLinks = exported.itemModifierLinks.filter((link) =>
  !exported.items.some((item) => linksFor(item.itemName, null).includes(link) ||
    (item.variationName ?? []).some((v) => linksFor(item.itemName, v).includes(link))))
const summary = {
  mode: apply ? 'apply' : 'preview',
  articles: exported.items.length,
  products: products.length,
  categories: new Set(products.map((p) => p.data.category)).size,
  menus: new Set(products.map((p) => p.data.menuName)).size,
  withModifiers: products.filter((p) => p.data.modifierGroups.length).length,
  withOwnPhoto: products.filter((p) => p.data.image.startsWith('/menu-legacy/')).length,
  unmatchedModifierLinks: unmatchedLinks.map((l) => `${l.item} → ${l.group}`),
  tables: exported.tables?.length ?? 0,
}
if (!apply) { console.log(JSON.stringify(summary, null, 2)); process.exit(0) }

const env = await fs.readFile(resolve('.env.local'), 'utf8').catch(() => '')
const connectionString = process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
if (!connectionString) throw new Error('Falta DATABASE_URL en .env.local')
const client = new pg.Client({ connectionString })
await client.connect()
// --if-empty (arranque automático en el panel): solo importa si la carta todavía no está,
// para no pisar precios o cambios hechos después desde la administración.
if (process.argv.includes('--if-empty')) {
  const loaded = await client.query(`SELECT COUNT(*)::int AS n FROM products WHERE data->'legacy'->>'source' = $1`, [source])
  if (loaded.rows[0].n > 0) {
    console.log(`Carta de De la Casa ya cargada (${loaded.rows[0].n} productos); no se reimporta.`)
    await client.end()
    process.exit(0)
  }
}
try {
  await client.query('BEGIN')
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS products_legacy_key_unique ON products ((data->'legacy'->>'key')) WHERE data->'legacy'->>'key' IS NOT NULL`)
  let added = 0, updated = 0
  for (const product of products) {
    const existing = await client.query(`SELECT id, data FROM products WHERE data->'legacy'->>'key' = $1`, [product.key])
    if (existing.rows[0]) {
      // Conserva stock y control de stock configurados localmente.
      const current = existing.rows[0].data
      const data = { ...current, ...product.data, stock: current.stock ?? 0, trackStock: current.trackStock ?? false,
        legacy: { ...(current.legacy ?? {}), ...product.data.legacy } }
      await client.query('UPDATE products SET data = $1::jsonb, updated_at = NOW() WHERE id = $2', [JSON.stringify(data), existing.rows[0].id])
      updated++
    } else {
      await client.query('INSERT INTO products (data) VALUES ($1::jsonb)', [JSON.stringify(product.data)])
      added++
    }
  }

  // Los productos de ejemplo del arranque quedan inactivos para no mezclarse con la carta real.
  const seed = JSON.parse(await fs.readFile(resolve('scripts/seed-products.json'), 'utf8'))
  let archived = 0
  for (const example of seed) {
    const result = await client.query(`UPDATE products
      SET data = jsonb_set(jsonb_set(data, '{isActive}', 'false'::jsonb), '{demoArchived}', 'true'::jsonb), updated_at = NOW()
      WHERE data->>'barcode' = $1 AND data->>'name' = $2 AND data->'legacy' IS NULL AND data->>'isActive' IS DISTINCT FROM 'false'`,
      [example.barcode, example.name])
    archived += result.rowCount
  }

  // Salones y mesas
  let tablesAdded = 0
  const plain = (value) => norm(value).normalize('NFD').replace(/[̀-ͯ]/g, '')
  const rooms = (await client.query('SELECT id, name FROM dining_rooms ORDER BY id')).rows
  for (const area of exported.areas ?? []) {
    let room = rooms.find((r) => plain(r.name) === plain(area.name))
    if (!room) room = (await client.query(`INSERT INTO dining_rooms (name, description) VALUES ($1, 'Importado del POS web') RETURNING id`, [area.name])).rows[0]
    for (const table of (exported.tables ?? []).filter((t) => t.area === area.name)) {
      const code = `CNID-TABLE-${randomBytes(12).toString('hex').toUpperCase()}`
      const inserted = await client.query(`INSERT INTO dining_tables (room_id, label, seats, shape, code) VALUES ($1,$2,$3,'square',$4)
        ON CONFLICT (room_id, label) DO NOTHING RETURNING code`, [room.id, table.label, table.seats ?? 4, code])
      if (inserted.rows[0]) {
        await client.query('INSERT INTO public.table_directory (code, restaurant_id) VALUES ($1, 1) ON CONFLICT DO NOTHING', [code])
        tablesAdded++
      }
    }
  }

  await client.query(`UPDATE company_config SET data = data || jsonb_build_object('name', 'De la Casa', 'address', 'Villarrica',
      'phone', '+595 994869183', 'country', 'Paraguay'), updated_at = NOW() WHERE id = 1 AND COALESCE(data->>'name', '') = ''`)
  await client.query('COMMIT')
  console.log(JSON.stringify({ ...summary, added, updated, demoArchived: archived, tablesAdded }, null, 2))
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  await client.end()
}
