import "server-only"

import type { PoolClient } from "pg"
import { authDb, schemaQuery } from "./db"
import { logOrderEvent, type OrderActor } from "./service-order-server"
import type { KitchenStatus, ServiceOrderType } from "./service-order-types"
import { notifyOrder, sendPush } from "./web-push"

// Flujo de estados de las comandas y avisos al cliente (push y WhatsApp) con mensajes únicos para todo el sistema.

export class FlowError extends Error {
  status: number
  constructor(message: string, status = 409) { super(message); this.status = status }
}

export const nextTicketStatus = (status: KitchenStatus, type: ServiceOrderType): KitchenStatus | null => {
  if (status === "pending") return "preparing"
  if (status === "preparing") return "ready"
  if (status === "ready") return type === "dineIn" ? "served" : type === "delivery" ? "out_for_delivery" : "delivered"
  if (status === "out_for_delivery") return "delivered"
  return null
}

/** Avanza una comanda al estado indicado si sigue el flujo. Debe llamarse dentro de una transacción. */
export async function advanceTicket(client: PoolClient, ticketId: number, target: KitchenStatus, actor: OrderActor) {
  const result = await client.query(`SELECT t.status, t.order_id, o.order_type, o.status AS order_status FROM kitchen_tickets t
    JOIN service_orders o ON o.id = t.order_id WHERE t.id = $1 FOR UPDATE OF t`, [ticketId])
  const row = result.rows[0]
  if (!row) throw new FlowError("Comanda no encontrada.", 404)
  if (target !== nextTicketStatus(row.status, row.order_type)) throw new FlowError("El cambio de estado no sigue el flujo de esta comanda.")
  await client.query("UPDATE kitchen_tickets SET status = $1, updated_at = NOW() WHERE id = $2", [target, ticketId])
  await logOrderEvent(client, Number(row.order_id), "ticket_status", { status: target, ticketId, actor })
  return { orderId: Number(row.order_id), orderType: row.order_type as ServiceOrderType }
}

export type CustomerEvent = "confirmed" | "preparing" | "ready" | "served" | "out_for_delivery" | "delivered" | "cancelled" | "rejected" | "bill" | "delay" | "missing"

type OrderInfo = { id: number; orderType: ServiceOrderType; tableCode: string | null; source: string; customerPhone: string; deliveryAddress: string; courierName: string }

export function customerMessage(event: CustomerEvent, restaurant: string, order: OrderInfo, extra: { minutes?: number; note?: string } = {}) {
  const n = `#${order.id}`
  const ready = order.orderType === "dineIn" ? "En un momento lo llevamos a tu mesa." : order.orderType === "delivery" ? "Enseguida sale el delivery." : "Ya podés pasar a retirarlo."
  const texts: Record<CustomerEvent, { title: string; body: string }> = {
    confirmed: { title: `Pedido ${n} confirmado`, body: "Recibimos tu pedido y lo enviamos a la cocina." },
    preparing: { title: `Pedido ${n} en preparación`, body: "Tu pedido fue aceptado y la cocina ya lo está preparando." },
    ready: { title: `¡Pedido ${n} listo!`, body: ready },
    served: { title: `¡Buen provecho!`, body: `Tu pedido ${n} ya está en la mesa.` },
    out_for_delivery: { title: `Pedido ${n} en camino`, body: order.courierName ? `${order.courierName} ya salió con tu pedido.` : "El repartidor ya salió con tu pedido." },
    delivered: { title: `Pedido ${n} entregado`, body: "¡Gracias por tu compra! Que lo disfrutes." },
    cancelled: { title: `Pedido ${n} cancelado`, body: extra.note ? `Motivo: ${extra.note}` : "Consultá con el local si tenés dudas." },
    rejected: { title: `No pudimos aceptar el pedido ${n}`, body: extra.note ? `Motivo: ${extra.note}` : "Escribinos y te ayudamos con otra opción." },
    bill: { title: `Tu cuenta ${n} está lista`, body: "En un momento te la acercan." },
    delay: { title: `Tu pedido ${n} se demora un poco`, body: `${extra.minutes ? `Estimamos unos ${extra.minutes} minutos más. ` : ""}${extra.note ?? "Gracias por la paciencia."}`.trim() },
    missing: { title: `Novedad con tu pedido ${n}`, body: extra.note ? `${extra.note} Te vamos a contactar para ofrecerte una alternativa.` : "Falta un producto; te vamos a contactar para ofrecerte una alternativa." },
  }
  const text = texts[event]
  return { title: `${restaurant} · ${text.title}`, body: text.body, plain: `*${restaurant}*\n${text.title}\n${text.body}` }
}

type WhatsAppNotifier = (schema: string, phone: string, text: string, orderId: number) => Promise<void>
declare global { var restoposWhatsAppNotifier: WhatsAppNotifier | undefined }
/** El módulo de WhatsApp se registra acá al iniciar, sin dependencia circular. */
export function registerWhatsAppNotifier(notifier: WhatsAppNotifier) { globalThis.restoposWhatsAppNotifier = notifier }

/**
 * Avisa al cliente un cambio confirmado por el sistema: push (si activó avisos en la mesa) y WhatsApp
 * (si el pedido llegó por WhatsApp). Nunca lanza errores: un aviso fallido no debe frenar la operación.
 */
export async function notifyCustomer(schema: string, orderId: number, event: CustomerEvent, extra: { minutes?: number; note?: string } = {}) {
  try {
    const query = await schemaQuery(schema)
    const row = (await query(`SELECT o.id, o.order_type, o.source, o.customer_phone, o.delivery_address, o.courier_name, o.customer_account_id, t.code AS table_code
      FROM service_orders o LEFT JOIN dining_tables t ON t.id = o.table_id WHERE o.id = $1`, [orderId])).rows[0]
    if (!row) return
    const place = (await authDb.query("SELECT id, name FROM public.restaurants WHERE schema_name = $1", [schema])).rows[0]
    const restaurant = place?.name ?? "RestoPOS"
    const order: OrderInfo = { id: Number(row.id), orderType: row.order_type, tableCode: row.table_code, source: row.source ?? "pos",
      customerPhone: row.customer_phone ?? "", deliveryAddress: row.delivery_address ?? "", courierName: row.courier_name ?? "" }
    const message = customerMessage(event, restaurant, order, extra)
    await notifyOrder(query, orderId, { title: message.title, body: message.body, tag: `order-${orderId}`, url: order.tableCode ? `/table/${order.tableCode}` : undefined })
    // Cliente con cuenta: aviso en todos los teléfonos donde activó los avisos.
    if (row.customer_account_id && place) {
      const url = `/cuenta/pedidos/${place.id}-${orderId}`
      const subs = (await authDb.query("SELECT id, endpoint, p256dh, auth FROM public.customer_push WHERE account_id = $1", [row.customer_account_id])).rows
      for (const sub of subs) {
        const result = await sendPush({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, { title: message.title, body: message.body, tag: `order-${orderId}`, url })
        if (result.gone) await authDb.query("DELETE FROM public.customer_push WHERE id = $1", [sub.id])
      }
    }
    if ((order.source === "whatsapp" || order.source === "web") && order.customerPhone && globalThis.restoposWhatsAppNotifier) {
      await globalThis.restoposWhatsAppNotifier(schema, order.customerPhone, message.plain, orderId)
    }
  } catch (error) {
    console.error("Aviso al cliente falló", error instanceof Error ? error.message : error)
  }
}

/** Evento de comanda → aviso al cliente. */
export const ticketEvent = (status: KitchenStatus): CustomerEvent | null =>
  status === "preparing" || status === "ready" || status === "served" || status === "out_for_delivery" || status === "delivered" || status === "cancelled" ? status : null
