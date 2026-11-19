import type { KitchenStatus, KitchenTicket } from "./service-order-types"

// Tablero de cocina editable: columnas predeterminadas (una por estado) y columnas propias del restaurante.
// Cada columna se apoya en un estado real; mover una comanda a una columna cambia su estado a ese.

export type BoardStatus = "pending" | "preparing" | "ready" | "out_for_delivery" | "done"
export type BoardColumn = { id: string; title: string; subtitle: string; color: string; status: BoardStatus; builtIn: boolean; hidden?: boolean }

export const BOARD_COLORS: Record<string, string> = {
  amber: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
  blue: "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30",
  emerald: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
  violet: "border-violet-300 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30",
  slate: "border-slate-300 bg-slate-100 dark:border-slate-800 dark:bg-slate-900",
  rose: "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
  orange: "border-orange-300 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30",
  cyan: "border-cyan-300 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950/30",
}
export const BOARD_DOTS: Record<string, string> = {
  amber: "bg-amber-500", blue: "bg-blue-500", emerald: "bg-emerald-500", violet: "bg-violet-500", slate: "bg-slate-500", rose: "bg-rose-500", orange: "bg-orange-500", cyan: "bg-cyan-500",
}
export const STATUS_LABEL: Record<BoardStatus, string> = {
  pending: "Pendiente", preparing: "Preparando", ready: "Listo", out_for_delivery: "En reparto", done: "Entregado / servido",
}

export const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: "pending", title: "Pendiente", subtitle: "Esperando preparación", color: "amber", status: "pending", builtIn: true },
  { id: "preparing", title: "Preparando", subtitle: "En cocina", color: "blue", status: "preparing", builtIn: true },
  { id: "ready", title: "Listo", subtitle: "Para servir o despachar", color: "emerald", status: "ready", builtIn: true },
  { id: "out_for_delivery", title: "En reparto", subtitle: "Camino al cliente", color: "violet", status: "out_for_delivery", builtIn: true },
  { id: "done", title: "Entregado", subtitle: "Servido o recibido", color: "slate", status: "done", builtIn: true },
]

/** Columnas guardadas por el restaurante; siempre están las cinco predeterminadas (se pueden ocultar). */
export function boardColumns(saved: unknown): BoardColumn[] {
  const list = Array.isArray((saved as { columns?: unknown })?.columns) ? (saved as { columns: any[] }).columns : []
  const valid = list.filter((column) => column && typeof column.id === "string" && typeof column.title === "string" && column.status in STATUS_LABEL)
    .map((column): BoardColumn => ({ id: String(column.id).slice(0, 40), title: String(column.title).slice(0, 40), subtitle: String(column.subtitle ?? "").slice(0, 60),
      color: column.color in BOARD_COLORS ? column.color : "slate", status: column.status, builtIn: DEFAULT_COLUMNS.some((d) => d.id === column.id), hidden: Boolean(column.hidden) }))
  const missing = DEFAULT_COLUMNS.filter((column) => !valid.some((entry) => entry.id === column.id))
  return valid.length ? [...valid, ...missing] : DEFAULT_COLUMNS
}

const baseOf = (status: KitchenStatus): BoardStatus => status === "served" || status === "delivered" ? "done" : status === "cancelled" ? "done" : status

/** Columna donde se muestra la comanda: la propia si está en una, si no la primera visible de su estado. */
export function columnOf(ticket: KitchenTicket, columns: BoardColumn[]) {
  const visible = columns.filter((column) => !column.hidden)
  const base = baseOf(ticket.status)
  return visible.find((column) => column.id === ticket.boardColumn && column.status === base)
    ?? visible.find((column) => column.builtIn && column.status === base)
    ?? visible.find((column) => column.status === base) ?? null
}

/** Estado real al soltar una comanda en una columna (null si no aplica a ese tipo de pedido). */
export function targetStatus(column: BoardColumn, ticket: KitchenTicket): KitchenStatus | null {
  if (column.status === "done") return ticket.orderType === "dineIn" ? "served" : "delivered"
  if (column.status === "out_for_delivery" && ticket.orderType !== "delivery") return null
  return column.status
}
