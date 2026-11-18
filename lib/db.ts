import "server-only"

import { createHash } from "node:crypto"
import { cookies } from "next/headers"
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg"

declare global {
  // Reuse the pool across Next.js hot reloads in development.
  var cnidPosPool: Pool | undefined
}

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada. Revisá .env.local.")
  }

  return new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 })
}

// El pool se crea en la primera consulta, no al importar el módulo: así `next build`
// funciona sin DATABASE_URL (en el panel de hosting el build no recibe las variables).
function getPool(): Pool {
  if (!globalThis.cnidPosPool) globalThis.cnidPosPool = createPool()
  return globalThis.cnidPosPool
}

export const authDb: Pool = new Proxy({} as Pool, {
  get(_target, property) {
    const pool = getPool()
    const value = Reflect.get(pool, property, pool)
    return typeof value === "function" ? value.bind(pool) : value
  },
})

// Las cuentas y sesiones viven en public. Cada restaurante usa su propio esquema.
async function currentSchema(): Promise<string> {
  const token = (await cookies()).get("cnidpos_session")?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new Error("Se requiere una sesión activa.")
  const hash = createHash("sha256").update(token).digest("hex")
  const result = await authDb.query(
    `SELECT r.schema_name FROM public.app_sessions s
       JOIN public.app_users u ON u.id = s.user_id
       JOIN public.restaurants r ON r.id = u.restaurant_id
      WHERE s.token_hash = $1 AND s.expires_at > NOW()
        AND u.is_active = TRUE AND r.status = 'active'`,
    [hash],
  )
  const schema = result.rows[0]?.schema_name
  if (typeof schema !== "string" || !/^(public|restaurant_[0-9]+)$/.test(schema)) {
    throw new Error("El restaurante no está disponible o la sesión venció.")
  }
  return schema
}

export type SchemaQuery = <T extends QueryResultRow = any>(sql: string, values?: unknown[]) => Promise<QueryResult<T>>

/**
 * Consulta atada a un esquema fijo. Sirve para trabajo en segundo plano (por ejemplo
 * notificaciones) que sigue después de responder, cuando ya no hay cookies de la petición.
 * Sin esquema usa el del usuario de la sesión actual.
 */
export async function schemaQuery(schema?: string): Promise<SchemaQuery> {
  const target = schema ?? await currentSchema()
  if (!/^(public|restaurant_[0-9]+)$/.test(target)) throw new Error("Esquema inválido.")
  return async (sql, values) => {
    const client = await authDb.connect()
    try {
      await client.query("BEGIN")
      await client.query(`SET LOCAL search_path TO "${target}"`)
      const result = await client.query(sql, values)
      await client.query("COMMIT")
      return result
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined)
      throw error
    } finally { client.release() }
  }
}

export const db = {
  async query<T extends QueryResultRow = any>(sql: string, values?: unknown[]): Promise<QueryResult<T>> {
    const schema = await currentSchema()
    const client = await authDb.connect()
    try {
      await client.query("BEGIN")
      await client.query(`SET LOCAL search_path TO "${schema}"`)
      const result = await client.query<T>(sql, values)
      await client.query("COMMIT")
      return result
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined)
      throw error
    } finally { client.release() }
  },
  async connect(): Promise<PoolClient> {
    const schema = await currentSchema()
    const client = await authDb.connect()
    try { await client.query(`SET search_path TO "${schema}"`) }
    catch (error) { client.release(true); throw error }
    const release = client.release.bind(client)
    client.release = ((error?: Error | boolean) => {
      if (error) { release(true); return }
      void client.query("RESET search_path").then(() => release()).catch(() => release(true))
    }) as PoolClient["release"]
    return client
  },
}
