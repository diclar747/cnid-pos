"use client"

import { useCallback, useEffect, useState } from "react"
import { Pencil, Phone, Plus, RefreshCw, Search, UserRound, UsersRound, Wallet } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiRequest } from "@/lib/api-client"
import type { Customer } from "@/lib/service-order-types"

const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const formatPhone = (phone: string) => phone.startsWith("595") ? `+595 ${phone.slice(3)}` : phone
const typeLabel: Record<string, string> = { dineIn: "Local", delivery: "Delivery", pickup: "Retiro" }
const payLabel: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", mixed: "Mixto", unknown: "—" }
const empty = { name: "", phone: "", ruc: "", email: "", address: "", notes: "" }

type Detail = {
  item: Customer
  sales: Array<{ id: number; date: string; total: number; paymentMethod: string; orderType: string; itemCount: number }>
  openOrders: Array<{ id: number; orderType: string; total: number; createdAt: string }>
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([])
  const [stats, setStats] = useState({ total: 0, returning: 0 })
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [editing, setEditing] = useState<{ id: number | null; form: typeof empty } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (q = query) => {
    setLoading(true)
    try {
      const result = await apiRequest<{ items: Customer[]; total: number; returning: number }>(`/api/customers?limit=300${q ? `&q=${encodeURIComponent(q)}` : ""}`)
      setItems(result.items)
      setStats({ total: result.total, returning: result.returning })
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron cargar los clientes") }
    finally { setLoading(false) }
  }, [query])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(query) }, 250)
    return () => window.clearTimeout(timer)
  }, [query, load])

  const open = async (customer: Customer) => {
    try { setDetail(await apiRequest<Detail>(`/api/customers/${customer.id}`)) }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo abrir el cliente") }
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const path = editing.id ? `/api/customers/${editing.id}` : "/api/customers"
      const result = await apiRequest<{ item: Customer }>(path, { method: editing.id ? "PUT" : "POST", body: JSON.stringify(editing.form) })
      toast.success(editing.id ? "Cliente actualizado" : "Cliente creado")
      setEditing(null)
      if (detail?.item.id === result.item.id) setDetail({ ...detail, item: result.item })
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar") }
    finally { setSaving(false) }
  }

  const spent = items.reduce((sum, c) => sum + c.totalSpent, 0)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Se registran solos con el teléfono o el RUC de cada pedido.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} aria-label="Actualizar"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setEditing({ id: null, form: { ...empty } })}><Plus className="mr-2 h-4 w-4" /> Nuevo cliente</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Clientes", value: stats.total.toLocaleString("es-PY"), icon: UsersRound, color: "from-indigo-600 to-violet-600" },
          { label: "Volvieron a comprar", value: stats.returning.toLocaleString("es-PY"), icon: UserRound, color: "from-emerald-500 to-teal-600" },
          { label: query ? "Compras de la búsqueda" : "Compras de los listados", value: money(spent), icon: Wallet, color: "from-amber-500 to-orange-500" }].map((card) => (
          <div key={card.label} className={`rounded-2xl bg-gradient-to-br ${card.color} p-5 text-white shadow-lg`}>
            <card.icon className="h-5 w-5 opacity-80" />
            <p className="mt-3 text-sm opacity-80">{card.label}</p>
            <strong className="text-2xl">{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, teléfono o RUC…" className="h-10 pl-10" />
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-slate-900">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-950">
            <tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Teléfono</th><th className="px-4 py-3">RUC</th><th className="px-4 py-3 text-right">Compras</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Última</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
              : items.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">{query ? "Sin resultados." : "Todavía no hay clientes. Aparecen al cargar un teléfono o RUC en un pedido."}</td></tr>
              : items.map((customer) => (
                <tr key={customer.id} onClick={() => void open(customer)} className="cursor-pointer border-b last:border-0 hover:bg-indigo-50/50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-medium">{customer.name || <span className="text-muted-foreground">Sin nombre</span>}</td>
                  <td className="px-4 py-3">{customer.phone ? formatPhone(customer.phone) : "—"}</td>
                  <td className="px-4 py-3">{customer.ruc || "—"}</td>
                  <td className="px-4 py-3 text-right">{customer.ordersCount}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(customer.totalSpent)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("es-PY") : "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(value) => { if (!value) setDetail(null) }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {detail && <>
            <DialogHeader>
              <DialogTitle>{detail.item.name || "Cliente sin nombre"}</DialogTitle>
              <DialogDescription>Cliente desde {new Date(detail.item.createdAt).toLocaleDateString("es-PY")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Teléfono:</span> {detail.item.phone ? <a className="text-indigo-600" href={`https://wa.me/${detail.item.phone}`} target="_blank" rel="noopener noreferrer"><Phone className="mr-1 inline h-3 w-3" />{formatPhone(detail.item.phone)}</a> : "—"}</p>
              <p><span className="text-muted-foreground">RUC:</span> {detail.item.ruc || "—"}</p>
              <p><span className="text-muted-foreground">Email:</span> {detail.item.email || "—"}</p>
              <p><span className="text-muted-foreground">Dirección:</span> {detail.item.address || "—"}</p>
              {detail.item.notes && <p className="sm:col-span-2"><span className="text-muted-foreground">Notas:</span> {detail.item.notes}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/40"><p className="text-xs text-muted-foreground">Compras</p><strong className="text-xl">{detail.item.ordersCount}</strong></div>
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40"><p className="text-xs text-muted-foreground">Total gastado</p><strong className="text-xl">{money(detail.item.totalSpent)}</strong></div>
            </div>
            {detail.openOrders.length > 0 && <div><h3 className="mb-2 font-semibold">Cuentas abiertas</h3>
              <ul className="space-y-1 text-sm">{detail.openOrders.map((o) => <li key={o.id} className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30"><span>Orden #{o.id} · {typeLabel[o.orderType] ?? o.orderType}</span><strong>{money(o.total)}</strong></li>)}</ul></div>}
            <div>
              <h3 className="mb-2 font-semibold">Últimas compras</h3>
              {detail.sales.length === 0 ? <p className="text-sm text-muted-foreground">Sin compras registradas.</p> :
                <ul className="divide-y rounded-xl border text-sm">{detail.sales.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span>Venta #{s.id} · {s.date ? new Date(s.date).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" }) : ""}<span className="block text-xs text-muted-foreground">{s.itemCount} productos · {typeLabel[s.orderType] ?? "Local"} · {payLabel[s.paymentMethod] ?? s.paymentMethod}</span></span>
                    <span className="flex items-center gap-2"><strong>{money(s.total)}</strong><Button variant="ghost" size="sm" onClick={() => window.open(`/receipt/sale/${s.id}`, "_blank")}>Ticket</Button></span>
                  </li>))}</ul>}
            </div>
            <Button variant="outline" onClick={() => setEditing({ id: detail.item.id, form: { name: detail.item.name, phone: detail.item.phone, ruc: detail.item.ruc, email: detail.item.email, address: detail.item.address, notes: detail.item.notes } })}><Pencil className="mr-2 h-4 w-4" /> Editar datos</Button>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(value) => { if (!value) setEditing(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar cliente" : "Nuevo cliente"}</DialogTitle><DialogDescription>El teléfono identifica al cliente en pedidos y, más adelante, en WhatsApp.</DialogDescription></DialogHeader>
          {editing && <div className="space-y-3">
            {([["name", "Nombre"], ["phone", "Teléfono (WhatsApp)"], ["ruc", "RUC o CI"], ["email", "Email"], ["address", "Dirección"], ["notes", "Notas"]] as const).map(([key, label]) => (
              <label key={key} className="block text-sm font-medium">{label}
                <Input value={editing.form[key]} onChange={(event) => setEditing({ ...editing, form: { ...editing.form, [key]: event.target.value } })} className="mt-1" />
              </label>))}
            <Button className="w-full" onClick={() => void save()} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
