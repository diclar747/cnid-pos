import "server-only"

import { authDb, schemaQuery, type SchemaQuery } from "./db"

// Acceso público desde el QR de una mesa: el código identifica restaurante y mesa, sin sesión.
export const tableCodePattern = /^CNID-TABLE-[A-F0-9]{24}$/

export type TablePlace = { restaurantId: number; restaurantName: string; schema: string; query: SchemaQuery }
export type TableRow = { id: number; label: string; roomName: string; orderId: number | null }

export async function locateTable(rawCode: string): Promise<(TablePlace & { code: string }) | null> {
  const code = rawCode.toUpperCase()
  if (!tableCodePattern.test(code)) return null
  const result = await authDb.query(`SELECT r.id, r.name, r.schema_name FROM public.table_directory d
    JOIN public.restaurants r ON r.id = d.restaurant_id WHERE d.code = $1 AND r.status = 'active'`, [code])
  const place = result.rows[0]
  if (!place || !/^(public|restaurant_[0-9]+)$/.test(place.schema_name)) return null
  return { code, restaurantId: Number(place.id), restaurantName: place.name, schema: place.schema_name, query: await schemaQuery(place.schema_name) }
}

export async function findTable(place: TablePlace & { code: string }): Promise<TableRow | null> {
  const row = (await place.query(`SELECT t.id, t.label, r.name AS room_name, o.id AS order_id
    FROM dining_tables t JOIN dining_rooms r ON r.id = t.room_id
    LEFT JOIN service_orders o ON o.table_id = t.id AND o.status = 'open'
    WHERE t.code = $1 AND t.is_active AND r.is_active`, [place.code])).rows[0]
  return row ? { id: Number(row.id), label: row.label, roomName: row.room_name, orderId: row.order_id == null ? null : Number(row.order_id) } : null
}

/** Límite simple en memoria por IP y clave, para que un QR no se use para saturar avisos. */
const hits = new Map<string, number[]>()
export function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) for (const [k, times] of hits) if (!times.some((time) => now - time < windowMs)) hits.delete(k)
  return recent.length > max
}

export const clientIp = (headers: Headers) => headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
