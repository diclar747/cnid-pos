import "server-only"

import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "./auth"
import { db } from "./db"
import { mapCourier, mapZone, recordError, validateCourier, validateZone } from "./customer-records"

// Zonas de delivery y repartidores comparten la misma forma de API:
// lectura para quien usa el POS y cambios para quien administra la empresa.

type Resource = {
  table: string
  order: string
  map: (row: Record<string, any>) => unknown
  values: (body: unknown) => unknown[]
  insert: string
  update: string
}

export const resources: Record<"zones" | "couriers", Resource> = {
  zones: {
    table: "delivery_zones", order: "sort_order, name", map: mapZone,
    values: (body) => { const v = validateZone(body); return [v.name, v.areas, v.fee, v.freeOver, v.etaMinutes, v.isActive, v.sortOrder] },
    insert: "(name, areas, fee, free_over, eta_minutes, is_active, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    update: "name=$2, areas=$3, fee=$4, free_over=$5, eta_minutes=$6, is_active=$7, sort_order=$8",
  },
  couriers: {
    table: "couriers", order: "is_active DESC, name", map: mapCourier,
    values: (body) => { const v = validateCourier(body); return [v.name, v.phone, v.vehicle, v.isActive] },
    insert: "(name, phone, vehicle, is_active) VALUES ($1,$2,$3,$4)",
    update: "name=$2, phone=$3, vehicle=$4, is_active=$5",
  },
}

async function authorize(request: NextRequest, permission: string) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, permission)) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  return null
}

const failure = (error: unknown) => {
  const { message, status } = recordError(error)
  return NextResponse.json({ error: message }, { status })
}

export async function listResource(request: NextRequest, resource: Resource) {
  const denied = await authorize(request, "access_pos")
  if (denied) return denied
  const result = await db.query(`SELECT * FROM ${resource.table} ORDER BY ${resource.order}`)
  return NextResponse.json({ items: result.rows.map(resource.map) })
}

export async function createResource(request: NextRequest, resource: Resource) {
  const denied = await authorize(request, "manage_company")
  if (denied) return denied
  try {
    const values = resource.values(await request.json().catch(() => null))
    const result = await db.query(`INSERT INTO ${resource.table} ${resource.insert} RETURNING *`, values)
    return NextResponse.json({ item: resource.map(result.rows[0]) }, { status: 201 })
  } catch (error) { return failure(error) }
}

function parseId(raw: string) {
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function updateResource(request: NextRequest, resource: Resource, rawId: string) {
  const denied = await authorize(request, "manage_company")
  if (denied) return denied
  const id = parseId(rawId)
  if (!id) return NextResponse.json({ error: "Registro inválido." }, { status: 400 })
  try {
    const values = resource.values(await request.json().catch(() => null))
    const result = await db.query(`UPDATE ${resource.table} SET ${resource.update}, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, ...values])
    if (!result.rows[0]) return NextResponse.json({ error: "No encontrado." }, { status: 404 })
    return NextResponse.json({ item: resource.map(result.rows[0]) })
  } catch (error) { return failure(error) }
}

// Las órdenes que lo usaban conservan el nombre guardado; solo se vacía la referencia.
export async function deleteResource(request: NextRequest, resource: Resource, rawId: string) {
  const denied = await authorize(request, "manage_company")
  if (denied) return denied
  const id = parseId(rawId)
  if (!id) return NextResponse.json({ error: "Registro inválido." }, { status: 400 })
  try {
    const result = await db.query(`DELETE FROM ${resource.table} WHERE id = $1`, [id])
    return result.rowCount ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "No encontrado." }, { status: 404 })
  } catch (error) { return failure(error) }
}
