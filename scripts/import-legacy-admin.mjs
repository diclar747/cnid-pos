import fs from 'node:fs/promises'
import { randomBytes, scryptSync } from 'node:crypto'
import pg from 'pg'
import { readLegacyDump } from './legacy-sql.mjs'

const input = process.argv.find((arg) => arg.toLowerCase().endsWith('.sql'))
const legacyUserId = Number(process.argv.find((arg) => arg.startsWith('--user-id='))?.split('=')[1] ?? 2)
if (!input || !Number.isSafeInteger(legacyUserId)) throw new Error('Uso: node scripts/import-legacy-admin.mjs respaldo.sql --user-id=2')

const tables = readLegacyDump(input, new Set(['users', 'model_has_roles', 'roles']))
const legacyUser = tables.get('users')?.find((user) => user.id === legacyUserId)
const roles = new Map(tables.get('roles')?.map((role) => [role.id, role.name]))
const sourceRoles = tables.get('model_has_roles')?.filter((role) => role.model_id === legacyUserId).map((role) => roles.get(role.role_id)) ?? []
if (!legacyUser || legacyUser.restaurant_id !== 1 || !sourceRoles.some((role) => role?.startsWith('Admin_'))) {
  throw new Error('El usuario elegido no es administrador del restaurante De la Casa.')
}
const env = await fs.readFile('.env.local', 'utf8')
const connectionString = process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
const client = new pg.Client({ connectionString })
await client.connect()
try {
  await client.query('BEGIN')
  const existing = await client.query('SELECT id FROM app_users WHERE LOWER(email) = LOWER($1)', [legacyUser.email])
  if (existing.rows.length) {
    await client.query('ROLLBACK')
    console.log('La cuenta real ya existe; no se cambió su contraseña.')
    process.exit(0)
  }
  const password = randomBytes(18).toString('base64url')
  const salt = randomBytes(16).toString('hex')
  const hash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
  const permissions = ['view_dashboard', 'manage_products', 'manage_users', 'view_reports', 'manage_expenses',
    'manage_company', 'manage_purchases', 'manage_suppliers', 'access_pos', 'manage_sales']
  const username = `de-la-casa-${legacyUserId}`
  const inserted = await client.query(`INSERT INTO app_users (email, username, name, role, permissions, is_active, password_hash)
    VALUES ($1, $2, $3, 'admin', $4, TRUE, $5) RETURNING id`,
  [legacyUser.email, username, legacyUser.name, permissions, hash])
  await client.query('COMMIT')
  console.log(JSON.stringify({ id: inserted.rows[0].id, name: legacyUser.name,
    email: legacyUser.email, initialPassword: password, demoAccountsDisabled: false }, null, 2))
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally { await client.end() }
