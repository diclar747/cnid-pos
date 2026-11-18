import "server-only"

import type { Customer, Courier, DeliveryZone } from "./service-order-types"
import { cleanText, normalizePhone } from "./service-order-server"

type Row = Record<string, any>
const iso = (value: unknown) => value ? new Date(value as string).toISOString() : null

export const mapCustomer = (row: Row): Customer => ({
  id: Number(row.id), name: row.name, phone: row.phone, ruc: row.ruc, email: row.email, address: row.address,
  notes: row.notes, ordersCount: Number(row.orders_count), totalSpent: Number(row.total_spent),
  lastOrderAt: iso(row.last_order_at), createdAt: iso(row.created_at)!,
  creditEnabled: Boolean(row.credit_enabled), creditLimit: row.credit_limit == null ? null : Number(row.credit_limit),
  billingCycle: (row.billing_cycle ?? "monthly") as Customer["billingCycle"], balance: Number(row.balance ?? 0),
})

/** Datos de crédito del cliente (solo caja o administración los cambia). undefined = no se tocan. */
export function validateCredit(body: any) {
  if (body?.creditEnabled === undefined && body?.creditLimit === undefined && body?.billingCycle === undefined) return undefined
  const limit = body?.creditLimit === null || body?.creditLimit === "" || body?.creditLimit === undefined ? null : Number(body.creditLimit)
  if (limit !== null && (!Number.isSafeInteger(limit) || limit < 0 || limit > 10_000_000_000)) throw new RecordError("Límite de crédito inválido.")
  const cycle = ["weekly", "biweekly", "monthly", "none"].includes(body?.billingCycle) ? body.billingCycle : "monthly"
  return { creditEnabled: body?.creditEnabled === true, creditLimit: limit, billingCycle: cycle as "weekly" | "biweekly" | "monthly" | "none" }
}

export const mapZone = (row: Row): DeliveryZone => ({
  id: Number(row.id), name: row.name, areas: row.areas, fee: Number(row.fee),
  freeOver: row.free_over == null ? null : Number(row.free_over),
  etaMinutes: row.eta_minutes == null ? null : Number(row.eta_minutes),
  maxKm: row.max_km == null ? null : Number(row.max_km),
  isActive: row.is_active, sortOrder: Number(row.sort_order),
})

export const mapCourier = (row: Row): Courier => ({
  id: Number(row.id), name: row.name, phone: row.phone, vehicle: row.vehicle, isActive: row.is_active,
})

export class RecordError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}

const money = (value: unknown, label: string, optional = false): number | null => {
  if (optional && (value === null || value === undefined || value === "")) return null
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0) throw new RecordError(`${label} inválido.`)
  return number
}

export function validateCustomer(body: any) {
  const name = cleanText(body?.name, 120)
  const phone = normalizePhone(body?.phone)
  const ruc = cleanText(body?.ruc, 50)
  if (!name && !phone && !ruc) throw new RecordError("Indicá al menos nombre, teléfono o RUC.")
  if (typeof body?.phone === "string" && body.phone.trim() && !phone) throw new RecordError("Teléfono inválido.")
  const email = cleanText(body?.email, 160)
  if (email && !email.includes("@")) throw new RecordError("Email inválido.")
  return { name, phone, ruc, email, address: cleanText(body?.address, 300), notes: cleanText(body?.notes, 1000) }
}

export function validateZone(body: any) {
  const name = cleanText(body?.name, 80)
  if (!name) throw new RecordError("Indicá el nombre de la zona.")
  const eta = body?.etaMinutes === null || body?.etaMinutes === undefined || body?.etaMinutes === "" ? null : Number(body.etaMinutes)
  if (eta !== null && (!Number.isSafeInteger(eta) || eta < 1 || eta > 600)) throw new RecordError("Tiempo estimado inválido.")
  const maxKm = body?.maxKm === null || body?.maxKm === undefined || body?.maxKm === "" ? null : Number(body.maxKm)
  if (maxKm !== null && (!Number.isFinite(maxKm) || maxKm <= 0 || maxKm > 500)) throw new RecordError("Distancia máxima inválida (km).")
  return { maxKm: maxKm === null ? null : Math.round(maxKm * 100) / 100,
    name, areas: cleanText(body?.areas, 500), fee: money(body?.fee ?? 0, "Costo de envío")!,
    freeOver: money(body?.freeOver, "Monto para envío gratis", true), etaMinutes: eta,
    isActive: body?.isActive !== false, sortOrder: Number.isSafeInteger(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
  }
}

export function validateCourier(body: any) {
  const name = cleanText(body?.name, 80)
  if (!name) throw new RecordError("Indicá el nombre del repartidor.")
  return { name, phone: cleanText(body?.phone, 40), vehicle: cleanText(body?.vehicle, 60), isActive: body?.isActive !== false }
}

export function recordError(error: unknown) {
  if (error instanceof RecordError) return { message: error.message, status: error.status }
  if ((error as { code?: string })?.code === "23505") return { message: "Ya existe un registro con ese nombre, teléfono o RUC.", status: 409 }
  console.error("Record operation failed", error)
  return { message: "No se pudo guardar.", status: 500 }
}
