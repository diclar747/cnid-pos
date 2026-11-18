import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'
import { readLegacyDump } from './legacy-sql.mjs'
import { legacyMenuImage } from './legacy-menu-images.mjs'

// The dump sets time_zone to UTC. orders.date_time matches created_at (a UTC timestamp)
// in all 10,876 rows of the primary branch, so its clock values are UTC too.

const input = process.argv.find((arg) => arg.toLowerCase().endsWith('.sql'))
const check = process.argv.includes('--check')
const apply = process.argv.includes('--apply') || check
const archiveDemo = process.argv.includes('--archive-demo')
const branchId = Number(process.argv.find((arg) => arg.startsWith('--branch='))?.split('=')[1] ?? 1)
if (!input || !Number.isSafeInteger(branchId)) {
  throw new Error('Uso: node scripts/import-legacy-restaurant.mjs respaldo.sql [--branch=1] [--apply]')
}

const wanted = new Set(['branches', 'restaurants', 'item_categories', 'menus', 'menu_items', 'menu_item_variations',
  'menu_item_prices', 'item_modifiers', 'modifier_groups', 'modifier_options', 'modifier_option_prices',
  'orders', 'order_items', 'order_item_modifier_options', 'payments', 'customers', 'users'])
const tables = readLegacyDump(input, wanted)
const rows = (name) => tables.get(name) ?? []
const ids = (name) => new Map(rows(name).map((row) => [row.id, row]))
const branch = ids('branches').get(branchId)
if (!branch) throw new Error(`Sucursal ${branchId} no encontrada.`)
const restaurant = ids('restaurants').get(branch.restaurant_id)
const categories = ids('item_categories')
const menus = ids('menus')
const menuItems = ids('menu_items')
const variations = ids('menu_item_variations')
const modifierGroups = ids('modifier_groups')
const modifierOptions = ids('modifier_options')
const customers = ids('customers')
const users = ids('users')
const variationByItem = Map.groupBy(rows('menu_item_variations'), (row) => row.menu_item_id)
const pricesByItem = Map.groupBy(rows('menu_item_prices'), (row) => row.menu_item_id)
const itemModifiersByItem = Map.groupBy(rows('item_modifiers'), (row) => row.menu_item_id)
const optionsByGroup = Map.groupBy(rows('modifier_options'), (row) => row.modifier_group_id)
const orderItemsByOrder = Map.groupBy(rows('order_items'), (row) => row.order_id)
const paymentsByOrder = Map.groupBy(rows('payments'), (row) => row.order_id)
const saleModifiersByItem = Map.groupBy(rows('order_item_modifier_options'), (row) => row.order_item_id)
const source = `mariadb:${restaurant?.id ?? 'unknown'}:${branchId}`

function translate(value) {
  if (!value) return ''
  try {
    const names = JSON.parse(value)
    return String(names.es ?? names.en ?? Object.values(names)[0] ?? '').trim()
  } catch { return String(value).trim() }
}

function localIso(value) {
  if (!value) return null
  const date = new Date(`${String(value).replace(' ', 'T')}Z`)
  return Number.isNaN(date.valueOf()) ? null : date.toISOString()
}

function optionPrices(itemId, variationId, fallback) {
  const prices = (pricesByItem.get(itemId) ?? []).filter((price) =>
    price.menu_item_variation_id === variationId && price.status === 1 && price.delivery_app_id == null)
  const get = (orderType) => Math.round(Number(prices.find((price) => price.order_type_id === orderType)?.final_price ?? fallback ?? 0))
  return { dineIn: get(1), delivery: get(2), pickup: get(3) }
}

function modifiersFor(itemId, variationId) {
  return (itemModifiersByItem.get(itemId) ?? [])
    .filter((binding) => binding.menu_item_variation_id == null || binding.menu_item_variation_id === variationId)
    .map((binding) => {
      const group = modifierGroups.get(binding.modifier_group_id)
      return {
        legacyId: binding.modifier_group_id,
        name: translate(group?.name),
        required: binding.is_required === 1,
        multiple: binding.allow_multiple_selection === 1,
        options: (optionsByGroup.get(binding.modifier_group_id) ?? []).filter((option) => option.is_available === 1)
          .map((option) => ({ legacyId: option.id, name: translate(option.name), price: Math.round(Number(option.price ?? 0)) })),
      }
    }).filter((group) => group.name && group.options.length)
}

const productSpecs = []
for (const item of rows('menu_items').filter((row) => row.branch_id === branchId)) {
  const choices = variationByItem.get(item.id) ?? []
  for (const variation of choices.length ? choices : [null]) {
    const variantId = variation?.id ?? null
    const name = `${item.item_name.trim()}${variation ? ` · ${translate(variation.variation)}` : ''}`
    const priceByType = optionPrices(item.id, variantId, variation?.price ?? item.price)
    const key = `${source}:item:${item.id}:variant:${variantId ?? 0}`
    productSpecs.push({
      key,
      itemId: item.id,
      variationId: variantId,
      data: {
        name,
        price: priceByType.dineIn,
        pricesByOrderType: priceByType,
        category: translate(categories.get(item.item_category_id)?.category_name) || 'Sin categoría',
        menuName: translate(menus.get(item.menu_id)?.menu_name) || 'Sin menú',
        image: legacyMenuImage(item.id, variation?.variation) ?? '/placeholder.svg',
        stock: 0,
        trackStock: false,
        barcode: `CNID-${branchId}-${item.id}-${variantId ?? 0}`,
        description: item.description?.trim() ?? '',
        isActive: item.is_available === 1 && item.in_stock === 1,
        modifierGroups: modifiersFor(item.id, variantId),
        legacy: { key, source, branchId, itemId: item.id, variationId: variantId,
          originalImage: item.image, menuId: item.menu_id, categoryId: item.item_category_id,
          originalName: item.item_name, originalVariation: variation?.variation ?? null },
      },
    })
  }
}

const paidOrders = rows('orders').filter((order) => order.branch_id === branchId && order.status === 'paid' && order.order_status !== 'cancelled')
const productsBySource = new Map(productSpecs.map((product) => [`${product.itemId}:${product.variationId ?? 0}`, product]))
const summary = {
  mode: check ? 'check-and-rollback' : apply ? 'apply' : 'preview',
  branch: { id: branchId, name: branch.name, restaurant: restaurant?.name },
  products: productSpecs.length,
  categories: new Set(productSpecs.map((p) => p.data.category)).size,
  menus: new Set(productSpecs.map((p) => p.data.menuName)).size,
  productsWithModifiers: productSpecs.filter((p) => p.data.modifierGroups.length).length,
  paidSales: paidOrders.length,
  paidSalesTotal: paidOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
  paidSalesWithoutItems: paidOrders.filter((order) => !(orderItemsByOrder.get(order.id)?.length)).length,
  paidSalesWithoutPayment: paidOrders.filter((order) => !(paymentsByOrder.get(order.id)?.length)).length,
  billedUnpaidExcluded: rows('orders').filter((order) => order.branch_id === branchId && order.status === 'billed').length,
  cancelledExcluded: rows('orders').filter((order) => order.branch_id === branchId && order.status === 'canceled').length,
}
if (!apply) { console.log(JSON.stringify(summary, null, 2)); process.exit(0) }

const env = await fs.readFile(resolve('.env.local'), 'utf8')
const connectionString = process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
if (!connectionString) throw new Error('Falta DATABASE_URL en .env.local')
const client = new pg.Client({ connectionString })
await client.connect()
try {
  await client.query('BEGIN')
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS products_legacy_key_unique ON products ((data->'legacy'->>'key')) WHERE data->'legacy'->>'key' IS NOT NULL`)
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS sales_legacy_key_unique ON sales ((data->'legacy'->>'key')) WHERE data->'legacy'->>'key' IS NOT NULL`)

  const productIds = new Map()
  let addedProducts = 0
  for (const product of productSpecs) {
    const date = localIso(menuItems.get(product.itemId)?.created_at)
    const inserted = await client.query(`INSERT INTO products (data, created_at, updated_at) VALUES ($1::jsonb, COALESCE($2::timestamptz, NOW()), NOW())
      ON CONFLICT DO NOTHING RETURNING id`, [JSON.stringify(product.data), date])
    let id = inserted.rows[0]?.id
    if (id == null) {
      const existing = await client.query(`SELECT id FROM products WHERE data->'legacy'->>'key' = $1`, [product.key])
      id = existing.rows[0]?.id
      if (id == null) throw new Error(`Conflicto de código ${product.data.barcode} con otro producto.`)
      if (date) await client.query('UPDATE products SET created_at = $1 WHERE id = $2 AND created_at IS DISTINCT FROM $1', [date, id])
    } else addedProducts++
    productIds.set(`${product.itemId}:${product.variationId ?? 0}`, Number(id))
  }

  let archivedDemoProducts = 0
  if (archiveDemo) {
    const seed = JSON.parse(await fs.readFile(resolve('scripts/seed-products.json'), 'utf8'))
    for (const example of seed) {
      const result = await client.query(`UPDATE products
        SET data = jsonb_set(jsonb_set(data, '{isActive}', 'false'::jsonb), '{demoArchived}', 'true'::jsonb), updated_at = NOW()
        WHERE data->>'barcode' = $1 AND data->>'name' = $2 AND data->'legacy' IS NULL AND data->>'isActive' IS DISTINCT FROM 'false'`,
        [example.barcode, example.name])
      archivedDemoProducts += result.rowCount
    }
  }
  await client.query(`UPDATE company_config SET data = data || jsonb_build_object(
      'name', $1::text, 'address', $2::text, 'phone', $3::text, 'email', $4::text, 'country', 'Paraguay'
    ), updated_at = NOW()
    WHERE id = 1 AND COALESCE(data->>'name', '') = ''`,
    [restaurant?.name ?? branch.name, restaurant?.address ?? branch.address ?? '',
      restaurant?.phone_number ?? '', restaurant?.email ?? ''])

  const saleBatch = []
  let addedSales = 0
  async function flushSales() {
    if (!saleBatch.length) return
    const result = await client.query(`INSERT INTO sales (data, created_at, updated_at)
      SELECT entry->'data', (entry->>'createdAt')::timestamptz, NOW()
      FROM jsonb_array_elements($1::jsonb) entry ON CONFLICT DO NOTHING`, [JSON.stringify(saleBatch)])
    addedSales += result.rowCount
    saleBatch.length = 0
  }

  for (const order of paidOrders) {
    const date = localIso(order.date_time ?? order.created_at) ?? new Date().toISOString()
    const sourcePayments = paymentsByOrder.get(order.id) ?? []
    const methods = [...new Set(sourcePayments.map((payment) => payment.payment_method))]
    const method = methods.length !== 1 ? (methods.length ? 'mixed' : 'unknown')
      : methods[0] === 'cash' ? 'cash' : methods[0] === 'upi' ? 'transfer' : 'unknown'
    const customer = customers.get(order.customer_id)
    const actor = users.get(order.added_by)
    const items = (orderItemsByOrder.get(order.id) ?? []).map((line) => {
      const original = menuItems.get(line.menu_item_id)
      const spec = productsBySource.get(`${line.menu_item_id}:${line.menu_item_variation_id ?? 0}`)
      const quantity = Number(line.quantity ?? 0)
      const price = Number(line.price ?? 0)
      const subtotal = Number(line.amount ?? price * quantity)
      const name = spec?.data.name ?? original?.item_name?.trim() ?? `Artículo antiguo #${line.menu_item_id}`
      return {
        product: { id: spec ? productIds.get(`${line.menu_item_id}:${line.menu_item_variation_id ?? 0}`) : 0, name, price },
        productId: spec ? productIds.get(`${line.menu_item_id}:${line.menu_item_variation_id ?? 0}`) : 0,
        productName: name, quantity, price, subtotal, total: subtotal,
        modifiers: (saleModifiersByItem.get(line.id) ?? []).map((modifier) => ({
          name: modifier.modifier_option_name, price: Number(modifier.modifier_option_price ?? 0),
          legacyOptionId: modifier.modifier_option_id,
        })),
        legacyOrderItemId: line.id,
      }
    })
    const key = `${source}:order:${order.id}`
    saleBatch.push({ createdAt: date, data: {
      date, total: Number(order.total ?? 0), items, paymentMethod: method,
      customerName: customer?.name ?? '', customerRuc: customer?.ruc ?? '',
      userId: 0, userName: actor?.name ?? 'Sistema anterior',
      legacy: { key, source, branchId, orderId: order.id, orderNumber: order.formatted_order_number ?? order.order_number,
        originalStatus: order.status, orderType: order.order_type, originalDate: order.date_time,
        subTotal: Number(order.sub_total ?? 0), tip: Number(order.tip_amount ?? 0),
        tax: Number(order.total_tax_amount ?? 0), discount: Number(order.discount_amount ?? 0),
        amountPaid: Number(order.amount_paid ?? 0), payments: sourcePayments.map((payment) => ({
          legacyId: payment.id, method: payment.payment_method, amount: Number(payment.amount ?? 0),
        })) },
    } })
    if (saleBatch.length >= 250) await flushSales()
  }
  await flushSales()
  const correctedDates = await client.query(`UPDATE sales SET
      data = jsonb_set(data, '{date}', to_jsonb(replace(data->'legacy'->>'originalDate', ' ', 'T') || 'Z')),
      created_at = ((data->'legacy'->>'originalDate')::timestamp AT TIME ZONE 'UTC'), updated_at = NOW()
    WHERE data->'legacy'->>'source' = $1 AND data->'legacy'->>'originalDate' IS NOT NULL
      AND data->>'date' IS DISTINCT FROM replace(data->'legacy'->>'originalDate', ' ', 'T') || 'Z'`, [source])
  await client.query(check ? 'ROLLBACK' : 'COMMIT')
  console.log(JSON.stringify({ ...summary, addedProducts, addedSales, correctedSaleDates: correctedDates.rowCount, archivedDemoProducts,
    stockPolicy: 'No se inventaron cantidades; artículos del menú sin control de stock.' }, null, 2))
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally { await client.end() }
