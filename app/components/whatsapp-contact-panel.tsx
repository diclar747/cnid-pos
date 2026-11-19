"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Bike, Bot, Check, ChefHat, ClipboardCopy, Hand, KanbanSquare, MapPin, Phone, ShoppingBag, ShoppingCart, Store, UserRound, UtensilsCrossed, X } from "lucide-react"
import toast from "react-hot-toast"
import { sourceLabel, ticketLabel, typeLabel } from "@/lib/order-labels"
import { STAGE_TONE, type CrmStage } from "@/lib/order-stage"

// Ficha del contacto al costado del chat: datos del cliente, mesa, carrito del asistente y pedidos con su etapa
// (las mismas etiquetas del tablero de Pedidos y de Cocina), con el recorrido completo del pedido en curso.

export type ContactOrder = {
  id: number; stage: CrmStage; stageLabel: string; orderType: "dineIn" | "delivery" | "pickup"; source: string; confirmation: string; status: string
  tableLabel: string; total: number; grandTotal: number; createdAt: string; updatedAt: string; customerName: string; waiterName: string; courierName: string
  deliveryAddress: string; items: { name: string; quantity: number; ticketId: number | null }[]
  tickets: { id: number; status: string; delayMinutes: number | null }[]
}
export type ContactProfile = {
  customer: { id: number; name: string; phone: string; ruc: string; email: string; address: string; notes: string; ordersCount: number; totalSpent: number; lastOrderAt: string | null; since: string } | null
  account: { name: string; guest: boolean; since: string } | null
  tables: string[]
  activeOrders: number
  stats: { orders: number; paid: number; spent: number }
  cart: { items: number; orderType: string; address: string; location: { lat: number; lng: number } | null }
  orders: ContactOrder[]
}

const money = (value: number) => `Gs ${value.toLocaleString("es-PY")}`
const date = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"
const ago = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return "recién"
  if (minutes < 60) return `hace ${minutes} min`
  if (minutes < 60 * 24) return `hace ${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim()
  return new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}
const TypeIcon = ({ type, className = "h-3.5 w-3.5" }: { type: string; className?: string }) =>
  type === "delivery" ? <Bike className={className} /> : type === "pickup" ? <ShoppingBag className={className} /> : <UtensilsCrossed className={className} />
const isActive = (order: ContactOrder) => order.status === "open" ? order.stage !== "cancelled" : order.stage !== "done" && order.stage !== "cancelled"

/** Recorrido del pedido con todas sus etapas; la actual resaltada. */
function StageTrack({ order }: { order: ContactOrder }) {
  const steps: { id: CrmStage; label: string }[] = [
    { id: "new", label: "Nuevo" }, { id: "confirmed", label: "Confirmado" }, { id: "kitchen", label: "En cocina" }, { id: "ready", label: "Listo" },
    ...(order.orderType === "delivery" ? [{ id: "delivery" as CrmStage, label: "En delivery" }] : []),
    { id: "done", label: order.orderType === "dineIn" ? "Servido" : order.orderType === "pickup" ? "Retirado" : "Entregado" },
  ]
  if (order.stage === "cancelled") return <p className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">Pedido cancelado o rechazado</p>
  // «Pendiente» = consumos sin enviar a cocina: se muestra entre Nuevo y Confirmado.
  const index = order.stage === "pending" ? 0.5 : steps.findIndex((step) => step.id === order.stage)
  return <ol className="flex items-start gap-0.5">{steps.map((step, i) => {
    const done = i < index, current = i === index
    return <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <span className={`flex h-5 w-full items-center ${i === 0 ? "pl-[calc(50%-0.625rem)]" : ""} ${i === steps.length - 1 ? "pr-[calc(50%-0.625rem)]" : ""}`}>
        <span className={`h-0.5 flex-1 ${i === 0 ? "hidden" : done || current ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-emerald-500 text-white" : current ? `ring-2 ring-offset-1 ring-emerald-500 ${STAGE_TONE[step.id]}` : "bg-slate-200 text-slate-500 dark:bg-slate-700"}`}>
          {done ? <Check className="h-3 w-3" /> : i + 1}</span>
        <span className={`h-0.5 flex-1 ${i === steps.length - 1 ? "hidden" : done ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />
      </span>
      <span className={`w-full truncate text-[10px] leading-tight ${current ? "font-bold text-slate-900 dark:text-white" : "text-muted-foreground"}`}>{step.label}</span>
    </li>
  })}</ol>
}

function OrderCard({ order }: { order: ContactOrder }) {
  const drafts = order.items.filter((line) => line.ticketId == null).length
  return <article className={`space-y-2 rounded-xl border p-3 ${isActive(order) ? "bg-white shadow-sm dark:bg-slate-900" : "bg-slate-50/70 dark:bg-slate-900/40"}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-bold">#{order.id}
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"><TypeIcon type={order.orderType} />{typeLabel[order.orderType]}{order.orderType === "dineIn" && order.tableLabel ? ` · ${order.tableLabel}` : ""}</span></p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sourceLabel[order.source] ?? order.source} · {ago(order.createdAt)}{order.waiterName ? ` · mozo ${order.waiterName}` : ""}{order.courierName ? ` · ${order.courierName}` : ""}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STAGE_TONE[order.stage]}`}>{order.stageLabel}</span>
    </div>
    {isActive(order) && <StageTrack order={order} />}
    <ul className="space-y-0.5 text-xs">{order.items.slice(0, 5).map((line, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{line.quantity}× {line.name}</span>
      {line.ticketId == null && order.status === "open" && <span className="shrink-0 text-[10px] text-amber-700">sin enviar</span>}</li>)}
      {order.items.length > 5 && <li className="text-muted-foreground">y {order.items.length - 5} más…</li>}
      {!order.items.length && <li className="text-muted-foreground">Sin productos todavía</li>}</ul>
    {order.tickets.length > 0 && <div className="flex flex-wrap gap-1">{order.tickets.map((ticket) => <span key={ticket.id} className="inline-flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
      <ChefHat className="h-3 w-3" />Comanda #{ticket.id} · {ticketLabel[ticket.status] ?? ticket.status}{ticket.delayMinutes ? ` · demora ${ticket.delayMinutes} min` : ""}</span>)}
      {drafts > 0 && order.status === "open" && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{drafts} sin enviar a cocina</span>}</div>}
    {order.orderType === "delivery" && order.deliveryAddress && <p className="flex items-start gap-1 text-[11px] text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{order.deliveryAddress}</p>}
    <div className="flex items-center justify-between border-t pt-2 text-xs">
      <span className="font-bold">{money(order.grandTotal)}{order.status === "paid" && <span className="ml-1 font-normal text-emerald-700">· cobrado</span>}</span>
      <Link href={`/crm?q=${order.id}`} className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline dark:text-indigo-300"><KanbanSquare className="h-3.5 w-3.5" />Ver en Pedidos</Link>
    </div>
  </article>
}

export function ContactPanel({ name, phone, phoneLabel, avatar, botEnabled, handoffRequested, assignedName, profile, onClose }: {
  name: string; phone: string; phoneLabel?: string; avatar: React.ReactNode; botEnabled: boolean; handoffRequested: boolean; assignedName: string; profile: ContactProfile | null; onClose: () => void
}) {
  const [filter, setFilter] = useState<"active" | "all">("active")
  const orders = useMemo(() => profile?.orders ?? [], [profile?.orders])
  const active = orders.filter(isActive)
  const shown = filter === "active" ? active : orders
  const digits = phone.replace(/\D/g, "")
  const customer = profile?.customer
  const copy = () => { void navigator.clipboard?.writeText(`+${digits}`).then(() => toast.success("Número copiado"), () => toast.error("No se pudo copiar")) }
  const assistant = handoffRequested ? { text: "Pidió hablar con una persona", tone: "bg-red-100 text-red-700", icon: Hand }
    : botEnabled ? { text: "Responde el asistente", tone: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200", icon: Bot }
    : { text: assignedName ? `Atiende ${assignedName}` : "Asistente pausado", tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: UserRound }

  return <aside className="flex h-full min-h-0 w-full flex-col border-l bg-[#f7f8fa] dark:bg-slate-950" aria-label="Ficha del cliente">
    <div className="flex items-center justify-between border-b bg-white px-4 py-2.5 dark:bg-slate-900">
      <p className="font-bold">Ficha del cliente</p>
      <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar la ficha"><X className="h-4 w-4" /></button>
    </div>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <section className="flex flex-col items-center gap-2 text-center">
        {avatar}
        <div><p className="text-lg font-bold leading-tight">{customer?.name || name || "Contacto"}</p>
          {customer?.name && name && customer.name !== name && <p className="text-xs text-muted-foreground">En WhatsApp: {name}</p>}
          <p className="text-sm text-muted-foreground">{digits ? phoneLabel || `+${digits}` : "número oculto"}</p></div>
        {digits && <div className="flex gap-2">
          <a href={`tel:+${digits}`} className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-50 dark:bg-slate-900"><Phone className="h-3.5 w-3.5" />Llamar</a>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-50 dark:bg-slate-900"><ClipboardCopy className="h-3.5 w-3.5" />Copiar</button>
          <Link href={`/admin/customers?q=${digits.slice(-9)}`} className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-50 dark:bg-slate-900"><UserRound className="h-3.5 w-3.5" />Cliente</Link>
        </div>}
        <div className="flex flex-wrap justify-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${assistant.tone}`}><assistant.icon className="h-3 w-3" />{assistant.text}</span>
          {profile?.tables.map((table) => <span key={table} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><UtensilsCrossed className="h-3 w-3" />En {table}</span>)}
          {profile?.account && <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200"><Store className="h-3 w-3" />{profile.account.guest ? "Cliente invitado (QR)" : "Tiene cuenta RestoPOS"}</span>}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 text-center">
        {[["En curso", String(profile?.activeOrders ?? 0)], ["Pedidos", String(customer?.ordersCount ?? profile?.stats.orders ?? 0)], ["Gastado", money(customer?.totalSpent ?? profile?.stats.spent ?? 0)]].map(([label, value]) =>
          <div key={label} className="rounded-xl border bg-white p-2 dark:bg-slate-900"><p className="truncate text-sm font-bold">{value}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p></div>)}
      </section>

      {customer ? <section className="space-y-1.5 rounded-xl border bg-white p-3 text-xs dark:bg-slate-900">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Datos del cliente</p>
        {[["RUC", customer.ruc], ["Correo", customer.email], ["Dirección", customer.address], ["Notas", customer.notes], ["Cliente desde", date(customer.since)], ["Último pedido", date(customer.lastOrderAt)]]
          .filter(([, value]) => value).map(([label, value]) => <p key={label} className="flex justify-between gap-3"><span className="shrink-0 text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></p>)}
      </section> : <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">Todavía no está en Clientes: se registra solo con su primer pedido.</p>}

      {profile && (profile.cart.items > 0 || profile.cart.location) && <section className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="flex items-center gap-1 font-semibold"><ShoppingCart className="h-3.5 w-3.5" />Armando pedido con el asistente</p>
        {profile.cart.items > 0 && <p>{profile.cart.items} producto(s){profile.cart.orderType ? ` · ${typeLabel[profile.cart.orderType] ?? profile.cart.orderType}` : ""}</p>}
        {profile.cart.address && <p>{profile.cart.address}</p>}
        {profile.cart.location && <a href={`https://maps.google.com/?q=${profile.cart.location.lat},${profile.cart.location.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline"><MapPin className="h-3 w-3" />Ubicación compartida</a>}
      </section>}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pedidos</p>
          <div className="flex rounded-full border bg-white p-0.5 text-[11px] dark:bg-slate-900">
            {([["active", `En curso (${active.length})`], ["all", `Todos (${orders.length})`]] as const).map(([value, label]) =>
              <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-2 py-0.5 font-semibold ${filter === value ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-muted-foreground"}`}>{label}</button>)}
          </div>
        </div>
        {!profile ? <p className="text-center text-xs text-muted-foreground">Cargando…</p>
          : shown.length ? shown.map((order) => <OrderCard key={order.id} order={order} />)
          : <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">{filter === "active" ? "No tiene pedidos en curso." : "Todavía no hizo pedidos."}</p>}
      </section>
    </div>
  </aside>
}
