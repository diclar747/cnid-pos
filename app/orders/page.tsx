"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Armchair, Bike, CheckCircle2, ChefHat, CreditCard, History, MapPin, MessageCircle, Pencil, Plus, Printer, QrCode, ReceiptText, RefreshCw, Search, Ticket, UserRound, XCircle } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ProtectedRoute from "../components/protected-route"
import { StaffPushButton } from "../components/table-calls-listener"
import { apiRequest } from "@/lib/api-client"
import { useLiveTables } from "@/lib/use-live"
import type { Courier, DeliveryZone, KitchenTicket, OrderEvent, ServiceOrder, StaffMember } from "@/lib/service-order-types"
import type { DiningTable } from "@/lib/dining-types"
import { useAuth } from "@/app/context/auth-context"

const money = (value: number) => `Gs ${value.toLocaleString("es-PY")}`
import { eventLabel, ticketLabel, typeLabel } from "@/lib/order-labels"

export default function OrdersPage() {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const canCharge = hasPermission("manage_sales")
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [tickets, setTickets] = useState<KitchenTicket[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [editing, setEditing] = useState<ServiceOrder | null>(null)
  const [details, setDetails] = useState({ tableId: null as number | null, tableLabel: "", customerName: "", customerPhone: "", notes: "", waiterId: null as number | null,
    deliveryZoneId: null as number | null, deliveryAddress: "", courierId: null as number | null })
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [history, setHistory] = useState<{ order: ServiceOrder; items: OrderEvent[] } | null>(null)

  const load = useCallback(async () => {
    try {
      const [orderData, ticketData, diningData, staffData, zoneData, courierData] = await Promise.all([
        apiRequest<{ items: ServiceOrder[] }>("/api/service-orders"),
        apiRequest<{ items: KitchenTicket[] }>("/api/kitchen-tickets"),
        apiRequest<{ tables: DiningTable[] }>("/api/dining?compact=1"),
        apiRequest<{ staff: StaffMember[] }>("/api/staff").catch(() => ({ staff: [] as StaffMember[] })),
        apiRequest<{ items: DeliveryZone[] }>("/api/delivery/zones").catch(() => ({ items: [] as DeliveryZone[] })),
        apiRequest<{ items: Courier[] }>("/api/delivery/couriers").catch(() => ({ items: [] as Courier[] })),
      ])
      setOrders(orderData.items)
      setTickets(ticketData.items)
      setTables(diningData.tables.filter((table) => table.isActive))
      setStaff(staffData.staff)
      setZones(zoneData.items)
      setCouriers(courierData.items)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron cargar las órdenes") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  useLiveTables(["service_orders", "kitchen_tickets"], () => void load(), 12000)

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es")
    return orders.filter((order) => !term || [order.id, order.tableLabel, order.customerName, order.customerPhone, order.cardCode]
      .some((part) => String(part ?? "").toLocaleLowerCase("es").includes(term)))
  }, [orders, search])
  const open = visible.filter((order) => order.status === "open")
  const closed = visible.filter((order) => order.status !== "open")
  const showHistory = async (order: ServiceOrder) => {
    try { setHistory({ order, items: (await apiRequest<{ items: OrderEvent[] }>(`/api/service-orders/${order.id}/history`)).items }) }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cargar el historial") }
  }
  const act = async (order: ServiceOrder, action: "send" | "cancel" | "details" | "bill" | "confirm" | "reject", extra: Record<string, unknown> = {}, print = false) => {
    const printWindow = print ? window.open("", "_blank") : null
    setBusyId(order.id)
    try {
      const result = await apiRequest<{ order: ServiceOrder; ticket: KitchenTicket | null }>(`/api/service-orders/${order.id}`, {
        method: "PATCH", body: JSON.stringify({ action, ...extra }),
      })
      if (printWindow) {
        if (action === "bill") printWindow.location.href = `/receipt/bill/${result.order.id}?auto=1`
        else if (result.ticket) printWindow.location.href = `/kitchen/print/${result.ticket.id}?auto=1`
        else printWindow.close()
      }
      toast.success({ send: "Comanda enviada a cocina", cancel: "Orden cancelada", details: "Datos actualizados", bill: "Precuenta lista para imprimir", confirm: "Pedido confirmado", reject: "Pedido rechazado" }[action])
      setEditing(null)
      await load()
    } catch (error) {
      printWindow?.close()
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la orden")
    } finally { setBusyId(null) }
  }
  const edit = (order: ServiceOrder) => {
    setEditing(order)
    setDetails({ tableId: order.tableId, tableLabel: order.tableLabel, customerName: order.customerName, customerPhone: order.customerPhone, notes: order.notes, waiterId: order.waiterId,
      deliveryZoneId: order.deliveryZoneId, deliveryAddress: order.deliveryAddress, courierId: order.courierId })
  }
  const orderCard = (order: ServiceOrder) => {
    const orderTickets = tickets.filter((ticket) => ticket.orderId === order.id)
    const drafts = order.items.filter((line) => line.ticketId == null).length
    return <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b bg-gradient-to-r from-indigo-50 to-sky-50 p-4 dark:from-indigo-950/50 dark:to-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-lg font-bold">Orden #{order.id}</p><p className="text-sm text-muted-foreground">{typeLabel[order.orderType]} · {new Date(order.createdAt).toLocaleString("es-PY")}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.status !== "open" ? "bg-slate-200 text-slate-600" : order.billedAt ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`} title={order.billedAt ? `Precuenta impresa ${new Date(order.billedAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}` : undefined}>{order.status === "open" ? (order.billedAt ? "Precuenta impresa" : "Abierta") : order.status === "paid" ? "Cobrada" : "Cancelada"}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {order.tableLabel && <span className="rounded-lg bg-white/80 px-2 py-1 dark:bg-slate-800">{order.tableLabel}</span>}
          {order.waiterName && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><UserRound className="h-3 w-3" /> {order.waiterName}</span>}
          {order.customerName && <span className="rounded-lg bg-white/80 px-2 py-1 dark:bg-slate-800">{order.customerName}</span>}
          {order.cardCode && <span className="rounded-lg bg-violet-100 px-2 py-1 font-mono text-violet-800">Tarjeta {order.cardCode.slice(-6)}</span>}
          {order.source === "table_qr" && <span className="inline-flex items-center gap-1 rounded-lg bg-sky-100 px-2 py-1 text-sky-800"><QrCode className="h-3 w-3" /> QR de mesa</span>}
          {order.source === "whatsapp" && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-emerald-800"><MessageCircle className="h-3 w-3" /> WhatsApp</span>}
        </div>
        {order.orderType === "delivery" && (order.deliveryAddress || order.deliveryZoneName || order.courierName) && <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
          {(order.deliveryAddress || order.deliveryZoneName) && <p className="flex items-start gap-1"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{[order.deliveryAddress, order.deliveryZoneName].filter(Boolean).join(" · ")}{order.deliveryLocation && <a href={`https://maps.google.com/?q=${order.deliveryLocation.lat},${order.deliveryLocation.lng}`} target="_blank" rel="noreferrer" className="ml-1 shrink-0 font-semibold text-sky-700 underline">Ver en el mapa</a>}</p>}
          {order.courierName && <p className="flex items-center gap-1"><Bike className="h-3 w-3" /> {order.courierName}</p>}
        </div>}
        {order.status === "open" && order.confirmation === "pending" && <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Pendiente de confirmación: revisalo antes de enviarlo a cocina.</p>}
      </div>
      <div className="space-y-3 p-4">
        <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
          {order.items.length === 0 ? <p className="text-muted-foreground">Cuenta sin productos todavía.</p> : order.items.map((line) => <div key={line.lineId} className="flex justify-between gap-3">
            <div><span className="font-medium">{line.quantity} × {line.productName}</span>{line.modifiers.length > 0 && <p className="text-xs text-muted-foreground">{line.modifiers.map((modifier) => modifier.name).join(", ")}</p>}</div>
            <span className="whitespace-nowrap">{money(line.subtotal)}</span>
          </div>)}
        </div>
        {order.notes && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{order.notes}</p>}
        {orderTickets.length > 0 && <div className="flex flex-wrap gap-1">{orderTickets.map((ticket) => <span key={ticket.id} className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">Comanda #{ticket.id}: {ticketLabel[ticket.status]}</span>)}</div>}
        {order.orderType === "delivery" && <div className="flex justify-between text-sm text-muted-foreground"><span>Envío{order.deliveryZoneName ? ` · ${order.deliveryZoneName}` : ""}</span><span>{order.deliveryZoneId ? (order.deliveryFee ? money(order.deliveryFee) : "Gratis") : "Sin zona"}</span></div>}
        <div className="flex items-center justify-between border-t pt-3"><span className="text-sm text-muted-foreground">{drafts > 0 ? `${drafts} sin enviar a cocina` : `${order.items.length} productos`}</span><strong className="text-lg">{money(order.grandTotal)}</strong></div>
        {order.status === "open" && order.confirmation === "pending" && <div className="grid grid-cols-2 gap-2">
          <Button disabled={busyId === order.id} onClick={() => void act(order, "confirm", { sendToKitchen: true })} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar</Button>
          {canCharge && <Button variant="outline" disabled={busyId === order.id} className="text-red-600" onClick={() => { const reason = window.prompt(`Motivo del rechazo de la orden #${order.id}`, "Sin disponibilidad"); if (reason !== null) void act(order, "reject", { reason }) }}><XCircle className="mr-1 h-4 w-4" /> Rechazar</Button>}
        </div>}
        {order.status === "open" && order.confirmation !== "pending" && <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => router.push(`/pos?order=${order.id}`)}><Plus className="mr-1 h-4 w-4" /> Agregar</Button>
          <Button variant="outline" disabled={!order.items.length || busyId === order.id} onClick={() => void act(order, "bill", {}, true)} className="border-indigo-300 text-indigo-800 dark:text-indigo-200" title="Imprime la cuenta para el cliente antes de cobrar"><ReceiptText className="mr-1 h-4 w-4" /> {order.billedAt ? "Reimprimir precuenta" : "Precuenta"}</Button>
          {canCharge && <Button onClick={() => router.push(`/checkout?order=${order.id}`)} disabled={!order.items.length} className="col-span-2 bg-emerald-600 hover:bg-emerald-700"><CreditCard className="mr-1 h-4 w-4" /> Cobrar</Button>}
          {drafts > 0 && <Button variant="outline" disabled={busyId === order.id} onClick={() => void act(order, "send", {}, true)} className="col-span-2 border-amber-300 text-amber-900 dark:text-amber-300"><ChefHat className="mr-1 h-4 w-4" /> Enviar e imprimir comanda</Button>}
          <Button variant="ghost" onClick={() => edit(order)} className={canCharge ? "" : "col-span-2"}><Pencil className="mr-1 h-4 w-4" /> Datos</Button>
          {canCharge && <Button variant="ghost" className="text-red-600" disabled={busyId === order.id} onClick={() => { if (window.confirm(`¿Cancelar orden #${order.id}? Se devolverá el stock reservado.`)) void act(order, "cancel") }}><XCircle className="mr-1 h-4 w-4" /> Cancelar</Button>}
        </div>}
        {order.status === "paid" && order.saleId && <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(`/receipt/sale/${order.saleId}`, "_blank")}><Printer className="mr-1 h-4 w-4" /> Reimprimir comprobante</Button>}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => void showHistory(order)}><History className="mr-1 h-3 w-3" /> Historial</Button>
          {orderTickets.map((ticket) => <Button key={ticket.id} variant="link" size="sm" className="h-auto p-0" onClick={() => window.open(`/kitchen/print/${ticket.id}`, "_blank")}><Printer className="mr-1 h-3 w-3" /> Reimprimir #{ticket.id}</Button>)}
        </div>
      </div>
    </article>
  }

  return <ProtectedRoute requiredPermissions={["access_pos"]}><main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/50 to-sky-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 sm:p-6">
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><Button variant="ghost" size="sm" onClick={() => router.push("/pos")} className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> POS</Button><h1 className="text-3xl font-bold tracking-tight">Órdenes y cuentas</h1><p className="text-muted-foreground">Asigná una mesa o tarjeta, sumá consumos y cobrá cuando termine.</p></div>
        <div className="flex flex-wrap gap-2"><StaffPushButton />{hasPermission("manage_company") && <Button variant="outline" onClick={() => router.push("/admin/dining")}><Armchair className="mr-2 h-4 w-4" /> Mesas</Button>}<Button variant="outline" onClick={() => router.push("/orders/cards")}><Ticket className="mr-2 h-4 w-4" /> Tarjetas QR</Button><Button variant="outline" onClick={() => router.push("/kitchen")}><ChefHat className="mr-2 h-4 w-4" /> Cocina</Button><Button variant="outline" onClick={() => void load()} aria-label="Actualizar"><RefreshCw className="h-4 w-4" /></Button></div>
      </header>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg"><p className="text-sm opacity-80">Cuentas abiertas</p><strong className="text-3xl">{orders.filter((order) => order.status === "open").length}</strong></div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-lg"><p className="text-sm opacity-80">Pendiente de cobro</p><strong className="text-2xl">{money(orders.filter((order) => order.status === "open").reduce((sum, order) => sum + order.grandTotal, 0))}</strong></div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg"><p className="text-sm opacity-80">Comandas activas</p><strong className="text-3xl">{tickets.filter((ticket) => !["served", "delivered", "cancelled"].includes(ticket.status)).length}</strong></div>
      </div>
      <div className="relative mb-5 max-w-lg"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar orden, cliente, mesa o tarjeta…" className="h-10 bg-white pl-10 dark:bg-slate-900" /></div>
      <h2 className="mb-3 text-lg font-semibold">Abiertas ({open.length})</h2>
      {loading ? <p className="py-10 text-center text-muted-foreground">Cargando órdenes…</p> : open.length ? <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{open.map(orderCard)}</div> : <div className="mb-8 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No hay cuentas abiertas. Desde el POS podés guardar una nueva orden.</div>}
      {closed.length > 0 && <><h2 className="mb-3 text-lg font-semibold">Cerradas recientes ({closed.length})</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{closed.map(orderCard)}</div></>}
    </div>
    <Dialog open={Boolean(editing)} onOpenChange={(value) => { if (!value) setEditing(null) }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Datos de orden #{editing?.id}</DialogTitle><DialogDescription>Identificación para cocina, cobro y delivery.</DialogDescription></DialogHeader>
      <div className="space-y-3"><label className="block text-sm font-medium">Mesa<select value={details.tableId ?? ""} onChange={(event) => setDetails((current) => ({ ...current, tableId: event.target.value ? Number(event.target.value) : null, tableLabel: "" }))} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="">Sin mesa asignada</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.roomName} · {table.label} ({table.seats} sillas){table.openOrderId && table.openOrderId !== editing?.id ? " · ocupada" : ""}</option>)}</select></label><label className="block text-sm font-medium">Mesero<select value={details.waiterId ?? ""} onChange={(event) => setDetails((current) => ({ ...current, waiterId: event.target.value ? Number(event.target.value) : null }))} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="">Sin mesero asignado</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}{member.role !== "waiter" ? ` (${{ admin: "administrador", manager: "gerente", cashier: "cajero", waiter: "mesero" }[member.role]})` : ""}</option>)}</select></label>{(["tableLabel", "customerName", "customerPhone", "notes"] as const).map((key) => <label key={key} className="block text-sm font-medium">{{ tableLabel: "Referencia (sin mesa)", customerName: "Cliente", customerPhone: "Teléfono", notes: "Notas para cocina" }[key]}<Input value={details[key]} disabled={key === "tableLabel" && Boolean(details.tableId)} onChange={(event) => setDetails((current) => ({ ...current, [key]: event.target.value }))} className="mt-1" /></label>)}
        {editing?.orderType === "delivery" && <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <label className="block text-sm font-medium">Zona de delivery<select value={details.deliveryZoneId ?? ""} onChange={(event) => setDetails((current) => ({ ...current, deliveryZoneId: event.target.value ? Number(event.target.value) : null }))} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="">Sin zona (sin costo de envío)</option>{zones.filter((zone) => zone.isActive || zone.id === details.deliveryZoneId).map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · {zone.fee ? money(zone.fee) : "gratis"}{zone.freeOver != null ? ` (gratis desde ${money(zone.freeOver)})` : ""}</option>)}</select></label>
          <label className="block text-sm font-medium">Dirección de entrega<Input value={details.deliveryAddress} onChange={(event) => setDetails((current) => ({ ...current, deliveryAddress: event.target.value }))} placeholder="Calle, número, referencia" className="mt-1" /></label>
          <label className="block text-sm font-medium">Repartidor<select value={details.courierId ?? ""} onChange={(event) => setDetails((current) => ({ ...current, courierId: event.target.value ? Number(event.target.value) : null }))} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="">Sin asignar</option>{couriers.filter((courier) => courier.isActive || courier.id === details.courierId).map((courier) => <option key={courier.id} value={courier.id}>{courier.name}{courier.vehicle ? ` · ${courier.vehicle}` : ""}</option>)}</select></label>
          {zones.length === 0 && <p className="text-xs text-muted-foreground">Todavía no hay zonas: crealas en Administración → Delivery.</p>}
        </div>}
        <Button className="w-full" disabled={busyId === editing?.id} onClick={() => { if (editing) void act(editing, "details", details) }}>Guardar datos</Button></div>
    </DialogContent></Dialog>
    <Dialog open={Boolean(history)} onOpenChange={(value) => { if (!value) setHistory(null) }}><DialogContent className="max-h-[85vh] max-w-md overflow-y-auto"><DialogHeader><DialogTitle>Historial de la orden #{history?.order.id}</DialogTitle><DialogDescription>Cada cambio con quién lo hizo y cuándo.</DialogDescription></DialogHeader>
      {history && (history.items.length === 0 ? <p className="text-sm text-muted-foreground">Esta orden es anterior al historial; no tiene eventos registrados.</p> :
        <ol className="relative space-y-4 border-l border-indigo-200 pl-5 dark:border-slate-700">{history.items.map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 dark:border-slate-900" aria-hidden />
            <p className="text-sm font-medium">{eventLabel(event)}</p>
            <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "medium" })}{event.actorName ? ` · ${event.actorName}` : ""}</p>
          </li>))}</ol>)}
    </DialogContent></Dialog>
  </main></ProtectedRoute>
}
