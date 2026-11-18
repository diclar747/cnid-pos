import type { KitchenTicket, ServiceOrder } from "./service-order-types"

// Etapa de un pedido según sus estados reales (confirmación, consumos sin enviar y la comanda más atrasada).
// La usan el tablero de Pedidos y el seguimiento del cliente.

export type CrmStage = "new" | "pending" | "confirmed" | "kitchen" | "ready" | "delivery" | "done" | "cancelled"
const RANK: Record<string, number> = { pending: 0, preparing: 1, ready: 2, out_for_delivery: 3, served: 4, delivered: 4 }
const BY_RANK: CrmStage[] = ["confirmed", "kitchen", "ready", "delivery", "done"]

export function stageOf(order: ServiceOrder, tickets: KitchenTicket[]): CrmStage {
  if (order.status === "cancelled" || order.confirmation === "rejected") return "cancelled"
  if (order.status === "open" && order.confirmation === "pending") return "new"
  const active = tickets.filter((ticket) => ticket.status !== "cancelled")
  const drafts = order.items.some((line) => line.ticketId == null)
  if (!active.length) return order.status === "paid" ? "done" : "pending"
  const rank = Math.min(...active.map((ticket) => RANK[ticket.status] ?? 0))
  if (rank === 4 && drafts && order.status === "open") return "pending"
  return BY_RANK[rank]
}
