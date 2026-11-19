import "server-only"

import { randomUUID } from "node:crypto"
import type { PoolClient } from "pg"
import type { KitchenTicket, OrderLine, OrderModifier, ServiceOrder, ServiceOrderType } from "./service-order-types"
import { effectivePrice } from "./product-price"

export class ServiceOrderError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}

export const cleanText = (value: unknown, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : ""
export const validOrderType = (value: unknown): value is ServiceOrderType =>
  value === "dineIn" || value === "delivery" || value === "pickup"

type OrderRow = Record<string, any>
const iso = (value: Date | string | null) => value ? new Date(value).toISOString() : null

export function mapOrder(row: OrderRow): ServiceOrder {
  return {
    id: Number(row.id), cardId: row.card_id == null ? null : Number(row.card_id),
    cardCode: row.card_code ?? null, tableId: row.table_id == null ? null : Number(row.table_id), status: row.status, orderType: row.order_type,
    tableLabel: row.table_label, customerName: row.customer_name,
    customerPhone: row.customer_phone, notes: row.notes,
    items: row.items ?? [], total: Number(row.total),
    createdAt: iso(row.created_at)!, updatedAt: iso(row.updated_at)!,
    closedAt: iso(row.closed_at), saleId: row.sale_id == null ? null : Number(row.sale_id),
    waiterId: row.waiter_id == null ? null : Number(row.waiter_id), waiterName: row.waiter_name ?? "",
    billedAt: iso(row.billed_at ?? null), billCount: Number(row.bill_count ?? 0),
    customerId: row.customer_id == null ? null : Number(row.customer_id),
    source: row.source ?? "pos", confirmation: row.confirmation ?? "confirmed",
    deliveryZoneId: row.delivery_zone_id == null ? null : Number(row.delivery_zone_id),
    deliveryZoneName: row.delivery_zone_name ?? "", deliveryFee: Number(row.delivery_fee ?? 0),
    deliveryAddress: row.delivery_address ?? "",
    deliveryLocation: row.delivery_lat != null && row.delivery_lng != null ? { lat: Number(row.delivery_lat), lng: Number(row.delivery_lng) } : null,
    courierId: row.courier_id == null ? null : Number(row.courier_id), courierName: row.courier_name ?? "",
    grandTotal: Number(row.total) + Number(row.delivery_fee ?? 0),
  }
}

/** Solo dígitos; los números locales (09…) pasan a 5959…. Vacío si no parece un teléfono. */
export function normalizePhone(value: unknown): string {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : ""
  if (digits.length < 6) return ""
  if (digits.startsWith("0")) return `595${digits.slice(1)}`.slice(0, 20)
  return digits.slice(0, 20)
}

/**
 * Registra el cliente del pedido (por teléfono o, si no hay, por RUC) y devuelve su id.
 * No pisa datos ya cargados con valores vacíos.
 */
export async function upsertCustomer(client: PoolClient, input: { name?: unknown; phone?: unknown; ruc?: unknown; address?: unknown }): Promise<number | null> {
  const phone = normalizePhone(input.phone)
  const ruc = cleanText(input.ruc, 50)
  const name = cleanText(input.name, 120)
  const address = cleanText(input.address, 300)
  if (!phone && !ruc) return null
  if (name === "Cliente General" && !phone) return null
  const existing = await client.query(
    phone ? "SELECT id FROM customers WHERE phone = $1 FOR UPDATE" : "SELECT id FROM customers WHERE ruc = $1 FOR UPDATE",
    [phone || ruc])
  if (existing.rows[0]) {
    const id = Number(existing.rows[0].id)
    await client.query(`UPDATE customers SET
        name = CASE WHEN $2 <> '' AND $2 <> 'Cliente General' THEN $2 ELSE name END,
        ruc = CASE WHEN $3 <> '' AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.ruc = $3 AND c.id <> $1) THEN $3 ELSE ruc END,
        address = CASE WHEN $4 <> '' THEN $4 ELSE address END,
        updated_at = NOW()
      WHERE id = $1`, [id, name, ruc, address])
    return id
  }
  const taken = ruc ? await client.query("SELECT 1 FROM customers WHERE ruc = $1", [ruc]) : { rows: [] }
  const inserted = await client.query(`INSERT INTO customers (name, phone, ruc, address)
    VALUES ($1, $2, $3, $4) RETURNING id`, [name === "Cliente General" ? "" : name, phone, taken.rows[0] ? "" : ruc, address])
  return Number(inserted.rows[0].id)
}

/** Suma una compra a las estadísticas del cliente. */
export async function recordCustomerPurchase(client: PoolClient, customerId: number | null, amount: number) {
  if (!customerId) return
  await client.query(`UPDATE customers SET orders_count = orders_count + 1, total_spent = total_spent + $2,
    last_order_at = NOW(), updated_at = NOW() WHERE id = $1`, [customerId, Math.max(0, Math.round(amount))])
}

/** Costo de envío de una zona para un subtotal: gratis desde `free_over` si está configurado. */
export async function deliveryFeeFor(client: PoolClient, zoneId: number | null, subtotal: number): Promise<{ id: number; name: string; fee: number } | null> {
  if (!zoneId) return null
  const result = await client.query("SELECT id, name, fee, free_over FROM delivery_zones WHERE id = $1 AND is_active", [zoneId])
  const zone = result.rows[0]
  if (!zone) throw new ServiceOrderError("Zona de delivery no disponible.", 404)
  const freeOver = zone.free_over == null ? null : Number(zone.free_over)
  const fee = freeOver != null && subtotal >= freeOver ? 0 : Number(zone.fee)
  return { id: Number(zone.id), name: String(zone.name), fee }
}

/** Recalcula el envío de la orden según su zona y el subtotal actual. */
export async function refreshDeliveryFee(client: PoolClient, orderId: number) {
  const row = (await client.query("SELECT order_type, delivery_zone_id, total FROM service_orders WHERE id = $1", [orderId])).rows[0]
  if (!row) return
  const zone = row.order_type === "delivery" && row.delivery_zone_id
    ? await deliveryFeeFor(client, Number(row.delivery_zone_id), Number(row.total)).catch(() => null)
    : null
  await client.query("UPDATE service_orders SET delivery_fee = $1 WHERE id = $2", [zone?.fee ?? 0, orderId])
}

export type OrderActor = { id: string | number; name: string } | null

/** Agrega un evento al historial de la orden (nunca se edita). */
export async function logOrderEvent(client: PoolClient, orderId: number, event: string,
  details: { status?: string; note?: string; ticketId?: number | null; actor?: OrderActor } = {}) {
  await client.query(`INSERT INTO order_status_history (order_id, ticket_id, event, status, note, actor_id, actor_name)
    VALUES ($1, $2, $3, $4, $5, $6, $7)`, [orderId, details.ticketId ?? null, event, details.status ?? "",
    (details.note ?? "").slice(0, 500), details.actor ? Number(details.actor.id) || null : null, details.actor?.name ?? ""])
}

/** Valida que el mesero sea un usuario activo del mismo restaurante. null quita la asignación. */
export async function resolveWaiter(client: PoolClient, rawId: unknown, restaurantId: string | null): Promise<{ id: number; name: string } | null> {
  if (rawId === null || rawId === "") return null
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id <= 0) throw new ServiceOrderError("Mesero inválido.")
  const result = await client.query(`SELECT id, name FROM public.app_users
    WHERE id = $1 AND restaurant_id = $2 AND is_active = TRUE AND role <> 'superadmin'`, [id, restaurantId])
  if (!result.rows[0]) throw new ServiceOrderError("El mesero no existe o está inactivo.", 404)
  return { id: Number(result.rows[0].id), name: String(result.rows[0].name) }
}

export function mapTicket(row: OrderRow): KitchenTicket {
  return {
    id: Number(row.id), orderId: Number(row.order_id), status: row.status,
    orderType: row.order_type, tableLabel: row.table_label,
    customerName: row.customer_name, cardCode: row.card_code ?? null, waiterName: row.waiter_name ?? "",
    courierName: row.courier_name ?? "", deliveryAddress: row.delivery_address ?? "",
    items: row.items ?? [], notes: row.notes, priority: row.priority === "high" ? "high" : "normal",
    delayMinutes: row.delay_minutes == null ? null : Number(row.delay_minutes),
    createdAt: iso(row.created_at)!, updatedAt: iso(row.updated_at)!, boardColumn: row.board_column ?? null,
  }
}

export async function loadOrder(client: PoolClient, id: number, lock = false): Promise<ServiceOrder> {
  const result = await client.query(`SELECT o.*, c.code AS card_code FROM service_orders o
    LEFT JOIN order_cards c ON c.id = o.card_id WHERE o.id = $1 ${lock ? "FOR UPDATE OF o" : ""}`, [id])
  if (!result.rows[0]) throw new ServiceOrderError("Orden no encontrada.", 404)
  return mapOrder(result.rows[0])
}

export async function makeOrderLines(client: PoolClient, rawItems: unknown, orderType: ServiceOrderType): Promise<OrderLine[]> {
  if (!Array.isArray(rawItems) || rawItems.length > 100) throw new ServiceOrderError("Lista de productos inválida.")
  const normalized = rawItems.map((item: any) => ({
    id: Number(item?.id ?? item?.productId), quantity: Number(item?.quantity),
    modifiers: Array.isArray(item?.selectedModifiers) ? item.selectedModifiers : [],
  }))
  for (const item of normalized) {
    if (!Number.isSafeInteger(item.id) || item.id <= 0 || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 1000) {
      throw new ServiceOrderError("Producto o cantidad inválida.")
    }
  }
  const products = new Map<number, any>()
  for (const id of [...new Set(normalized.map((item) => item.id))].sort((a, b) => a - b)) {
    const result = await client.query("SELECT data FROM products WHERE id = $1 FOR UPDATE", [id])
    const product = result.rows[0]?.data
    if (!product || product.isActive === false) throw new ServiceOrderError(`El producto ${id} no está disponible.`)
    products.set(id, product)
  }
  const lines: OrderLine[] = []
  for (const item of normalized) {
    const product = products.get(item.id)
    const selected: OrderModifier[] = []
    const keys = new Set<string>()
    for (const raw of item.modifiers) {
      const groupId = Number(raw?.groupId)
      const optionId = Number(raw?.optionId)
      if (!Number.isSafeInteger(groupId) || !Number.isSafeInteger(optionId)) throw new ServiceOrderError("Agregado inválido.")
      const key = `${groupId}:${optionId}`
      if (keys.has(key)) throw new ServiceOrderError("Agregado duplicado.")
      keys.add(key)
      const group = product.modifierGroups?.find((entry: any) => entry.legacyId === groupId)
      const option = group?.options?.find((entry: any) => entry.legacyId === optionId)
      if (!group || !option || !Number.isSafeInteger(option.price) || option.price < 0) {
        throw new ServiceOrderError("Uno de los agregados no está disponible.")
      }
      selected.push({ groupId, groupName: group.name, optionId, name: option.name, price: option.price })
    }
    for (const group of product.modifierGroups ?? []) {
      const count = selected.filter((entry) => entry.groupId === group.legacyId).length
      if ((group.required && count === 0) || (!group.multiple && count > 1)) {
        throw new ServiceOrderError(`Elegí correctamente los agregados de ${group.name}.`)
      }
    }
    const basePrice = effectivePrice(product, orderType)
    const price = basePrice + selected.reduce((sum, modifier) => sum + modifier.price, 0)
    const subtotal = price * item.quantity
    if (!Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(subtotal)) throw new ServiceOrderError("Precio inválido.")
    lines.push({ lineId: randomUUID(), productId: item.id, productName: product.name,
      quantity: item.quantity, price, subtotal, modifiers: selected, stockReserved: false, ticketId: null })
  }
  return lines
}

export async function saveOrderItems(client: PoolClient, order: ServiceOrder, newLines: OrderLine[]): Promise<ServiceOrder> {
  const items = [...order.items, ...newLines]
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)
  if (!Number.isSafeInteger(total)) throw new ServiceOrderError("El total excede el límite permitido.")
  // Nuevos consumos dejan sin efecto la precuenta impresa: hay que volver a imprimirla.
  await client.query("UPDATE service_orders SET items = $1::jsonb, total = $2, billed_at = NULL, updated_at = NOW() WHERE id = $3",
    [JSON.stringify(items), total, order.id])
  await refreshDeliveryFee(client, order.id)
  const fee = Number((await client.query("SELECT delivery_fee FROM service_orders WHERE id = $1", [order.id])).rows[0]?.delivery_fee ?? 0)
  return { ...order, items, total, billedAt: null, deliveryFee: fee, grandTotal: total + fee }
}

export async function sendDraftToKitchen(client: PoolClient, order: ServiceOrder, userId: number | null): Promise<{ order: ServiceOrder; ticket: KitchenTicket }> {
  if (order.confirmation === "pending") throw new ServiceOrderError("Confirmá el pedido antes de enviarlo a cocina.", 409)
  if (order.confirmation === "rejected") throw new ServiceOrderError("El pedido fue rechazado.", 409)
  const draft = order.items.filter((line) => line.ticketId == null)
  if (!draft.length) throw new ServiceOrderError("No hay productos nuevos para enviar a cocina.")
  const quantities = new Map<number, number>()
  for (const line of draft) quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity)
  for (const [id, quantity] of [...quantities].sort((a, b) => a[0] - b[0])) {
    const result = await client.query("SELECT data FROM products WHERE id = $1 FOR UPDATE", [id])
    const product = result.rows[0]?.data
    if (!product || product.isActive === false) throw new ServiceOrderError("Un producto ya no está disponible.")
    if (product.trackStock === false) continue
    if (!Number.isSafeInteger(product.stock) || product.stock < quantity) throw new ServiceOrderError(`Stock insuficiente para ${product.name}.`)
    await client.query("UPDATE products SET data = jsonb_set(data, '{stock}', to_jsonb($1::integer)), updated_at = NOW() WHERE id = $2",
      [product.stock - quantity, id])
    await client.query(`INSERT INTO stock_movements (product_id, previous_stock, new_stock, reason, user_id)
      VALUES ($1, $2, $3, 'kitchen_order', $4)`, [id, product.stock, product.stock - quantity, userId])
  }
  const insert = await client.query(`INSERT INTO kitchen_tickets (order_id, items, notes)
    VALUES ($1, $2::jsonb, $3) RETURNING id`, [order.id, JSON.stringify(draft), order.notes])
  const ticketId = Number(insert.rows[0].id)
  const items = order.items.map((line) => line.ticketId == null ? { ...line, ticketId, stockReserved: true } : line)
  await client.query("UPDATE service_orders SET items = $1::jsonb, updated_at = NOW() WHERE id = $2", [JSON.stringify(items), order.id])
  const ticketRow = await client.query(`SELECT t.*, o.order_type, o.table_label, o.customer_name, o.waiter_name, o.courier_name, o.delivery_address, c.code AS card_code
    FROM kitchen_tickets t JOIN service_orders o ON o.id = t.order_id
    LEFT JOIN order_cards c ON c.id = o.card_id WHERE t.id = $1`, [ticketId])
  return { order: { ...order, items }, ticket: mapTicket(ticketRow.rows[0]) }
}
