import "server-only"

import type { PoolClient } from "pg"
import { authDb, schemaQuery } from "./db"
import { deliveryFeeFor, loadOrder, logOrderEvent, makeOrderLines, mapTicket, refreshDeliveryFee, saveOrderItems, ServiceOrderError, upsertCustomer } from "./service-order-server"
import { stageOf, type CrmStage } from "./order-stage"
import { notifyStaff } from "./web-push"
import type { CustomerAccount } from "./customer-account"
import type { ServiceOrder } from "./service-order-types"

// Pedidos del cliente desde el marketplace: se crean como «Nuevos» en el tablero del restaurante (el local los confirma)
// y el cliente los sigue desde su cuenta. Precios, opciones y zonas los valida siempre el servidor.

const SCHEMA = /^(public|restaurant_[0-9]+)$/
export const STAGE_LABEL: Record<CrmStage, string> = {
  new: "Esperando confirmación", pending: "Confirmado", confirmed: "Confirmado", kitchen: "En preparación", ready: "Listo",
  delivery: "En camino", done: "Entregado", cancelled: "Cancelado",
}

async function restaurantBySlug(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null
  const row = (await authDb.query("SELECT id, name, slug, schema_name FROM public.restaurants WHERE slug = $1 AND status = 'active'", [slug])).rows[0]
  return row && SCHEMA.test(row.schema_name) ? row : null
}

async function inSchema<T>(schema: string, work: (client: PoolClient) => Promise<T>) {
  const client = await authDb.connect()
  try {
    await client.query("BEGIN")
    await client.query(`SET LOCAL search_path TO "${schema}"`)
    const result = await work(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally { client.release() }
}

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const rad = (value: number) => value * Math.PI / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

type PlaceInput = { slug: unknown; items: unknown; orderType: unknown; zoneId?: unknown; address?: unknown; lat?: unknown; lng?: unknown; notes?: unknown; name?: unknown }

/** Crea el pedido web del cliente en el restaurante. */
export async function placeOrder(account: CustomerAccount, input: PlaceInput) {
  const place = await restaurantBySlug(String(input.slug ?? ""))
  if (!place) throw new ServiceOrderError("El restaurante no está disponible.", 404)
  const orderType = input.orderType === "delivery" ? "delivery" : input.orderType === "pickup" ? "pickup" : null
  if (!orderType) throw new ServiceOrderError("Elegí si es delivery o retiro en el local.")
  const address = typeof input.address === "string" ? input.address.trim().slice(0, 300) : ""
  const lat = Number(input.lat), lng = Number(input.lng)
  const location = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0) ? { lat, lng } : null
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, 500) : ""
  if (!Array.isArray(input.items) || !input.items.length) throw new ServiceOrderError("Tu pedido está vacío.")
  if (!account.phone) throw new ServiceOrderError("Para retiro o delivery guardá tu cuenta con tu teléfono (en Mi cuenta).")

  const order = await inSchema(place.schema_name, async (client) => {
    const config = (await client.query("SELECT data FROM company_config WHERE id = 1")).rows[0]?.data ?? {}
    if (config.showInMarketplace === false) throw new ServiceOrderError("Este restaurante no recibe pedidos por la web.", 403)
    if (config.serviceModes?.[orderType] === false) throw new ServiceOrderError(orderType === "delivery" ? "Este restaurante no hace delivery." : "Este restaurante no ofrece retiro en el local.")
    let zone: { id: number; name: string } | null = null
    if (orderType === "delivery") {
      if (!address && !location) throw new ServiceOrderError("Indicá la dirección o compartí tu ubicación para el delivery.")
      const zones = (await client.query("SELECT id, name, max_km FROM delivery_zones WHERE is_active ORDER BY sort_order, id")).rows
      const chosen = Number(input.zoneId)
      if (Number.isSafeInteger(chosen) && chosen > 0) zone = zones.find((entry) => Number(entry.id) === chosen) ?? null
      const originLat = Number(String(config.latitude ?? "").replace(",", ".")), originLng = Number(String(config.longitude ?? "").replace(",", "."))
      if (!zone && location && Number.isFinite(originLat) && Number.isFinite(originLng) && String(config.latitude ?? "").trim()) {
        const km = distanceKm({ lat: originLat, lng: originLng }, location)
        zone = zones.filter((entry) => entry.max_km != null && km <= Number(entry.max_km)).sort((a, b) => Number(a.max_km) - Number(b.max_km))[0] ?? null
        if (!zone && zones.some((entry) => entry.max_km != null)) throw new ServiceOrderError(`Tu ubicación está a ${km.toFixed(1)} km, fuera de las zonas de delivery.`)
      }
      if (!zone && zones.length) throw new ServiceOrderError("Elegí tu zona de delivery.")
    }
    const name = (typeof input.name === "string" && input.name.trim() ? input.name.trim() : account.name).slice(0, 120)
    const customerId = await upsertCustomer(client, { name, phone: account.phone, address: orderType === "delivery" ? address : undefined })
    const fee = zone ? await deliveryFeeFor(client, zone.id, 0) : null
    const inserted = await client.query(`INSERT INTO service_orders (order_type, customer_name, customer_phone, notes, source, confirmation, customer_id,
        delivery_zone_id, delivery_zone_name, delivery_address, delivery_lat, delivery_lng, customer_account_id)
      VALUES ($1,$2,$3,$4,'web','pending',$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [orderType, name, account.phone, notes, customerId, fee?.id ?? null, fee?.name ?? "",
        orderType === "delivery" ? (address || "Ubicación compartida desde la web") : "", orderType === "delivery" ? location?.lat ?? null : null,
        orderType === "delivery" ? location?.lng ?? null : null, account.id])
    let saved = await loadOrder(client, Number(inserted.rows[0].id), true)
    const lines = await makeOrderLines(client, (input.items as any[]).slice(0, 60).map((item) => ({ id: item?.id, quantity: item?.quantity,
      selectedModifiers: Array.isArray(item?.options) ? item.options : [] })), orderType)
    saved = await saveOrderItems(client, saved, lines)
    if (zone) await refreshDeliveryFee(client, saved.id)
    const actor = { id: 0, name: `Cliente web · ${name}` }
    await logOrderEvent(client, saved.id, "created", { status: orderType, note: "Pedido desde el marketplace", actor })
    await logOrderEvent(client, saved.id, "items_added", { note: lines.map((line) => `${line.quantity} × ${line.productName}`).join(", "), actor })
    await client.query(`INSERT INTO public.customer_order_links (restaurant_id, order_id, account_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [place.id, saved.id, account.id])
    return loadOrder(client, saved.id)
  })
  const staff = await schemaQuery(place.schema_name)
  await notifyStaff(staff, { title: `Nuevo pedido web #${order.id}`, body: `${order.customerName} · ${order.orderType === "delivery" ? "Delivery" : "Retiro"} · Gs ${order.grandTotal.toLocaleString("es-PY")}`, url: "/crm", tag: `web-${order.id}` })
  return { ref: `${place.id}-${order.id}`, order }
}

/** Vincula a la cuenta un pedido hecho desde el QR de la mesa (si el cliente tiene la sesión iniciada). */
export async function linkTableOrder(client: PoolClient, restaurantId: number, orderId: number, accountId: number) {
  await client.query("UPDATE service_orders SET customer_account_id = COALESCE(customer_account_id, $2) WHERE id = $1", [orderId, accountId])
  await client.query("INSERT INTO public.customer_order_links (restaurant_id, order_id, account_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [restaurantId, orderId, accountId])
}

function publicOrder(order: ServiceOrder, tickets: ReturnType<typeof mapTicket>[]) {
  const stage = stageOf(order, tickets)
  return {
    id: order.id, stage, stageLabel: STAGE_LABEL[stage], orderType: order.orderType, source: order.source, tableLabel: order.tableLabel,
    status: order.status, createdAt: order.createdAt, updatedAt: order.updatedAt, total: order.total, deliveryFee: order.deliveryFee, grandTotal: order.grandTotal,
    deliveryAddress: order.deliveryAddress, deliveryZoneName: order.deliveryZoneName, courierName: order.courierName, notes: order.notes,
    items: order.items.map((line) => ({ name: line.productName, quantity: line.quantity, subtotal: line.subtotal, modifiers: line.modifiers.map((m) => m.name) })),
  }
}

type Link = { restaurant_id: string; order_id: string; name: string; slug: string; schema_name: string }

async function ordersFor(links: Link[]) {
  const bySchema = new Map<string, Link[]>()
  for (const link of links) if (SCHEMA.test(link.schema_name)) bySchema.set(link.schema_name, [...(bySchema.get(link.schema_name) ?? []), link])
  const results = await Promise.all([...bySchema.entries()].map(async ([schema, group]) => inSchema(schema, async (client) => {
    const ids = group.map((link) => Number(link.order_id))
    const tickets = await client.query("SELECT * FROM kitchen_tickets WHERE order_id = ANY($1::bigint[])", [ids])
    const data = (await client.query("SELECT data FROM company_config WHERE id = 1")).rows[0]?.data ?? {}
    const orders: (ServiceOrder | null)[] = []
    for (const id of ids) orders.push(await loadOrder(client, id).catch(() => null))
    return group.map((link, index) => {
      const order = orders[index]
      if (!order) return null
      const own = tickets.rows.filter((row) => Number(row.order_id) === order.id).map(mapTicket)
      return { ref: `${link.restaurant_id}-${order.id}`, restaurant: { name: data.name || link.name, slug: link.slug, phone: data.phone ?? "",
        whatsapp: String(data.socialMedia?.whatsapp ?? "").replace(/\D/g, "") }, ...publicOrder(order, own) }
    })
  })))
  return results.flat().filter((item): item is NonNullable<typeof item> => item !== null)
}

export async function listOrders(accountId: number) {
  const links = (await authDb.query(`SELECT l.restaurant_id, l.order_id, r.name, r.slug, r.schema_name FROM public.customer_order_links l
    JOIN public.restaurants r ON r.id = l.restaurant_id WHERE l.account_id = $1 ORDER BY l.created_at DESC LIMIT 60`, [accountId])).rows as Link[]
  const orders = await ordersFor(links)
  const order = new Map(links.map((link, index) => [`${link.restaurant_id}-${link.order_id}`, index]))
  return orders.sort((a, b) => (order.get(a.ref) ?? 0) - (order.get(b.ref) ?? 0))
}

export async function getOrder(accountId: number, ref: string) {
  const match = ref.match(/^(\d{1,9})-(\d{1,12})$/)
  if (!match) return null
  const links = (await authDb.query(`SELECT l.restaurant_id, l.order_id, r.name, r.slug, r.schema_name FROM public.customer_order_links l
    JOIN public.restaurants r ON r.id = l.restaurant_id WHERE l.account_id = $1 AND l.restaurant_id = $2 AND l.order_id = $3`, [accountId, match[1], match[2]])).rows as Link[]
  if (!links[0]) return null
  const [order] = await ordersFor(links)
  if (!order) return null
  const history = await inSchema(links[0].schema_name, (client) => client.query(`SELECT event, status, note, created_at FROM order_status_history
    WHERE order_id = $1 ORDER BY created_at, id`, [order.id]))
  return { ...order, history: history.rows.map((row) => ({ event: row.event, status: row.status, createdAt: new Date(row.created_at).toISOString() })) }
}
