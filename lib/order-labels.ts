import type { OrderEvent } from "./service-order-types"

// Textos de estados e historial de pedidos, compartidos por Órdenes, Cocina y el tablero CRM.

export const typeLabel: Record<string, string> = { dineIn: "En el local", delivery: "Delivery", pickup: "Retiro" }
export const ticketLabel: Record<string, string> = { pending: "Pendiente", preparing: "Preparando", ready: "Listo", served: "Servido", out_for_delivery: "En reparto", delivered: "Entregado", cancelled: "Cancelado" }
export const sourceLabel: Record<string, string> = { pos: "POS", table_qr: "QR de mesa", whatsapp: "WhatsApp", web: "Web" }
export const payLabel: Record<string, string> = { cash: "efectivo", card: "tarjeta", transfer: "transferencia", qr: "QR" }

export const eventLabel = (event: OrderEvent) => ({
  created: `Orden creada${event.note ? ` · ${event.note}` : ""}`,
  items_added: `Productos agregados: ${event.note}`,
  sent_to_kitchen: `Enviada a cocina${event.ticketId ? ` (comanda #${event.ticketId})` : ""}`,
  ticket_status: `Comanda #${event.ticketId}: ${ticketLabel[event.status] ?? event.status}`,
  billed: `Precuenta impresa${event.status && event.status !== "1" ? ` (n.º ${event.status})` : ""}`,
  paid: `Cobrada con ${payLabel[event.status] ?? event.status}${event.note ? ` · ${event.note}` : ""}`,
  cancelled: `Cancelada${event.note ? ` · ${event.note}` : ""}`,
  rejected: `Rechazada${event.note ? ` · ${event.note}` : ""}`,
  confirmed: "Pedido confirmado",
  waiter: `Mesero: ${event.note}`,
  courier: `Repartidor: ${event.note}`,
  details: "Datos actualizados",
  delay: `Demora avisada: ${event.status} min${event.note ? ` · ${event.note}` : ""}`,
  missing: `Falta de producto: ${event.note}`,
  priority: event.status === "high" ? "Marcada como prioridad" : "Prioridad normal",
} as Record<string, string>)[event.event] ?? event.event
