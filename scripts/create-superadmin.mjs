import { readFile } from "node:fs/promises"
import { randomBytes, scryptSync } from "node:crypto"
import { resolve } from "node:path"
import pg from "pg"

const envFile = await readFile(resolve(".env.local"), "utf8").catch(() => "")
const connectionString = process.env.DATABASE_URL || envFile.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
if (!connectionString) throw new Error("DATABASE_URL no está configurada.")
const email = process.env.SUPERADMIN_EMAIL || "superadmin@cnid.local"
const username = process.env.SUPERADMIN_USERNAME || "superadmin"
const name = process.env.SUPERADMIN_NAME || "Superadministrador CNID"
const password = process.env.SUPERADMIN_PASSWORD || randomBytes(18).toString("base64url")
if (password.length < 14) throw new Error("La contraseña debe tener al menos 14 caracteres.")
const salt = randomBytes(16).toString("hex")
const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`
const pool = new pg.Pool({ connectionString })
try {
  const found = await pool.query(`SELECT id FROM public.app_users WHERE role = 'superadmin' LIMIT 1`)
  if (found.rows[0]) {
    console.log("Ya existe una cuenta de superadministrador. No se modificó su contraseña.")
  } else {
    await pool.query(
      `INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id)
       VALUES ($1,$2,$3,'superadmin',ARRAY['manage_restaurants']::text[],$4,NULL)`,
      [email, username, name, hash],
    )
    // Si la contraseña vino de SUPERADMIN_PASSWORD no se repite en el log.
    console.log(process.env.SUPERADMIN_PASSWORD
      ? `Superadministrador creado. Usuario: ${email} (contraseña: la de SUPERADMIN_PASSWORD)`
      : `Superadministrador creado. Usuario: ${email} Contraseña inicial: ${password}`)
  }
} finally { await pool.end() }
