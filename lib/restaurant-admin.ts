import "server-only"

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { hashPassword, type SessionUser } from "./auth"
import { authDb } from "./db"

export const adminPermissions = ["view_dashboard", "manage_products", "manage_users", "view_reports", "manage_expenses", "manage_company", "manage_purchases", "manage_suppliers", "access_pos", "manage_sales"]

export function requireSuperadmin(user: SessionUser | null) {
  return user?.role === "superadmin"
}

export function restaurantInput(body: unknown, creating = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Datos inválidos.")
  const input = body as Record<string, unknown>
  const field = (key: string, max: number) => String(input[key] ?? "").trim().slice(0, max)
  const name = field("name", 120)
  const slug = field("slug", 80).toLowerCase()
  const email = field("email", 180).toLowerCase()
  const adminName = field("adminName", 120)
  const adminEmail = field("adminEmail", 180).toLowerCase()
  const adminUsername = field("adminUsername", 80)
  const adminPassword = String(input.adminPassword ?? "")
  if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Indicá nombre y código URL válido.")
  if (email && !email.includes("@")) throw new Error("El email del restaurante no es válido.")
  if (creating && (!adminName || !adminEmail.includes("@") || !adminUsername || adminPassword.length < 10)) {
    throw new Error("Completá el administrador y una contraseña de al menos 10 caracteres.")
  }
  return { name, slug, legalName: field("legalName", 160), taxId: field("taxId", 50),
    email, phone: field("phone", 60), address: field("address", 240), notes: field("notes", 1000),
    adminName, adminEmail, adminUsername, adminPassword }
}

export async function createRestaurant(body: unknown) {
  const input = restaurantInput(body, true)
  const sql = await readFile(resolve(process.cwd(), "scripts/03-local-postgres.sql"), "utf8")
  const diningSql = await readFile(resolve(process.cwd(), "scripts/05-dining.sql"), "utf8")
  const tenantSql = await Promise.all(["06-service-billing.sql", "07-customers-delivery.sql", "08-table-calls-push.sql", "09-cash-payments.sql", "10-realtime.sql", "11-whatsapp-ai.sql"]
    .map((file) => readFile(resolve(process.cwd(), "scripts", file), "utf8")))
  const start = sql.indexOf("CREATE TABLE IF NOT EXISTS products")
  if (start < 0) throw new Error("No se encontró el esquema de datos.")
  const client = await authDb.connect()
  try {
    await client.query("BEGIN")
    const sequence = await client.query("SELECT nextval(pg_get_serial_sequence('public.restaurants', 'id')) AS id")
    const id = Number(sequence.rows[0].id)
    const schema = `restaurant_${id}`
    const restaurant = await client.query(
      `INSERT INTO public.restaurants (id, name, slug, schema_name, legal_name, tax_id, email, phone, address, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, input.name, input.slug, schema, input.legalName, input.taxId, input.email, input.phone, input.address, input.notes],
    )
    await client.query(`CREATE SCHEMA "${schema}"`)
    await client.query(`SET LOCAL search_path TO "${schema}"`)
    await client.query(sql.slice(start).replaceAll("REFERENCES app_users(", "REFERENCES public.app_users("))
    await client.query(diningSql)
    for (const sql of tenantSql) await client.query(sql)
    await client.query(`INSERT INTO "${schema}".company_config (id, data) VALUES (1, $1::jsonb)`,
      [JSON.stringify({ name: input.name, email: input.email, phone: input.phone, address: input.address, taxId: input.taxId, businessType: "restaurant" })])
    const admin = await client.query(
      `INSERT INTO public.app_users (name, email, username, role, permissions, is_active, password_hash, restaurant_id)
       VALUES ($1,$2,$3,'admin',$4,TRUE,$5,$6) RETURNING id, name, email`,
      [input.adminName, input.adminEmail, input.adminUsername, adminPermissions, hashPassword(input.adminPassword), id],
    )
    await client.query("COMMIT")
    return { restaurant: restaurant.rows[0], admin: admin.rows[0] }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally { client.release() }
}
