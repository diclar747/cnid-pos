"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Armchair, Loader2, Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/api-client"
import { useLiveTables } from "@/lib/use-live"
import type { DiningTable } from "@/lib/dining-types"
import type { ServiceOrder } from "@/lib/service-order-types"

const guarani = (value: number) => `Gs ${value.toLocaleString("es-PY")}`
const sinceLabel = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es")

export interface PickedTable { id: number; label: string; orderId: number | null; orderTotal: number }

interface TablePickerProps {
  open: boolean
  onClose: () => void
  /** Qué pasa al tocar una mesa (depende de si hay carrito u orden abierta). */
  hint: string
  /** Mesa ya elegida o de la orden abierta, se resalta. */
  currentTableId: number | null
  onPick: (table: DiningTable, order: ServiceOrder | null) => void
}

/** Mapa de mesas del POS: libres y ocupadas con su cuenta, para asignar el pedido o abrir la cuenta y cobrar. */
export default function TablePicker({ open, onClose, hint, currentTableId, onPick }: TablePickerProps) {
  const [tables, setTables] = useState<DiningTable[] | null>(null)
  const [orders, setOrders] = useState<Map<number, ServiceOrder>>(new Map())
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "free" | "busy">("all")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const [dining, list] = await Promise.all([
        apiRequest<{ tables: DiningTable[] }>("/api/dining?compact=1"),
        apiRequest<{ items: ServiceOrder[] }>("/api/service-orders"),
      ])
      setTables(dining.tables.filter((table) => table.isActive))
      setOrders(new Map(list.items.filter((order) => order.status === "open" && order.tableId).map((order) => [order.tableId as number, order])))
      setError("")
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudieron cargar las mesas.") }
  }, [])
  useEffect(() => { if (open) { setQuery(""); void load() } }, [open, load])
  useLiveTables(open ? ["service_orders", "dining_tables"] : ["__none__"], () => void load(), 20000)

  const rooms = useMemo(() => {
    const text = normalize(query.trim())
    const grouped = new Map<string, DiningTable[]>()
    for (const table of tables ?? []) {
      const busy = Boolean(orders.get(table.id) ?? table.openOrderId)
      if (filter === "free" && busy) continue
      if (filter === "busy" && !busy) continue
      const order = orders.get(table.id)
      if (text && !normalize(`${table.roomName} ${table.label} ${order?.customerName ?? ""} ${order?.waiterName ?? ""} ${order?.id ?? ""}`).includes(text)) continue
      grouped.set(table.roomName, [...(grouped.get(table.roomName) ?? []), table])
    }
    for (const list of grouped.values()) list.sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }))
    return [...grouped.entries()]
  }, [tables, orders, query, filter])
  const busyCount = (tables ?? []).filter((table) => orders.has(table.id) || table.openOrderId).length

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-5 pb-3 pt-5 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2"><Armchair className="h-5 w-5 text-emerald-600" /> Mesas</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-5 py-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mesa, cliente o mesero" className="pl-9" aria-label="Buscar mesa" />
          </div>
          <div className="flex rounded-lg border p-0.5 text-xs font-semibold">
            {([["all", `Todas (${tables?.length ?? 0})`], ["free", `Libres (${(tables?.length ?? 0) - busyCount})`], ["busy", `Ocupadas (${busyCount})`]] as const).map(([value, label]) =>
              <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-md px-2.5 py-1.5 ${filter === value ? "bg-indigo-600 text-white" : "text-muted-foreground hover:bg-muted"}`}>{label}</button>)}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
            : !tables ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando mesas…</p>
            : !tables.length ? <p className="text-sm text-muted-foreground">Todavía no hay mesas. Crealas en «Mesas» (salones y mesas).</p>
            : !rooms.length ? <p className="text-sm text-muted-foreground">Ninguna mesa coincide.</p>
            : <div className="space-y-5">{rooms.map(([room, list]) => <section key={room}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{room}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{list.map((table) => {
                const order = orders.get(table.id) ?? null
                const busy = Boolean(order ?? table.openOrderId)
                const drafts = order?.items.filter((line) => line.ticketId == null).length ?? 0
                const units = order?.items.reduce((sum, line) => sum + line.quantity, 0) ?? 0
                const current = currentTableId === table.id
                return <button key={table.id} type="button" onClick={() => onPick(table, order)}
                  className={`flex min-h-24 flex-col rounded-xl border-2 p-3 text-left transition hover:shadow-md ${busy
                    ? "border-amber-300 bg-amber-50 hover:border-amber-500 dark:border-amber-800 dark:bg-amber-950/30"
                    : "border-emerald-200 bg-emerald-50/60 hover:border-emerald-500 dark:border-emerald-900 dark:bg-emerald-950/20"} ${current ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900" : ""}`}>
                  <span className="flex w-full items-start justify-between gap-1">
                    <span className="text-base font-black leading-tight">{table.label}</span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${busy ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100" : "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"}`}>{busy ? "Ocupada" : "Libre"}</span>
                  </span>
                  <span className="mt-0.5 text-[11px] text-muted-foreground">{table.seats} sillas{current ? " · elegida" : ""}</span>
                  {order ? <span className="mt-auto space-y-0.5 pt-1.5 text-[11px]">
                    <span className="block text-sm font-bold text-amber-900 dark:text-amber-200">{guarani(order.total)}</span>
                    <span className="block truncate text-muted-foreground">#{order.id} · {units} prod. · {sinceLabel(order.createdAt)}</span>
                    {(order.customerName || order.waiterName) && <span className="block truncate text-muted-foreground">{[order.customerName, order.waiterName && `Mesero: ${order.waiterName}`].filter(Boolean).join(" · ")}</span>}
                    {drafts > 0 && <span className="block font-semibold text-red-600 dark:text-red-400">{drafts} sin enviar a cocina</span>}
                  </span> : busy && <span className="mt-auto pt-1.5 text-[11px] text-muted-foreground">Cuenta #{table.openOrderId}</span>}
                </button>
              })}</div>
            </section>)}</div>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
