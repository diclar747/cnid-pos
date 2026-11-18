import { readLegacyDump } from './legacy-sql.mjs'

const file = process.argv[2]
if (!file) throw new Error('Uso: node scripts/audit-legacy.mjs ruta-al-respaldo.sql')
const tables = readLegacyDump(file)
const rows = (name) => tables.get(name) ?? []
const byId = (name) => new Map(rows(name).map((row) => [row.id, row]))
const countBy = (values, key) => Object.fromEntries([...values.reduce((map, row) => {
  const value = String(row[key] ?? 'NULL')
  map.set(value, (map.get(value) ?? 0) + 1)
  return map
}, new Map())].sort((a, b) => b[1] - a[1]))
const branchMap = byId('branches')
const restaurantMap = byId('restaurants')
const items = byId('menu_items')
const variations = byId('menu_item_variations')
const orders = byId('orders')
const orderItems = rows('order_items')
const payments = rows('payments')
const completed = rows('orders').filter((row) => ['paid', 'billed'].includes(row.status) && row.order_status !== 'cancelled')
const missingMenuItems = orderItems.filter((row) => !items.has(row.menu_item_id))
const missingVariations = orderItems.filter((row) => row.menu_item_variation_id != null && !variations.has(row.menu_item_variation_id))
const missingOrders = orderItems.filter((row) => !orders.has(row.order_id))
const prices = rows('menu_item_prices')
const result = {
  tablesWithData: tables.size,
  counts: Object.fromEntries([...tables].map(([name, data]) => [name, data.length])),
  branches: rows('branches').map((branch) => ({ id: branch.id, name: branch.name, restaurantId: branch.restaurant_id, restaurant: restaurantMap.get(branch.restaurant_id)?.name,
    products: rows('menu_items').filter((item) => item.branch_id === branch.id).length,
    orders: rows('orders').filter((order) => order.branch_id === branch.id).length })),
  menu: { categoriesByBranch: countBy(rows('item_categories'), 'branch_id'), menusByBranch: countBy(rows('menus'), 'branch_id'), itemsByBranch: countBy(rows('menu_items'), 'branch_id'),
    available: countBy(rows('menu_items'), 'is_available'), inStockFlag: countBy(rows('menu_items'), 'in_stock'),
    zeroBasePrice: rows('menu_items').filter((item) => !item.price).length,
    variations: rows('menu_item_variations').length, zeroVariationPrice: rows('menu_item_variations').filter((item) => !item.price).length,
    pricesByOrderType: countBy(prices, 'order_type_id'), pricesWithVariation: prices.filter((price) => price.menu_item_variation_id != null).length,
    priceStatuses: countBy(prices, 'status') },
  orders: { byBranch: countBy(rows('orders'), 'branch_id'), byStatus: countBy(rows('orders'), 'status'), byOrderStatus: countBy(rows('orders'), 'order_status'),
    completed: completed.length, completedTotal: Math.round(completed.reduce((sum, row) => sum + Number(row.total || 0), 0)),
    firstDate: rows('orders').map((row) => row.date_time || row.created_at).sort()[0], lastDate: rows('orders').map((row) => row.date_time || row.created_at).sort().at(-1),
    completedWithoutItems: completed.filter((row) => !orderItems.some((item) => item.order_id === row.id)).length,
    completedWithoutPayment: completed.filter((row) => !payments.some((payment) => payment.order_id === row.id)).length },
  orderItems: { byBranch: countBy(orderItems, 'branch_id'), missingMenuItems: missingMenuItems.length, missingVariations: missingVariations.length, missingOrders: missingOrders.length },
  payments: { byMethod: countBy(payments, 'payment_method'), byBranch: countBy(payments, 'branch_id') },
  users: { byRestaurant: countBy(rows('users'), 'restaurant_id'), roles: countBy(rows('model_has_roles'), 'role_id') },
}
console.log(JSON.stringify(result, null, 2))
