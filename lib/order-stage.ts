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

/** Nombre de la etapa para el personal (mismas columnas que el tablero de Pedidos). En el local, «done» es «Servido». */
export function staffStageLabel(stage: CrmStage, orderType?: string): string {
  if (stage === "done") return orderType === "dineIn" ? "Servido" : orderType === "pickup" ? "Retirado" : "Entregado"
  return ({ new: "Nuevo · por confirmar", pending: "Pendiente", confirmed: "Confirmado", kitchen: "En cocina", ready: "Listo",
    delivery: "En delivery", cancelled: "Cancelado" } as Record<string, string>)[stage] ?? stage
}

/** Colores de la etiqueta de cada etapa (los del tablero de Pedidos). */
export const STAGE_TONE: Record<CrmStage, string> = {
  new: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  confirmed: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  kitchen: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  delivery: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  done: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
}
