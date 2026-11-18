"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, ArrowRight, Bike, CheckCircle2, ChefHat, Clock3, CreditCard, Flame, History, KanbanSquare, MapPin, MessageCircle,
  Phone, Printer, QrCode, Radio, RefreshCw, Search, ShoppingBag, Store, UtensilsCrossed, XCircle } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ProtectedRoute from "../components/protected-route"
import PaymentDialog, { type PaymentTarget } from "../components/payment-dialog"
import { StaffPushButton } from "../components/table-calls-listener"
import { apiRequest } from "@/lib/api-client"
import { useLiveTables } from "@/lib/use-live"
import { eventLabel, sourceLabel, ticketLabel, typeLabel } from "@/lib/order-labels"
import type { Courier, KitchenTicket, OrderEvent, ServiceOrder, StaffMember } from "@/lib/service-order-types"
import { useAuth } from "../context/auth-context"

type Stage = "new" | "pending" | "confirmed" | "kitchen" | "ready" | "delivery" | "done" | "cancelled"
type Item = { order: ServiceOrder; tickets: KitchenTicket[]; stage: Stage; minutes: number }

const COLUMNS: { id: Stage; title: string; hint: string; tone: string; dot: string }[] = [
  { id: "new", title: "Nuevos", hint: "Esperan confirmación", tone: "border-fuchsia-200 bg-fuchsia-50/60 dark:border-fuchsia-900 dark:bg-fuchsia-950/20", dot: "bg-fuchsia-500" },
  { id: "pending", title: "Pendientes", hint: "Con consumos sin enviar", tone: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20", dot: "bg-amber-500" },
  { id: "confirmed", title: "Confirmados", hint: "Enviados a cocina", tone: "border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/20", dot: "bg-sky-500" },
  { id: "kitchen", title: "En cocina", hint: "En preparación", tone: "border-orange-200 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/20", dot: "bg-orange-500" },
  { id: "ready", title: "Listos", hint: "Para servir, retirar o enviar", tone: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20", dot: "bg-emerald-500" },
  { id: "delivery", title: "En delivery", hint: "El repartidor lo lleva", tone: "border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/20", dot: "bg-violet-500" },
  { id: "done", title: "Entregados", hint: "Servidos o entregados", tone: "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40", dot: "bg-slate-500" },
  { id: "cancelled", title: "Cancelados", hint: "Cancelados o rechazados", tone: "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20", dot: "bg-red-500" },
]
const money = (value: number) => `Gs ${value.toLocaleString("es-PY")}`
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })
const localToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion" }).format(new Date())

/** Siguiente columna permitida para un pedido (la que dispara el botón «Avanzar»). */
function nextStage(item: Item): Stage | null {
  const { stage, order } = item
  if (order.status !== "open" && stage !== "kitchen" && stage !== "ready" && stage !== "delivery" && stage !== "confirmed") return null
  if (stage === "new" || stage === "pending") return "confirmed"
  if (stage === "confirmed") return "kitchen"
  if (stage === "kitchen") return "ready"
  if (stage === "ready") return order.orderType === "delivery" ? "delivery" : "done"
  if (stage === "delivery") return "done"
  return null
}
const advanceLabel: Record<string, string> = { confirmed: "Confirmar y enviar", kitchen: "Aceptar en cocina", ready: "Marcar listo", delivery: "Salió el delivery", done: "Entregado" }

export default function CrmPage() {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const canManage = hasPermission("manage_sales")
  const [payTarget, setPayTarget] = useState<PaymentTarget | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [date, setDate] = useState(localToday)
  const [search, setSearch] = useState("")
  const [source, setSource] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState<Item | null>(null)
  const [reason, setReason] = useState("")

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ date })
      if (search.trim()) params.set("q", search.trim())
      if (source) params.set("source", source)
      const result = await apiRequest<{ items: Item[] }>(`/api/crm?${params}`)
      setItems(result.items)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cargar el tablero") }
    finally { setLoading(false) }
  }, [date, search, source])
  useEffect(() => { const timer = window.setTimeout(() => void load(), search ? 300 : 0); return () => window.clearTimeout(timer) }, [load, search])
  const live = useLiveTables(["service_orders", "kitchen_tickets"], () => void load())

  const columns = useMemo(() => COLUMNS.map((column) => ({ ...column, items: items.filter((item) => item.stage === column.id)
    .sort((a, b) => Number(b.tickets.some((ticket) => ticket.priority === "high")) - Number(a.tickets.some((ticket) => ticket.priority === "high")) || a.order.id - b.order.id) })), [items])
  const current = items.find((item) => item.order.id === selected) ?? null

  /** Ejecuta el cambio de columna con las mismas reglas que Órdenes y Cocina (el servidor valida cada paso). */
  const move = async (item: Item, to: Stage) => {
    if (to === "cancelled") { setCancelling(item); setReason(""); return }
    if (to !== nextStage(item)) { toast.error("Ese pedido no puede pasar a esa columna todavía."); return }
    setBusy(item.order.id)
    try {
      if (item.stage === "new") await apiRequest(`/api/service-orders/${item.order.id}`, { method: "PATCH", body: JSON.stringify({ action: "confirm", sendToKitchen: true }) })
      else if (item.stage === "pending") await apiRequest(`/api/service-orders/${item.order.id}`, { method: "PATCH", body: JSON.stringify({ action: "send" }) })
      else {
        const from = item.stage === "confirmed" ? "pending" : item.stage === "kitchen" ? "preparing" : item.stage === "ready" ? "ready" : "out_for_delivery"
        const target = from === "pending" ? "preparing" : from === "preparing" ? "ready" : from === "ready"
          ? item.order.orderType === "dineIn" ? "served" : item.order.orderType === "delivery" ? "out_for_delivery" : "delivered" : "delivered"
        for (const ticket of item.tickets.filter((entry) => entry.status === from)) {
          await apiRequest(`/api/kitchen-tickets/${ticket.id}`, { method: "PATCH", body: JSON.stringify({ status: target }) })
        }
      }
      toast.success(`Pedido #${item.order.id}: ${COLUMNS.find((column) => column.id === to)?.title}`)
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo mover el pedido") }
    finally { setBusy(null) }
  }
  const cancel = async () => {
    if (!cancelling) return
    setBusy(cancelling.order.id)
    try {
      await apiRequest(`/api/service-orders/${cancelling.order.id}`, { method: "PATCH", body: JSON.stringify({ action: cancelling.order.confirmation === "pending" ? "reject" : "cancel", reason }) })
      toast.success(`Pedido #${cancelling.order.id} cancelado`)
      setCancelling(null); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cancelar") }
    finally { setBusy(null) }
  }

  const totals = { open: items.filter((item) => !["done", "cancelled"].includes(item.stage)).length, kitchen: columns.find((c) => c.id === "kitchen")?.items.length ?? 0,
    delivery: columns.find((c) => c.id === "delivery")?.items.length ?? 0, sales: items.filter((item) => item.order.status === "paid").reduce((sum, item) => sum + item.order.grandTotal, 0) }

  return <ProtectedRoute requiredPermissions={["access_pos"]}>
    <main className="flex h-full min-h-[36rem] flex-col bg-slate-100/70 dark:bg-slate-950">
      <header className="border-b bg-white px-4 py-3 dark:bg-slate-900 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><KanbanSquare className="h-6 w-6 text-indigo-600" /> Pedidos en vivo</h1>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Radio className={`h-3.5 w-3.5 ${live ? "text-emerald-500" : "text-slate-400"}`} />
                {live ? "Conectado en tiempo real" : "Actualizando cada 15 s"} · arrastrá una tarjeta o usá «Avanzar»</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="N.º, cliente, teléfono o mesa" className="h-9 w-56 pl-9" /></div>
            <select value={source} onChange={(event) => setSource(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Origen">
              <option value="">Todos los orígenes</option><option value="pos">POS</option><option value="table_qr">QR de mesa</option><option value="whatsapp">WhatsApp</option><option value="web">Web</option>
            </select>
            <Input type="date" value={date} max={localToday()} onChange={(event) => setDate(event.target.value || localToday())} className="h-9 w-auto" aria-label="Fecha" />
            <StaffPushButton />
            <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Actualizar"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="Pedidos activos" value={String(totals.open)} tone="text-indigo-700" />
          <Kpi label="En cocina" value={String(totals.kitchen)} tone="text-orange-600" />
          <Kpi label="En delivery" value={String(totals.delivery)} tone="text-violet-700" />
          <Kpi label="Cobrado en el día" value={money(totals.sales)} tone="text-emerald-700" />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-x-auto p-3 sm:p-4">
        <div className="flex h-full gap-3">
          {columns.map((column) => <section key={column.id} aria-label={column.title}
            onDragOver={(event) => { if (dragging !== null) event.preventDefault() }}
            onDrop={(event) => { event.preventDefault(); const item = items.find((entry) => entry.order.id === dragging); setDragging(null); if (item && item.stage !== column.id) void move(item, column.id) }}
            className={`flex h-full w-72 shrink-0 flex-col rounded-2xl border ${column.tone} ${dragging !== null ? "ring-1 ring-indigo-200" : ""}`}>
            <div className="flex items-center justify-between px-3 pb-2 pt-3">
              <div><h2 className="flex items-center gap-2 text-sm font-bold"><span className={`h-2 w-2 rounded-full ${column.dot}`} />{column.title}</h2><p className="text-[11px] text-muted-foreground">{column.hint}</p></div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold shadow-sm dark:bg-slate-800">{column.items.length}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-3">
              {column.items.map((item) => <OrderCard key={item.order.id} item={item} busy={busy === item.order.id} canManage={canManage}
                onOpen={() => setSelected(item.order.id)} onAdvance={() => { const to = nextStage(item); if (to) void move(item, to) }}
                onDragStart={() => setDragging(item.order.id)} onDragEnd={() => setDragging(null)} />)}
              {!column.items.length && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Sin pedidos</p>}
            </div>
          </section>)}
        </div>
      </div>

      <PaymentDialog target={payTarget} onClose={() => setPayTarget(null)} onPaid={() => void load()} />
      {current && <OrderDetail item={current} canManage={canManage} onClose={() => setSelected(null)} onChanged={() => void load()}
        onCharge={() => { setSelected(null); setPayTarget({ kind: "order", orderId: current.order.id }) }}
        onAdvance={() => { const to = nextStage(current); if (to) void move(current, to) }} onCancel={() => { setCancelling(current); setReason("") }} />}

      <Dialog open={cancelling !== null} onOpenChange={(open) => { if (!open) setCancelling(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{cancelling?.order.confirmation === "pending" ? "Rechazar" : "Cancelar"} pedido #{cancelling?.order.id}</DialogTitle>
            <DialogDescription>Se devuelve el stock reservado y, si el cliente pidió por QR o WhatsApp, recibe el aviso con el motivo.</DialogDescription></DialogHeader>
          {!canManage ? <p className="text-sm text-red-700">Solo caja o la administración pueden cancelar pedidos.</p> : <>
            <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo (ej.: sin stock, fuera de zona)" maxLength={200} />
            <Button variant="destructive" disabled={busy !== null} onClick={() => void cancel()}><XCircle className="mr-2 h-4 w-4" /> Confirmar cancelación</Button></>}
        </DialogContent>
      </Dialog>
    </main>
  </ProtectedRoute>
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="rounded-xl border bg-slate-50 px-3 py-2 dark:bg-slate-800/60"><p className="text-[11px] text-muted-foreground">{label}</p><strong className={`text-lg ${tone}`}>{value}</strong></div>
}

function SourceBadge({ source }: { source: string }) {
  const Icon = source === "whatsapp" ? MessageCircle : source === "table_qr" ? QrCode : Store
  const tone = source === "whatsapp" ? "bg-green-100 text-green-800" : source === "table_qr" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700"
  return <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}><Icon className="h-3 w-3" />{sourceLabel[source] ?? source}</span>
}

function OrderCard({ item, busy, canManage, onOpen, onAdvance, onDragStart, onDragEnd }: { item: Item; busy: boolean; canManage: boolean; onOpen: () => void; onAdvance: () => void
  onDragStart: () => void; onDragEnd: () => void }) {
  const { order, tickets, minutes } = item
  const next = nextStage(item)
  const priority = tickets.some((ticket) => ticket.priority === "high")
  const delay = tickets.find((ticket) => ticket.delayMinutes)?.delayMinutes
  const late = !["done", "cancelled"].includes(item.stage) && minutes >= 30
  const TypeIcon = order.orderType === "delivery" ? Bike : order.orderType === "pickup" ? ShoppingBag : UtensilsCrossed
  return <article draggable={item.stage !== "done" && item.stage !== "cancelled"} onDragStart={onDragStart} onDragEnd={onDragEnd}
    className={`cursor-grab rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing dark:bg-slate-900 ${priority ? "border-red-300 ring-1 ring-red-200" : ""}`}>
    <button type="button" onClick={onOpen} className="block w-full text-left">
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-base font-extrabold">#{order.id}</p><p className="flex items-center gap-1 text-[11px] text-muted-foreground"><TypeIcon className="h-3 w-3" />{typeLabel[order.orderType]} · {hhmm(order.createdAt)}</p></div>
        <div className="flex flex-col items-end gap-1"><SourceBadge source={order.source} />
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${late ? "text-red-600" : "text-muted-foreground"}`}><Clock3 className="h-3 w-3" />{minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`}</span></div>
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{order.tableLabel || order.customerName || "Sin nombre"}</p>
      {order.orderType === "delivery" && order.deliveryAddress && <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{order.deliveryAddress}</p>}
      <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
        {order.items.slice(0, 3).map((line) => <li key={line.lineId} className="truncate">{line.quantity} × {line.productName}</li>)}
        {order.items.length > 3 && <li className="text-muted-foreground">+ {order.items.length - 3} más</li>}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1">
        {priority && <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700"><Flame className="h-3 w-3" />Prioridad</span>}
        {delay && <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"><AlertTriangle className="h-3 w-3" />+{delay} min</span>}
        {order.waiterName && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">{order.waiterName}</span>}
        {order.courierName && <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-800">{order.courierName}</span>}
        {order.status === "paid" && <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">Cobrado</span>}
        {order.status === "open" && item.stage === "done" && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Por cobrar</span>}
      </div>
    </button>
    <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
      <strong className="text-sm">{money(order.grandTotal)}</strong>
      {next && (next !== "confirmed" || canManage || item.stage === "pending") && <Button size="sm" disabled={busy} onClick={onAdvance} className="h-7 gap-1 px-2 text-xs">
        {busy ? "…" : advanceLabel[next]}<ArrowRight className="h-3 w-3" /></Button>}
    </div>
  </article>
}

function OrderDetail({ item, canManage, onClose, onChanged, onAdvance, onCancel, onCharge }: { item: Item; canManage: boolean; onClose: () => void; onChanged: () => void
  onAdvance: () => void; onCancel: () => void; onCharge: () => void }) {
  const { order, tickets } = item
  const [history, setHistory] = useState<OrderEvent[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [notes, setNotes] = useState(order.notes)
  const [delay, setDelay] = useState("10")
  const [missing, setMissing] = useState("")
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    void apiRequest<{ items: OrderEvent[] }>(`/api/service-orders/${order.id}/history`).then((result) => setHistory(result.items)).catch(() => undefined)
  }, [order.id, order.updatedAt, tickets.map((ticket) => ticket.status).join()])
  useEffect(() => {
    void apiRequest<{ staff: StaffMember[] }>("/api/staff").then((result) => setStaff(result.staff)).catch(() => undefined)
    if (order.orderType === "delivery") void apiRequest<{ items: Courier[] }>("/api/delivery/couriers").then((result) => setCouriers(result.items.filter((courier) => courier.isActive))).catch(() => undefined)
  }, [order.orderType])
  useEffect(() => setNotes(order.notes), [order.notes])
  const save = async (changes: Record<string, unknown>, done = "Guardado") => {
    setSaving(true)
    try { await apiRequest(`/api/service-orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ action: "details", ...changes }) }); toast.success(done); onChanged() }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar") }
    finally { setSaving(false) }
  }
  const notice = async (body: Record<string, unknown>, done: string) => {
    const ticket = tickets.find((entry) => !["served", "delivered", "cancelled"].includes(entry.status))
    if (!ticket) { toast.error("No hay comandas en curso."); return }
    setSaving(true)
    try { await apiRequest(`/api/kitchen-tickets/${ticket.id}`, { method: "POST", body: JSON.stringify(body) }); toast.success(done); onChanged() }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo avisar") }
    finally { setSaving(false) }
  }
  const next = nextStage(item)
  const active = tickets.some((ticket) => !["served", "delivered", "cancelled"].includes(ticket.status))
  const priority = tickets.some((ticket) => ticket.priority === "high")
  const phoneDigits = order.customerPhone.replace(/\D/g, "")
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">Pedido #{order.id} <SourceBadge source={order.source} />
          <span className="text-sm font-normal text-muted-foreground">{typeLabel[order.orderType]} · {new Date(order.createdAt).toLocaleString("es-PY")}</span></DialogTitle>
        <DialogDescription>{COLUMNS.find((column) => column.id === item.stage)?.title} · {order.status === "paid" ? "cobrado" : order.status === "cancelled" ? "cancelado" : "abierto"}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border p-3">
            <h3 className="text-sm font-bold">Cliente</h3>
            <p className="mt-1 text-sm">{order.customerName || "Sin nombre"}{order.tableLabel ? ` · ${order.tableLabel}` : ""}</p>
            {order.customerPhone && <p className="mt-1 flex flex-wrap items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5" />{order.customerPhone}
              {order.source === "whatsapp" && <Link href={`/admin/whatsapp?phone=${phoneDigits}`} className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline"><MessageCircle className="h-3.5 w-3.5" />Ver conversación</Link>}</p>}
            {order.orderType === "delivery" && <p className="mt-1 flex items-start gap-1 text-sm"><MapPin className="mt-0.5 h-3.5 w-3.5" />{order.deliveryAddress || "Sin dirección"}{order.deliveryLocation && <a href={`https://maps.google.com/?q=${order.deliveryLocation.lat},${order.deliveryLocation.lng}`} target="_blank" rel="noreferrer" className="ml-1 shrink-0 font-semibold text-sky-700 underline">Ver en el mapa</a>}{order.deliveryZoneName ? ` · ${order.deliveryZoneName}` : ""}</p>}
          </section>
          <section className="rounded-xl border p-3">
            <h3 className="text-sm font-bold">Productos</h3>
            <ul className="mt-2 divide-y text-sm">{order.items.map((line) => <li key={line.lineId} className="flex justify-between gap-2 py-1.5">
              <span>{line.quantity} × {line.productName}{line.modifiers.length ? <span className="block text-xs text-muted-foreground">{line.modifiers.map((modifier) => modifier.name).join(", ")}</span> : null}
                {line.ticketId == null && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">sin enviar</span>}</span>
              <span className="font-medium">{money(line.subtotal)}</span></li>)}</ul>
            <div className="mt-2 space-y-0.5 border-t pt-2 text-sm">
              {order.deliveryFee > 0 && <p className="flex justify-between"><span>Envío</span><span>{money(order.deliveryFee)}</span></p>}
              <p className="flex justify-between font-bold"><span>Total</span><span>{money(order.grandTotal)}</span></p>
            </div>
          </section>
          <section className="rounded-xl border p-3">
            <h3 className="text-sm font-bold">Comandas</h3>
            <ul className="mt-2 space-y-1 text-sm">{tickets.length ? tickets.map((ticket) => <li key={ticket.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><ChefHat className="h-3.5 w-3.5" />#{ticket.id} · {ticketLabel[ticket.status]}{ticket.priority === "high" ? " · prioridad" : ""}{ticket.delayMinutes ? ` · +${ticket.delayMinutes} min` : ""}</span>
              <Button variant="ghost" size="icon" onClick={() => window.open(`/kitchen/print/${ticket.id}`, "_blank")} aria-label={`Imprimir comanda ${ticket.id}`}><Printer className="h-4 w-4" /></Button></li>)
              : <li className="text-muted-foreground">Todavía no se envió a cocina.</li>}</ul>
            {active && <div className="mt-3 space-y-2 border-t pt-3">
              <div className="flex gap-2"><Input inputMode="numeric" value={delay} onChange={(event) => setDelay(event.target.value.replace(/\D/g, "").slice(0, 3))} className="w-20" aria-label="Minutos de demora" />
                <Button variant="outline" size="sm" disabled={saving || !delay} onClick={() => void notice({ action: "delay", minutes: Number(delay) }, "Demora avisada al cliente")}><Clock3 className="mr-1 h-4 w-4" />Avisar demora</Button>
                <Button variant="outline" size="sm" disabled={saving} onClick={() => void notice({ action: "priority", priority: priority ? "normal" : "high" }, priority ? "Prioridad normal" : "Marcado como prioridad")}><Flame className="mr-1 h-4 w-4" />{priority ? "Quitar prioridad" : "Prioridad"}</Button></div>
              <div className="flex gap-2"><Input value={missing} onChange={(event) => setMissing(event.target.value)} placeholder="Producto que falta" maxLength={200} />
                <Button variant="outline" size="sm" disabled={saving || !missing.trim()} onClick={() => void notice({ action: "missing", note: missing }, "Falta avisada").then(() => setMissing(""))}><AlertTriangle className="mr-1 h-4 w-4" />Avisar falta</Button></div>
            </div>}
          </section>
        </div>
        <div className="space-y-4">
          <section className="rounded-xl border p-3 space-y-2">
            <h3 className="text-sm font-bold">Responsables</h3>
            <label className="block text-xs font-semibold text-muted-foreground">Mozo / responsable
              <select value={order.waiterId ?? ""} disabled={saving || order.status !== "open"} onChange={(event) => void save({ waiterId: event.target.value ? Number(event.target.value) : null }, "Responsable asignado")}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"><option value="">Sin asignar</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
            {order.orderType === "delivery" && <label className="block text-xs font-semibold text-muted-foreground">Repartidor
              <select value={order.courierId ?? ""} disabled={saving || order.status !== "open"} onChange={(event) => void save({ courierId: event.target.value ? Number(event.target.value) : null }, "Repartidor asignado")}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"><option value="">Sin asignar</option>{couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.name}</option>)}</select></label>}
            <label className="block text-xs font-semibold text-muted-foreground">Observaciones
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} disabled={order.status !== "open"} className="mt-1 w-full rounded-md border bg-background p-2 text-sm text-foreground" /></label>
            {notes !== order.notes && <Button size="sm" disabled={saving} onClick={() => void save({ notes })}>Guardar observaciones</Button>}
          </section>
          <section className="rounded-xl border p-3">
            <h3 className="flex items-center gap-2 text-sm font-bold"><History className="h-4 w-4" />Historial</h3>
            <ol className="mt-2 max-h-56 space-y-2 overflow-y-auto text-xs">{history.map((event) => <li key={event.id} className="border-l-2 border-indigo-200 pl-2">
              <p className="font-medium text-slate-800 dark:text-slate-200">{eventLabel(event)}</p><p className="text-muted-foreground">{new Date(event.createdAt).toLocaleString("es-PY")}{event.actorName ? ` · ${event.actorName}` : ""}</p></li>)}
              {!history.length && <li className="text-muted-foreground">Sin eventos.</li>}</ol>
          </section>
          <div className="flex flex-wrap gap-2">
            {next && <Button onClick={onAdvance} className="flex-1"><CheckCircle2 className="mr-2 h-4 w-4" />{advanceLabel[next]}</Button>}
            {order.status === "open" && order.confirmation !== "pending" && order.items.length > 0 && canManage && <Button variant="outline" onClick={onCharge}><CreditCard className="mr-2 h-4 w-4" />Cobrar</Button>}
            {order.items.length > 0 && <Button variant="outline" onClick={() => window.open(order.saleId ? `/receipt/sale/${order.saleId}` : `/receipt/bill/${order.id}`, "_blank")}><Printer className="mr-2 h-4 w-4" />{order.saleId ? "Comprobante" : "Precuenta"}</Button>}
            {order.status === "open" && canManage && <Button variant="outline" onClick={onCancel} className="border-red-200 text-red-700"><XCircle className="mr-2 h-4 w-4" />Cancelar</Button>}
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
}
