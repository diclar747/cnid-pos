import { readFile } from 'node:fs/promises'
import { randomBytes, randomUUID, scryptSync } from 'node:crypto'
import pg from 'pg'

const env = await readFile('.env.local', 'utf8')
const connectionString = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
if (!connectionString) throw new Error('DATABASE_URL no configurada')
const db = new pg.Pool({ connectionString })
const origin = 'http://127.0.0.1:3000'
const ids = { user: null, product: null, cards: [], orders: [], sales: [] }
let cookie = ''

async function request(path, method = 'GET', body) {
  const response = await fetch(origin + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const token = response.headers.get('set-cookie')?.split(';')[0]
  if (token) cookie = token
  const result = await response.json()
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${result.error ?? 'error'}`)
  return result
}
async function stock() {
  const result = await db.query("SELECT (data->>'stock')::integer AS stock FROM products WHERE id = $1", [ids.product])
  return result.rows[0]?.stock
}
function check(condition, message) { if (!condition) throw new Error(message) }

try {
  const suffix = randomUUID().slice(0, 8)
  const password = randomBytes(18).toString('hex')
  const salt = randomBytes(16).toString('hex')
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
  const email = `smoke-service-${suffix}@localhost.test`
  const user = await db.query(`INSERT INTO app_users (email, username, name, role, permissions, password_hash, restaurant_id)
    VALUES ($1, $2, 'Prueba temporal', 'admin', $3, $4, 1) RETURNING id`, [
    email, `smoke-service-${suffix}`, ['access_pos', 'manage_sales', 'manage_products'], passwordHash,
  ])
  ids.user = Number(user.rows[0].id)
  await request('/api/auth/login', 'POST', { email, password })

  const product = await request('/api/data/products', 'POST', {
    name: `Producto temporal ${suffix}`, barcode: `SMOKE-SERVICE-${suffix}`,
    price: 1000, stock: 5, trackStock: true, category: 'prueba', image: '', isActive: true,
  })
  ids.product = product.item.id
  const createdCards = (await request('/api/order-cards', 'POST', { count: 2, label: `Prueba ${suffix}` })).items
  ids.cards.push(...createdCards.map((entry) => entry.id))
  check(createdCards[0].label === `Prueba ${suffix} 1` && createdCards[1].label === `Prueba ${suffix} 2`, 'Numeración de tarjetas incorrecta')
  const card = createdCards[0]
  check((await request(`/api/card-lookup/${card.code}`)).order === null, 'La tarjeta nueva muestra consumos')

  const first = await request('/api/service-orders', 'POST', {
    cardCode: card.code, orderType: 'dineIn', tableLabel: 'Mesa prueba',
    items: [{ id: ids.product, quantity: 2 }],
  })
  ids.orders.push(first.order.id)
  check(first.order.total === 2000 && await stock() === 5, 'Guardar borrador alteró stock o total')
  check((await request(`/api/service-orders?card=${card.code}`)).order.id === first.order.id, 'La tarjeta no recupera la orden')

  const sent = await request('/api/service-orders', 'POST', {
    orderId: first.order.id, items: [{ id: ids.product, quantity: 1 }], sendToKitchen: true,
  })
  check(sent.ticket?.status === 'pending' && sent.order.total === 3000 && await stock() === 2, 'La comanda no reservó el stock exacto')
  const publicView = await request(`/api/card-lookup/${card.code}`)
  check(publicView.order?.items.length === 2 && publicView.order?.tickets[0]?.status === 'pending', 'La consulta de la tarjeta no refleja la comanda')
  const board = await request('/api/kitchen-tickets')
  check(board.items.some((item) => item.id === sent.ticket.id), 'La comanda no figura en cocina')
  for (const status of ['preparing', 'ready', 'served']) {
    const changed = await request(`/api/kitchen-tickets/${sent.ticket.id}`, 'PATCH', { status })
    check(changed.ticket.status === status, `No avanzó la comanda a ${status}`)
  }
  const paid = await request('/api/checkout', 'POST', { serviceOrderId: first.order.id, paymentMethod: 'cash', cashReceived: 3000 })
  ids.sales.push(paid.sale.id)
  check(paid.sale.total === 3000 && await stock() === 2, 'Cobrar comanda descontó stock dos veces')
  check((await request(`/api/card-lookup/${card.code}`)).order === null, 'La tarjeta no quedó libre al cobrar')
  const again = await fetch(origin + '/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ serviceOrderId: first.order.id, paymentMethod: 'card' }) })
  check(again.status === 400, 'La orden se pudo cobrar dos veces')

  const second = await request('/api/service-orders', 'POST', { cardCode: card.code, items: [{ id: ids.product, quantity: 1 }], sendToKitchen: true })
  ids.orders.push(second.order.id)
  check(await stock() === 1, 'La tarjeta reutilizada no reservó stock')
  await request(`/api/service-orders/${second.order.id}`, 'PATCH', { action: 'cancel' })
  check(await stock() === 2 && (await request(`/api/card-lookup/${card.code}`)).order === null, 'Cancelar no devolvió stock o no liberó tarjeta')

  const direct = await request('/api/service-orders', 'POST', { cardCode: card.code, items: [{ id: ids.product, quantity: 1 }] })
  ids.orders.push(direct.order.id)
  const directSale = await request('/api/checkout', 'POST', { serviceOrderId: direct.order.id, paymentMethod: 'card' })
  ids.sales.push(directSale.sale.id)
  check(directSale.sale.total === 1000 && await stock() === 1, 'Cobro directo de cuenta incorrecto')
  console.log('OK: tarjeta QR, cuenta abierta, comanda, tablero, estados, stock, cancelación, cobro posterior y cobro directo')
} finally {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    for (const orderId of ids.orders) await client.query('DELETE FROM kitchen_tickets WHERE order_id = $1', [orderId])
    for (const orderId of ids.orders) await client.query('DELETE FROM service_orders WHERE id = $1', [orderId])
    for (const saleId of ids.sales) await client.query('DELETE FROM sales WHERE id = $1', [saleId])
    for (const cardId of ids.cards) await client.query('DELETE FROM order_cards WHERE id = $1', [cardId])
    if (ids.product) {
      await client.query('DELETE FROM stock_movements WHERE product_id = $1', [ids.product])
      await client.query('DELETE FROM products WHERE id = $1', [ids.product])
    }
    if (ids.user) await client.query('DELETE FROM app_users WHERE id = $1', [ids.user])
    await client.query('COMMIT')
  } catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release(); await db.end() }
}
