import fs from 'node:fs/promises'
import { randomBytes, scryptSync } from 'node:crypto'
import pg from 'pg'

const origin = process.env.POS_ORIGIN ?? 'http://127.0.0.1:3000'
const env = await fs.readFile('.env.local', 'utf8')
const connectionString = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
const db = new pg.Client({ connectionString })
await db.connect()
let saleId
let authUserId
try {
  const picked = await db.query(`SELECT id, data FROM products WHERE data->'legacy' IS NOT NULL ORDER BY id`)
  const product = picked.rows.find((row) => row.data.pricesByOrderType.delivery !== row.data.price &&
    row.data.modifierGroups?.some((group) => group.options.some((option) => option.price > 0)) &&
    row.data.modifierGroups.every((group) => !group.required || group.options.length))
  if (!product) throw new Error('No se encontró un producto de prueba con precio de delivery y agregados.')
  const group = product.data.modifierGroups.find((entry) => entry.options.some((option) => option.price > 0))
  const option = group.options.find((entry) => entry.price > 0)
  const selectedModifiers = [{ groupId: group.legacyId, optionId: option.legacyId }]
  for (const required of product.data.modifierGroups.filter((entry) => entry.required && entry.legacyId !== group.legacyId)) {
    selectedModifiers.push({ groupId: required.legacyId, optionId: required.options[0].legacyId })
  }
  const expected = product.data.pricesByOrderType.delivery + selectedModifiers.reduce((sum, selected) => {
    const match = product.data.modifierGroups.find((entry) => entry.legacyId === selected.groupId)
      .options.find((entry) => entry.legacyId === selected.optionId)
    return sum + match.price
  }, 0)
  let testEmail = process.env.POS_TEST_EMAIL
  let testPassword = process.env.POS_TEST_PASSWORD
  if (!testEmail || !testPassword) {
    const suffix = randomBytes(5).toString('hex')
    testEmail = `smoke-legacy-${suffix}@localhost.test`
    testPassword = randomBytes(18).toString('base64url')
    const salt = randomBytes(16).toString('hex')
    const hash = `${salt}:${scryptSync(testPassword, salt, 64).toString('hex')}`
    const created = await db.query(`INSERT INTO public.app_users
      (email, username, name, role, permissions, password_hash, restaurant_id)
      VALUES ($1, $2, 'Prueba temporal', 'admin', $3, $4, 1) RETURNING id`,
      [testEmail, `smoke-legacy-${suffix}`, ['access_pos', 'manage_sales'], hash])
    authUserId = Number(created.rows[0].id)
  }
  const login = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }) })
  if (!login.ok) throw new Error(`Login HTTP ${login.status}`)
  const cookie = login.headers.get('set-cookie')?.split(';')[0]
  const sale = await fetch(`${origin}/api/checkout`, { method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ items: [{ id: Number(product.id), quantity: 1, selectedModifiers }],
      paymentMethod: 'transfer', orderType: 'delivery' }) })
  const result = await sale.json()
  if (!sale.ok) throw new Error(`Checkout HTTP ${sale.status}: ${result.error}`)
  saleId = result.sale.id
  if (result.sale.total !== expected || result.sale.items[0].modifiers.length !== selectedModifiers.length) {
    throw new Error(`Total o agregados incorrectos: esperado ${expected}, recibido ${result.sale.total}`)
  }
  const after = await db.query('SELECT data FROM products WHERE id = $1', [product.id])
  if (after.rows[0].data.stock !== product.data.stock) throw new Error('Se alteró el stock del plato sin control de cantidades.')
  console.log(`POS importado verificado: delivery, agregados y stock (${expected} Gs).`)
} finally {
  if (saleId) await db.query('DELETE FROM sales WHERE id = $1', [saleId])
  if (authUserId) await db.query('DELETE FROM public.app_users WHERE id = $1', [authUserId])
  await db.end()
}
