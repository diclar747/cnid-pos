import "server-only"

import { randomUUID } from "node:crypto"
import type { PoolClient } from "pg"
import type { KitchenTicket, OrderLine, OrderModifier, ServiceOrder, ServiceOrderType } from "./service-order-types"

export class ServiceOrderError extends Error {
  constructor(message: string, public status = 400) { super(message) }
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
  }
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
    items: row.items ?? [], notes: row.notes,
    createdAt: iso(row.created_at)!, updatedAt: iso(row.updated_at)!,
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
    const basePrice = product.pricesByOrderType?.[orderType] ?? product.price
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
  return { ...order, items, total, billedAt: null }
}

export async function sendDraftToKitchen(client: PoolClient, order: ServiceOrder, userId: number | null): Promise<{ order: ServiceOrder; ticket: KitchenTicket }> {
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
  const ticketRow = await client.query(`SELECT t.*, o.order_type, o.table_label, o.customer_name, o.waiter_name, c.code AS card_code
    FROM kitchen_tickets t JOIN service_orders o ON o.id = t.order_id
    LEFT JOIN order_cards c ON c.id = o.card_id WHERE t.id = $1`, [ticketId])
  return { order: { ...order, items }, ticket: mapTicket(ticketRow.rows[0]) }
}
