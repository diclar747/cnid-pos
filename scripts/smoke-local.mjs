import { readFile } from 'node:fs/promises'
import { randomBytes, randomUUID, scryptSync } from 'node:crypto'
import pg from 'pg'

const env = await readFile('.env.local', 'utf8')
const connectionString = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
if (!connectionString) throw new Error('DATABASE_URL no configurada')
const db = new pg.Pool({ connectionString })
const origin = 'http://127.0.0.1:3000'
let cookie = ''
let productId
let purchaseId
let saleId
let userId
let supplierId
let expenseId
let orderId
let cancelledOrderId
let orderPurchaseId
let secondSaleId
let authUserId
const request = async (path, method = 'GET', body) => {
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

try {
  let testEmail = process.env.POS_TEST_EMAIL
  let testPassword = process.env.POS_TEST_PASSWORD
  if (!testEmail || !testPassword) {
    const suffix = randomUUID().slice(0, 8)
    testEmail = `smoke-admin-${suffix}@localhost.test`
    testPassword = randomBytes(18).toString('base64url')
    const salt = randomBytes(16).toString('hex')
    const hash = `${salt}:${scryptSync(testPassword, salt, 64).toString('hex')}`
    const created = await db.query(`INSERT INTO public.app_users
      (email, username, name, role, permissions, password_hash, restaurant_id)
      VALUES ($1, $2, 'Prueba temporal', 'admin', $3, $4, 1) RETURNING id`, [
      testEmail, `smoke-admin-${suffix}`,
      ['access_pos', 'manage_sales', 'manage_products', 'manage_purchases', 'manage_suppliers', 'manage_users', 'manage_expenses'], hash,
    ])
    authUserId = Number(created.rows[0].id)
  }
  const session = await request('/api/auth/login', 'POST', {
    email: testEmail,
    password: testPassword,
  })
  if (session.user.role !== 'admin') throw new Error('Acceso de prueba sin rol administrador')
  const product = await request('/api/data/products', 'POST', {
    name: 'Prueba local ' + randomUUID(), barcode: 'TEST-' + randomUUID(),
    price: 1000, stock: 0, category: 'pruebas', image: '', description: 'Prueba temporal', isActive: true,
  })
  productId = product.item.id
  const purchase = await request('/api/purchases', 'POST', { productId, quantity: 3, unitPrice: 500, supplier: 'Prueba local' })
  purchaseId = purchase.purchase.id
  const sale = await request('/api/checkout', 'POST', { items: [{ id: productId, quantity: 2 }], paymentMethod: 'cash', cashReceived: 2000 })
  saleId = sale.sale.id
  const catalog = await request('/api/data/products')
  const stored = catalog.items.find(item => item.id === productId)
  if (stored?.stock !== 1 || sale.sale.total !== 2000 || purchase.purchase.total !== 1500) {
    throw new Error('Stock o totales incorrectos')
  }
  const counts = await db.query('SELECT (SELECT COUNT(*) FROM sales WHERE id = $1) AS sale, (SELECT COUNT(*) FROM purchases WHERE id = $2) AS purchase', [saleId, purchaseId])
  if (Number(counts.rows[0].sale) !== 1 || Number(counts.rows[0].purchase) !== 1) throw new Error('Datos no persistidos')

  const suffix = randomUUID().slice(0, 8)
  const createdUser = await request('/api/users', 'POST', {
    name: 'Prueba local', email: `test-${suffix}@localhost.test`, username: `test-${suffix}`,
    role: 'cashier', permissions: ['access_pos', 'manage_sales'], status: 'active', password: 'temporal123',
  })
  userId = Number(createdUser.user.id)
  const updatedUser = await request(`/api/users/${userId}`, 'PUT', {
    name: 'Prueba actualizada', email: createdUser.user.email, username: createdUser.user.username,
    role: 'cashier', permissions: ['access_pos', 'manage_sales'], status: 'active', password: '',
  })
  if (updatedUser.user.name !== 'Prueba actualizada') throw new Error('Usuario no actualizado')

  const createdSupplier = await request('/api/data/suppliers', 'POST', {
    name: 'Proveedor de prueba', ruc: '', contact: '', email: '', phone: '', address: '',
    category: 'pruebas', rating: 0, isActive: true, creditLimit: 0, paymentTerms: '', contacts: [],
  })
  supplierId = createdSupplier.item.id
  const updatedSupplier = await request(`/api/data/suppliers/${supplierId}`, 'PUT', {
    ...createdSupplier.item, name: 'Proveedor actualizado',
  })
  if (updatedSupplier.item.name !== 'Proveedor actualizado') throw new Error('Proveedor no actualizado')

  await request(`/api/data/products/${productId}`, 'PUT', { ...stored, supplierId })
  const createdOrder = await request('/api/purchase-orders', 'POST', { productId, supplierId, quantity: 2, unitCost: 400, notes: 'Pedido temporal' })
  orderId = createdOrder.item.id
  const beforeReceive = (await request('/api/data/products')).items.find(item => item.id === productId)
  if (beforeReceive.stock !== 1) throw new Error('La orden pendiente modificó el stock')
  const received = await request(`/api/purchase-orders/${orderId}`, 'PATCH', { status: 'received' })
  orderPurchaseId = received.purchase.id
  if (received.stock !== 3 || received.purchase.total !== 800) throw new Error('Recepción incorrecta')
  const duplicate = await fetch(origin + `/api/purchase-orders/${orderId}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ status: 'received' }) })
  if (duplicate.status !== 409) throw new Error('La orden se pudo recibir dos veces')
  const secondSale = await request('/api/checkout', 'POST', { items: [{ id: productId, quantity: 1 }], paymentMethod: 'card' })
  secondSaleId = secondSale.sale.id
  if ((await request('/api/data/products')).items.find(item => item.id === productId).stock !== 2) throw new Error('La venta no descontó stock recibido')
  const cancelledOrder = await request('/api/purchase-orders', 'POST', { productId, supplierId, quantity: 5, unitCost: 100 })
  cancelledOrderId = cancelledOrder.item.id
  await request(`/api/purchase-orders/${cancelledOrderId}`, 'PATCH', { status: 'cancelled' })
  if ((await request('/api/data/products')).items.find(item => item.id === productId).stock !== 2) throw new Error('La cancelación modificó el stock')

  const createdExpense = await request('/api/data/expenses', 'POST', {
    description: 'Gasto temporal', amount: 1000, date: new Date().toISOString(), category: 'pruebas',
  })
  expenseId = createdExpense.item.id
  const updatedExpense = await request(`/api/data/expenses/${expenseId}`, 'PUT', {
    ...createdExpense.item, amount: 1200,
  })
  if (updatedExpense.item.amount !== 1200) throw new Error('Gasto no actualizado')
  console.log('OK: acceso, productos, proveedores, órdenes, recepción única, ventas, stock, usuarios y gastos en PostgreSQL')
} finally {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    if (saleId) await client.query('DELETE FROM sales WHERE id = $1', [saleId])
    if (secondSaleId) await client.query('DELETE FROM sales WHERE id = $1', [secondSaleId])
    if (purchaseId) await client.query('DELETE FROM purchases WHERE id = $1', [purchaseId])
    if (orderPurchaseId) await client.query('DELETE FROM purchases WHERE id = $1', [orderPurchaseId])
    if (orderId) await client.query('DELETE FROM purchase_orders WHERE id = $1', [orderId])
    if (cancelledOrderId) await client.query('DELETE FROM purchase_orders WHERE id = $1', [cancelledOrderId])
    if (productId) {
      await client.query('DELETE FROM stock_movements WHERE product_id = $1', [productId])
      await client.query('DELETE FROM products WHERE id = $1', [productId])
    }
    if (expenseId) await client.query('DELETE FROM expenses WHERE id = $1', [expenseId])
    if (supplierId) await client.query('DELETE FROM suppliers WHERE id = $1', [supplierId])
    if (userId) await client.query('DELETE FROM app_users WHERE id = $1', [userId])
    if (authUserId) await client.query('DELETE FROM app_users WHERE id = $1', [authUserId])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await db.end()
  }
}
