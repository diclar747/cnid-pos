"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, Check, ChefHat, Clock3, Flame, GripVertical, MoveRight, Printer, RefreshCw, Settings2, Truck } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import ProtectedRoute from "../components/protected-route"
import { StaffPushButton } from "../components/table-calls-listener"
import { apiRequest } from "@/lib/api-client"
import { useLiveTables } from "@/lib/use-live"
import type { KitchenStatus, KitchenTicket } from "@/lib/service-order-types"
import { BOARD_COLORS, boardColumns, columnOf, targetStatus, type BoardColumn } from "@/lib/kitchen-board"
import { useCompany } from "../context/company-context"
import { useAuth } from "../context/auth-context"
import { BoardEditor } from "./board-editor"

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
const iconFor = (column: BoardColumn) => column.status === "pending" ? Clock3 : column.status === "preparing" ? ChefHat : column.status === "out_for_delivery" ? Truck : Check

export default function KitchenPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<KitchenTicket[]>([])
  const [busy, setBusy] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { companyConfig, updateCompanyConfig } = useCompany()
  const { hasPermission } = useAuth()
  const columns = useMemo(() => boardColumns(companyConfig?.kitchenBoard), [companyConfig?.kitchenBoard])
  const visibleColumns = columns.filter((column) => !column.hidden)
  const [editing, setEditing] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)
  const [overColumn, setOverColumn] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setTickets((await apiRequest<{ items: KitchenTicket[] }>("/api/kitchen-tickets")).items) }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se cargaron las comandas") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  // Comandas nuevas y cambios llegan en vivo; sin conexión en vivo, se consulta cada 8 s.
  useLiveTables(["kitchen_tickets", "service_orders"], () => void load(), 8000)
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

  // Arrastrar y soltar (o «Mover a…»): la comanda va directo a esa columna, saltando pasos o volviendo atrás.
  const moveTo = async (ticket: KitchenTicket, column: BoardColumn) => {
    const status = targetStatus(column, ticket)
    if (!status) { toast.error("Solo los pedidos de delivery van a reparto."); return }
    const custom = column.builtIn ? null : column.id
    if (status === ticket.status && (ticket.boardColumn ?? null) === custom) return
    setBusy(ticket.id)
    setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, status, boardColumn: custom } : item))
    try {
      const result = await apiRequest<{ ticket: KitchenTicket }>(`/api/kitchen-tickets/${ticket.id}`, { method: "PATCH", body: JSON.stringify({ status, jump: true, column: custom }) })
      setTickets((current) => current.map((item) => item.id === ticket.id ? result.ticket : item))
      toast.success(`Comanda #${ticket.id} → ${column.title}`)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo mover"); void load() }
    finally { setBusy(null) }
  }
  const saveBoard = async (next: BoardColumn[]) => {
    await updateCompanyConfig({ kitchenBoard: { columns: next } })
    toast.success("Tablero guardado")
  }

  // Avisos de cocina al cliente y al tablero: demora, falta de producto y prioridad.
  const notice = async (ticket: KitchenTicket, body: Record<string, unknown>, done: string) => {
    setBusy(ticket.id)
    try {
      const result = await apiRequest<{ ticket: KitchenTicket }>(`/api/kitchen-tickets/${ticket.id}`, { method: "POST", body: JSON.stringify(body) })
      setTickets((current) => current.map((item) => item.id === ticket.id ? result.ticket : item))
      toast.success(done)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo avisar") }
    finally { setBusy(null) }
  }
  const [missingFor, setMissingFor] = useState<number | null>(null)
  const [missingText, setMissingText] = useState("")

  return <ProtectedRoute requiredPermissions={["access_pos"]}><main className="flex h-full min-h-[34rem] flex-col bg-gradient-to-br from-slate-50 via-sky-50 to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
    <div className="shrink-0 px-4 pt-4 sm:px-6">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight"><ChefHat className="h-8 w-8 text-amber-600" /> Cocina y delivery</h1><p className="text-muted-foreground">Arrastrá cada comanda a la columna que quieras · <span className="font-semibold text-indigo-700 dark:text-indigo-300">{activeCount} activas</span> · en vivo</p></div><div className="flex flex-wrap gap-2"><StaffPushButton />{hasPermission("manage_company") && <Button variant="outline" onClick={() => setEditing(true)}><Settings2 className="mr-2 h-4 w-4" />Editar tablero</Button>}<Button variant="outline" onClick={() => router.push("/orders")}>Ver órdenes</Button><Button variant="outline" onClick={() => void load()} aria-label="Actualizar"><RefreshCw className="h-4 w-4" /></Button></div></header>
    </div>
    {loading ? <p className="py-12 text-center text-muted-foreground">Cargando cocina…</p> : <div className="min-h-0 flex-1 overflow-x-auto px-4 pb-4 sm:px-6"><div className="flex h-full gap-3">{visibleColumns.map((column) => {
        const Icon = iconFor(column)
        const items = tickets.filter((ticket) => columnOf(ticket, columns)?.id === column.id).sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high"))
        const dragged = tickets.find((ticket) => ticket.id === dragId)
        const allowed = !dragged || targetStatus(column, dragged) !== null
        return <section key={column.id} aria-label={column.title}
          onDragOver={(event) => { if (dragId !== null && allowed) { event.preventDefault(); setOverColumn(column.id) } }}
          onDragLeave={() => setOverColumn((current) => current === column.id ? null : current)}
          onDrop={(event) => { event.preventDefault(); setOverColumn(null); const ticket = tickets.find((item) => item.id === dragId); setDragId(null); if (ticket) void moveTo(ticket, column) }}
          className={`flex h-full w-80 shrink-0 flex-col rounded-2xl border transition ${BOARD_COLORS[column.color] ?? BOARD_COLORS.slate} ${overColumn === column.id ? "ring-4 ring-indigo-300 dark:ring-indigo-700" : ""} ${dragId !== null && !allowed ? "opacity-50" : ""}`}>
          <div className="flex shrink-0 items-start justify-between p-3"><div><h2 className="flex items-center gap-2 font-bold"><Icon className="h-5 w-5" />{column.title}</h2><p className="text-xs text-muted-foreground">{column.subtitle}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white">{items.length}</span></div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">{items.length === 0 && <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">{dragId !== null && allowed ? "Soltá acá" : "Sin comandas"}</div>}{items.map((ticket) => <article key={ticket.id} draggable={busy !== ticket.id}
            onDragStart={(event) => { setDragId(ticket.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(ticket.id)) }}
            onDragEnd={() => { setDragId(null); setOverColumn(null) }}
            className={`cursor-grab rounded-xl border bg-card p-4 shadow-sm active:cursor-grabbing ${dragId === ticket.id ? "opacity-40" : ""} ${ticket.priority === "high" ? "border-red-400 ring-2 ring-red-200" : ""}`}>
            {(ticket.priority === "high" || ticket.delayMinutes) && <div className="mb-2 flex flex-wrap gap-1">{ticket.priority === "high" && <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700"><Flame className="h-3.5 w-3.5" />Prioridad</span>}{ticket.delayMinutes && <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"><Clock3 className="h-3.5 w-3.5" />Demora +{ticket.delayMinutes} min</span>}</div>}
            <div className="flex items-start justify-between gap-2"><div><p className="text-lg font-extrabold">#{ticket.orderId} <span className="text-xs font-medium text-muted-foreground">/ comanda {ticket.id}</span></p><p className="text-xs text-muted-foreground">{typeLabel[ticket.orderType]} · {new Date(ticket.createdAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}</p></div><div className="flex items-center gap-0.5"><Button variant="ghost" size="icon" title="Imprimir comanda" aria-label={`Imprimir comanda ${ticket.id}`} onClick={() => window.open(`/kitchen/print/${ticket.id}`, "_blank")}><Printer className="h-4 w-4" /></Button><GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden /></div></div>
            <div className="mt-3 flex flex-wrap gap-1 text-xs">{ticket.tableLabel && <span className="rounded bg-indigo-100 px-2 py-1 font-semibold text-indigo-800">{ticket.tableLabel}</span>}{ticket.customerName && <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">{ticket.customerName}</span>}{ticket.cardCode && <span className="rounded bg-violet-100 px-2 py-1 text-violet-800">QR {ticket.cardCode.slice(-6)}</span>}{ticket.courierName && <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">🛵 {ticket.courierName}</span>}</div>{ticket.orderType === "delivery" && ticket.deliveryAddress && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">📍 {ticket.deliveryAddress}</p>}
            <div className="my-3 space-y-2 border-y py-3">{ticket.items.map((line) => <div key={line.lineId} className="text-sm"><strong>{line.quantity} × {line.productName}</strong>{line.modifiers.length > 0 && <p className="pl-4 text-xs text-muted-foreground">{line.modifiers.map((option) => option.name).join(", ")}</p>}</div>)}</div>
            {ticket.notes && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{ticket.notes}</p>}
            {nextStatus(ticket) && <Button className="w-full" disabled={busy === ticket.id} onClick={() => void advance(ticket)}>{nextStatus(ticket)?.label}</Button>}
            {["pending", "preparing"].includes(ticket.status) && <div className="mt-2 grid grid-cols-3 gap-1">
              <Button size="sm" variant="outline" className="h-8 px-1 text-xs" disabled={busy === ticket.id} title="Marcar o quitar prioridad" onClick={() => void notice(ticket, { action: "priority", priority: ticket.priority === "high" ? "normal" : "high" }, ticket.priority === "high" ? "Prioridad normal" : "Marcada como prioridad")}><Flame className="mr-1 h-3.5 w-3.5" />{ticket.priority === "high" ? "Normal" : "Urgente"}</Button>
              <Button size="sm" variant="outline" className="h-8 px-1 text-xs" disabled={busy === ticket.id} title="Avisar al cliente una demora de 10 minutos" onClick={() => void notice(ticket, { action: "delay", minutes: (ticket.delayMinutes ?? 0) + 10 }, "Demora avisada")}><Clock3 className="mr-1 h-3.5 w-3.5" />+10 min</Button>
              <Button size="sm" variant="outline" className="h-8 px-1 text-xs" disabled={busy === ticket.id} title="Avisar que falta un producto" onClick={() => { setMissingFor(missingFor === ticket.id ? null : ticket.id); setMissingText("") }}><AlertTriangle className="mr-1 h-3.5 w-3.5" />Falta</Button>
            </div>}
            {missingFor === ticket.id && <form className="mt-2 flex gap-1" onSubmit={(event) => { event.preventDefault(); if (missingText.trim()) void notice(ticket, { action: "missing", note: missingText }, "Falta avisada").then(() => setMissingFor(null)) }}>
              <input autoFocus value={missingText} onChange={(event) => setMissingText(event.target.value)} maxLength={200} placeholder="¿Qué falta?" className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs" />
              <Button size="sm" className="h-8 text-xs" type="submit" disabled={!missingText.trim()}>Avisar</Button></form>}
            <label className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><MoveRight className="h-3.5 w-3.5 shrink-0" />
              <select value="" onChange={(event) => { const column = visibleColumns.find((item) => item.id === event.target.value); if (column) void moveTo(ticket, column) }} disabled={busy === ticket.id}
                className="h-7 min-w-0 flex-1 rounded-md border bg-background px-1.5 text-xs" aria-label={`Mover comanda ${ticket.id}`}>
                <option value="">Mover a…</option>{visibleColumns.filter((item) => item.id !== column.id && targetStatus(item, ticket) !== null).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          </article>)}</div>
        </section>
      })}</div></div>}
    <BoardEditor open={editing} columns={columns} onClose={() => setEditing(false)} onSave={saveBoard} />
  </main></ProtectedRoute>
}
