import { Bike, Check, ChefHat, CircleCheckBig, Clock3, PackageCheck, XCircle } from "lucide-react"

// Recorrido del pedido para el cliente: de «Recibido» a «Entregado».

export type Stage = "new" | "pending" | "confirmed" | "kitchen" | "ready" | "delivery" | "done" | "cancelled"
export type CustomerOrder = {
  ref: string; id: number; stage: Stage; stageLabel: string; orderType: "dineIn" | "delivery" | "pickup"; source: string; tableLabel: string
  status: string; createdAt: string; updatedAt: string; total: number; deliveryFee: number; grandTotal: number
  deliveryAddress: string; deliveryZoneName: string; courierName: string; notes: string
  items: { name: string; quantity: number; subtotal: number; modifiers: string[] }[]
  restaurant: { name: string; slug: string; phone: string; whatsapp: string }
  history?: { event: string; status: string; createdAt: string }[]
}

export const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
export const isActive = (order: CustomerOrder) => !["done", "cancelled"].includes(order.stage)

export function steps(order: CustomerOrder) {
  const last = order.orderType === "delivery" ? { key: "delivery", label: "En camino", icon: Bike } : null
  return [
    { key: "new", label: "Recibido", icon: Clock3 },
    { key: "confirmed", label: "Confirmado", icon: CircleCheckBig },
    { key: "kitchen", label: "En cocina", icon: ChefHat },
    { key: "ready", label: order.orderType === "dineIn" ? "Listo para servir" : order.orderType === "pickup" ? "Listo para retirar" : "Listo", icon: PackageCheck },
    ...(last ? [last] : []),
    { key: "done", label: order.orderType === "dineIn" ? "Servido" : "Entregado", icon: Check },
  ]
}

export function stepIndex(order: CustomerOrder) {
  const list = steps(order).map((step) => step.key)
  const key = order.stage === "pending" ? "confirmed" : order.stage
  const index = list.indexOf(key)
  return index < 0 ? 0 : index
}

export const stageTone: Record<Stage, string> = {
  new: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200", pending: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  confirmed: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200", kitchen: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200", delivery: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  done: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", cancelled: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
}

export function ProgressBar({ order }: { order: CustomerOrder }) {
  if (order.stage === "cancelled") return <p className="flex items-center gap-1.5 text-sm font-medium text-red-600"><XCircle className="h-4 w-4" /> Pedido cancelado</p>
  const list = steps(order), current = stepIndex(order)
  return <div className="flex gap-1">{list.map((step, index) => <span key={step.key} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= current ? "bg-gradient-to-r from-indigo-500 to-violet-500" : "bg-slate-200 dark:bg-slate-700"}`} />)}</div>
}

export function Timeline({ order }: { order: CustomerOrder }) {
  if (order.stage === "cancelled") return <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300"><XCircle className="h-6 w-6" /><p className="font-semibold">El pedido fue cancelado. Escribí al restaurante si tenés dudas.</p></div>
  const list = steps(order), current = stepIndex(order)
  return <ol className="space-y-0">
    {list.map((step, index) => {
      const Icon = step.icon, done = index < current, now = index === current
      return <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
        {index < list.length - 1 && <span className={`absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 ${index < current ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`} />}
        <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${now ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30" : done ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
          {now && <span className="absolute inset-0 animate-ping rounded-full bg-indigo-500/30" />}<Icon className="relative h-5 w-5" /></span>
        <div className="pt-2"><p className={`font-semibold ${now ? "" : done ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}>{step.label}</p>
          {now && <p className="text-sm text-slate-500">{order.stage === "new" ? "El restaurante está revisando tu pedido." : order.stage === "kitchen" ? "Lo están preparando." : order.stage === "delivery" ? `Va en camino${order.courierName ? ` con ${order.courierName}` : ""}.` : order.stage === "ready" ? "¡Ya está listo!" : order.stage === "done" ? "¡Que lo disfrutes!" : "Pronto pasa a cocina."}</p>}</div>
      </li>
    })}
  </ol>
}
