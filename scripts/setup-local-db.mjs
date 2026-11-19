import { readFile } from "node:fs/promises"
import { randomBytes, scryptSync } from "node:crypto"
import { resolve } from "node:path"
import pg from "pg"

const envFile = await readFile(resolve(".env.local"), "utf8").catch(() => "")
const configuredUrl = envFile.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
const connectionString = process.env.DATABASE_URL || configuredUrl
if (!connectionString) throw new Error("Definí DATABASE_URL en .env.local antes de preparar la base.")

const pool = new pg.Pool({ connectionString })
const hashPassword = (password) => {
  const salt = randomBytes(16).toString("hex")
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`
}

try {
  const schema = await readFile(resolve("scripts/03-local-postgres.sql"), "utf8")
  await pool.query(schema)
  const restaurantsMigration = await readFile(resolve("scripts/04-restaurants.sql"), "utf8")
  await pool.query(restaurantsMigration)
  const diningMigration = await readFile(resolve("scripts/05-dining.sql"), "utf8")
  await pool.query(diningMigration)
  // Migraciones por restaurante (mesero y precuenta; clientes, historial y delivery):
  // en public y en el esquema de cada restaurante creado.
  const tenantMigrations = await Promise.all(["06-service-billing.sql", "07-customers-delivery.sql", "08-table-calls-push.sql", "09-cash-payments.sql", "10-realtime.sql", "11-whatsapp-ai.sql", "12-whatsapp-media.sql", "13-customer-credit.sql", "14-brand-assets.sql", "15-customer-accounts.sql", "16-kitchen-board.sql"]
    .map((file) => readFile(resolve("scripts", file), "utf8")))
  for (const sql of tenantMigrations) await pool.query(sql)
  const tenantSchemas = await pool.query("SELECT schema_name FROM public.restaurants WHERE schema_name ~ '^restaurant_[0-9]+$'")
  for (const { schema_name: schema } of tenantSchemas.rows) {
    const tenant = await pool.connect()
    try {
      await tenant.query("BEGIN")
      await tenant.query(`SET LOCAL search_path TO "${schema}"`)
      for (const sql of tenantMigrations) await tenant.query(sql)
      await tenant.query("COMMIT")
    } catch (error) {
      await tenant.query("ROLLBACK")
      throw error
    } finally { tenant.release() }
  }
  // Vincular cuentas abiertas que antes usaban un nombre de mesa libre.
  const defaultRoom = (await pool.query("SELECT id FROM dining_rooms ORDER BY id LIMIT 1")).rows[0]?.id
  if (defaultRoom) {
    const labels = await pool.query("SELECT DISTINCT TRIM(table_label) AS label FROM service_orders WHERE status='open' AND table_id IS NULL AND TRIM(table_label) <> ''")
    for (const { label } of labels.rows) {
      const code = `CNID-TABLE-${randomBytes(12).toString("hex").toUpperCase()}`
      const table = await pool.query(`INSERT INTO dining_tables (room_id, label, seats, shape, code)
        VALUES ($1,$2,4,'round',$3) ON CONFLICT (room_id,label) DO UPDATE SET label=EXCLUDED.label RETURNING id, code`,
        [defaultRoom, label.slice(0, 40), code])
      await pool.query("INSERT INTO public.table_directory (code, restaurant_id) VALUES ($1,1) ON CONFLICT DO NOTHING", [table.rows[0].code])
      await pool.query(`UPDATE service_orders SET table_id=$1 WHERE id=(
        SELECT id FROM service_orders WHERE status='open' AND table_id IS NULL AND table_label=$2 ORDER BY id LIMIT 1)
        AND NOT EXISTS (SELECT 1 FROM service_orders WHERE table_id=$1 AND status='open')`, [table.rows[0].id, label])
    }
  }

  // En un servidor público: SEED_SAMPLE_DATA=false evita las cuentas y productos de ejemplo
  // (con contraseñas conocidas) e INITIAL_ADMIN_* crea solo el administrador de «De la Casa».
  const seedSamples = process.env.SEED_SAMPLE_DATA !== "false"
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase()
  // Sin INITIAL_ADMIN_PASSWORD se genera una contraseña y se muestra una sola vez en el registro.
  const generatedAdminPassword = !process.env.INITIAL_ADMIN_PASSWORD
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || randomBytes(12).toString("base64url")
  const userCount = Number((await pool.query("SELECT COUNT(*) AS total FROM app_users")).rows[0].total)
  if (userCount === 0 && initialAdminEmail) {
    if (!initialAdminEmail.includes("@") || initialAdminPassword.length < 10) {
      throw new Error("INITIAL_ADMIN_EMAIL debe ser un email e INITIAL_ADMIN_PASSWORD tener al menos 10 caracteres.")
    }
    await pool.query(
      `INSERT INTO app_users (email, username, name, role, permissions, password_hash, restaurant_id)
       VALUES ($1, $2, $3, 'admin', $4, $5, 1)`,
      [initialAdminEmail, initialAdminEmail.split("@")[0].slice(0, 40), process.env.INITIAL_ADMIN_NAME?.trim() || "Administrador",
        ["view_dashboard", "manage_products", "manage_users", "view_reports", "manage_expenses", "manage_company", "manage_purchases", "manage_suppliers", "access_pos", "manage_sales"],
        hashPassword(initialAdminPassword)],
    )
    console.log(generatedAdminPassword
      ? `Administrador inicial creado: ${initialAdminEmail} — contraseña inicial: ${initialAdminPassword} (cambiala en Mi perfil)`
      : `Administrador inicial creado: ${initialAdminEmail}`)
  } else if (userCount === 0 && seedSamples) {
    const permissions = {
      admin: ["view_dashboard", "manage_products", "manage_users", "view_reports", "manage_expenses", "manage_company", "manage_purchases", "manage_suppliers", "access_pos", "manage_sales"],
      manager: ["view_dashboard", "view_reports", "view_products", "view_expenses", "access_pos", "manage_sales"],
      cashier: ["view_products", "access_pos", "manage_sales"],
    }
    const initialUsers = [
      ["admin@heroui.com", "admin", "Administrador Principal", "admin", "admin123"],
      ["manager@heroui.com", "gerente", "Gerente de Ventas", "manager", "manager123"],
      ["user@heroui.com", "cajero", "Cajero Principal", "cashier", "user123"],
    ]
    for (const [email, username, name, role, password] of initialUsers) {
      await pool.query(
        `INSERT INTO app_users (email, username, name, role, permissions, password_hash, restaurant_id)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [email, username, name, role, permissions[role], hashPassword(password)],
      )
    }
  }

  const productCount = Number((await pool.query("SELECT COUNT(*) AS total FROM products")).rows[0].total)
  if (productCount === 0 && seedSamples) {
    const products = JSON.parse(await readFile(resolve("scripts/seed-products.json"), "utf8"))
    for (const { id: _id, ...data } of products) {
      await pool.query("INSERT INTO products (data) VALUES ($1::jsonb)", [JSON.stringify(data)])
    }
  }

  await pool.query("INSERT INTO company_config (id, data) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING")
  console.log("Base local lista: usuarios iniciales y catálogo cargados si estaban vacíos.")
} finally {
  await pool.end()
}
