"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, ChefHat, Clock3, Printer, RefreshCw, Truck } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import ProtectedRoute from "../components/protected-route"
import { apiRequest } from "@/lib/api-client"
import type { KitchenStatus, KitchenTicket } from "@/lib/service-order-types"

const typeLabel = { dineIn: "En el local", delivery: "Delivery", pickup: "Retiro" }
const nextStatus = (ticket: KitchenTicket): { status: KitchenStatus; label: string } | null => {
  if (ticket.status === "pending") return { status: "preparing", label: "Empezar preparación" }
  if (ticket.status === "preparing") return { status: "ready", label: "Marcar listo" }
  if (ticket.status === "ready") return ticket.orderType === "dineIn"
    ? { status: "served", label: "Marcar servido" }
    : ticket.orderType === "delivery" ? { status: "out_for_delivery", label: "Enviar a reparto" } : { status: "delivered", label: "Marcar entregado" }
  if (ticket.status === "out_for_delivery") return { status: "delivered", label: "Confirmar entrega" }
  return null
}
const columns: { status: KitchenStatus[]; title: string; subtitle: string; color: string; icon: typeof Clock3 }[] = [
  { status: ["pending"], title: "Pendiente", subtitle: "Esperando preparación", color: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30", icon: Clock3 },
  { status: ["preparing"], title: "Preparando", subtitle: "En cocina", color: "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30", icon: ChefHat },
  { status: ["ready"], title: "Listo", subtitle: "Para servir o despachar", color: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30", icon: Check },
  { status: ["out_for_delivery"], title: "En reparto", subtitle: "Camino al cliente", color: "border-violet-300 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30", icon: Truck },
  { status: ["served", "delivered"], title: "Entregado", subtitle: "Servido o recibido", color: "border-slate-300 bg-slate-100 dark:border-slate-800 dark:bg-slate-900", icon: Check },
]

export default function KitchenPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<KitchenTicket[]>([])
  const [busy, setBusy] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try { setTickets((await apiRequest<{ items: KitchenTicket[] }>("/api/kitchen-tickets")).items) }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se cargaron las comandas") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { void load() }, 8000)
    return () => window.clearInterval(timer)
  }, [load])
  const activeCount = useMemo(() => tickets.filter((ticket) => ["pending", "preparing", "ready", "out_for_delivery"].includes(ticket.status)).length, [tickets])
  const advance = async (ticket: KitchenTicket) => {
    const next = nextStatus(ticket)
    if (!next) return
    setBusy(ticket.id)
    try {
      const result = await apiRequest<{ ticket: KitchenTicket }>(`/api/kitchen-tickets/${ticket.id}`, { method: "PATCH", body: JSON.stringify({ status: next.status }) })
      setTickets((current) => current.map((item) => item.id === ticket.id ? result.ticket : item))
      toast.success(`Comanda #${ticket.id}: ${next.label.toLocaleLowerCase("es")}`)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado") }
    finally { setBusy(null) }
  }

  return <ProtectedRoute requiredPermissions={["access_pos"]}><main className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-violet-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 sm:p-6">
    <div className="mx-auto max-w-[1800px]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><Button variant="ghost" size="sm" onClick={() => router.push("/pos")} className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> POS</Button><h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight"><ChefHat className="h-8 w-8 text-amber-600" /> Cocina y delivery</h1><p className="text-muted-foreground">Las comandas aparecen automáticamente y avanzan hasta la entrega.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => router.push("/orders")}>Ver órdenes</Button><Button variant="outline" onClick={() => void load()} aria-label="Actualizar"><RefreshCw className="h-4 w-4" /></Button></div></header>
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-800 p-5 text-white shadow-lg"><span className="text-sm text-indigo-100">Comandas activas</span><strong className="ml-4 text-3xl">{activeCount}</strong><span className="ml-4 text-xs text-indigo-200">Se actualiza cada 8 segundos</span></div>
      {loading ? <p className="py-12 text-center text-muted-foreground">Cargando cocina…</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{columns.map((column) => {
        const Icon = column.icon
        const items = tickets.filter((ticket) => column.status.includes(ticket.status))
        return <section key={column.title} className={`min-h-64 rounded-2xl border p-3 ${column.color}`}>
          <div className="mb-4 flex items-start justify-between"><div><h2 className="flex items-center gap-2 font-bold"><Icon className="h-5 w-5" />{column.title}</h2><p className="text-xs text-muted-foreground">{column.subtitle}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white">{items.length}</span></div>
          <div className="space-y-3">{items.length === 0 && <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Sin comandas</div>}{items.map((ticket) => <article key={ticket.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2"><div><p className="text-lg font-extrabold">#{ticket.orderId} <span className="text-xs font-medium text-muted-foreground">/ comanda {ticket.id}</span></p><p className="text-xs text-muted-foreground">{typeLabel[ticket.orderType]} · {new Date(ticket.createdAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}</p></div><Button variant="ghost" size="icon" title="Imprimir comanda" aria-label={`Imprimir comanda ${ticket.id}`} onClick={() => window.open(`/kitchen/print/${ticket.id}`, "_blank")}><Printer className="h-4 w-4" /></Button></div>
            <div className="mt-3 flex flex-wrap gap-1 text-xs">{ticket.tableLabel && <span className="rounded bg-indigo-100 px-2 py-1 font-semibold text-indigo-800">{ticket.tableLabel}</span>}{ticket.customerName && <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{ticket.customerName}</span>}{ticket.cardCode && <span className="rounded bg-violet-100 px-2 py-1 text-violet-800">QR {ticket.cardCode.slice(-6)}</span>}</div>
            <div className="my-3 space-y-2 border-y py-3">{ticket.items.map((line) => <div key={line.lineId} className="text-sm"><strong>{line.quantity} × {line.productName}</strong>{line.modifiers.length > 0 && <p className="pl-4 text-xs text-muted-foreground">{line.modifiers.map((option) => option.name).join(", ")}</p>}</div>)}</div>
            {ticket.notes && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{ticket.notes}</p>}
            {nextStatus(ticket) && <Button className="w-full" disabled={busy === ticket.id} onClick={() => void advance(ticket)}>{nextStatus(ticket)?.label}</Button>}
          </article>)}</div>
        </section>
      })}</div>}
    </div>
  </main></ProtectedRoute>
}
