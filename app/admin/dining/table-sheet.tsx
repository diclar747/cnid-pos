"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChefHat, CircleCheck, Clock3, CreditCard, Loader2, Minus, Plus, ReceiptText, Search, ShoppingCart, Trash2, UnlockKeyhole, UserRound, X } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api-client"
import { effectivePrice } from "@/lib/product-price"
import type { DiningTable } from "@/lib/dining-types"
import type { KitchenTicket, ServiceOrder } from "@/lib/service-order-types"
import { useCart, type Product } from "../../context/cart-context"
import { useAuth } from "../../context/auth-context"
import PaymentDialog, { type PaymentTarget } from "../../components/payment-dialog"

// Cuenta de una mesa: lo que pidió (enviado a cocina o por enviar), agregar productos a medida que pide,
// mandar a cocina, precuenta, cobrar y liberar la mesa. Todo sin salir de Mesas.

type Choice = { groupId: number; optionId: number }
type Pending = { key: string; product: Product; quantity: number; options: Choice[]; unit: number; label: string }
const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const since = (iso: string) => { const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min` }
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export function TableSheet({ table, onClose, onChanged }: { table: DiningTable | null; onClose: () => void; onChanged: () => void }) {
  const { products } = useCart()
  const { hasPermission } = useAuth()
  const canCharge = hasPermission("manage_sales")
  const [order, setOrder] = useState<ServiceOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [pending, setPending] = useState<Pending[]>([])
  const [choosing, setChoosing] = useState<Product | null>(null)
  const [customer, setCustomer] = useState("")
  const [pay, setPay] = useState<PaymentTarget | null>(null)

  const load = useCallback(async (orderId: number | null) => {
    if (!orderId) { setOrder(null); return }
    setLoading(true)
    try { setOrder((await apiRequest<{ order: ServiceOrder }>(`/api/service-orders/${orderId}`)).order) }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo abrir la cuenta") } finally { setLoading(false) }
  }, [])
  useEffect(() => { setPending([]); setQuery(""); setCategory("all"); setCustomer("") }, [table?.id])
  useEffect(() => { if (table) void load(table.openOrderId) }, [table?.id, table?.openOrderId, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const available = useMemo(() => products.filter((p) => p.isActive !== false && (p.trackStock === false || p.stock > 0)), [products])
  const categories = useMemo(() => [...new Set(available.map((p) => p.category))].sort((a, b) => a.localeCompare(b, "es")), [available])
  const shown = useMemo(() => {
    const term = normalize(query.trim())
    return available.filter((p) => (category === "all" || p.category === category) && (!term || normalize(`${p.name} ${p.barcode}`).includes(term))).slice(0, 60)
  }, [available, query, category])

  const add = (product: Product, options: Choice[] = []) => {
    const groups = product.modifierGroups ?? []
    const chosen = options.map((c) => groups.find((g) => g.legacyId === c.groupId)?.options.find((o) => o.legacyId === c.optionId)).filter(Boolean) as { name: string; price: number }[]
    const unit = effectivePrice(product, "dineIn") + chosen.reduce((sum, o) => sum + o.price, 0)
    const key = `${product.id}|${options.map((o) => `${o.groupId}:${o.optionId}`).sort().join(",")}`
    setPending((current) => current.some((line) => line.key === key)
      ? current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line)
      : [...current, { key, product, quantity: 1, options, unit, label: chosen.length ? `${product.name} (${chosen.map((o) => o.name).join(", ")})` : product.name }])
  }
  const pick = (product: Product) => { if ((product.modifierGroups ?? []).length) setChoosing(product); else add(product) }
  const change = (key: string, delta: number) => setPending((current) => current.map((line) => line.key === key ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0))

  const save = async (send: boolean) => {
    if (!table || !pending.length) return
    setBusy(send ? "send-new" : "save")
    try {
      const result = await apiRequest<{ order: ServiceOrder; ticket: KitchenTicket | null }>("/api/service-orders", { method: "POST", body: JSON.stringify({
        orderId: order?.id, tableId: table.id, orderType: "dineIn", ...(order ? {} : { customerName: customer }), sendToKitchen: send,
        items: pending.map((line) => ({ id: line.product.id, quantity: line.quantity, selectedModifiers: line.options })) }) })
      setOrder(result.order); setPending([])
      toast.success(send ? "Enviado a cocina" : "Agregado a la cuenta de la mesa")
      onChanged()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo agregar") } finally { setBusy(null) }
  }
  const act = async (action: "send" | "bill" | "cancel", extra: Record<string, unknown> = {}) => {
    if (!order) return
    const printWindow = action === "bill" ? window.open("", "_blank") : null
    setBusy(action)
    try {
      const result = await apiRequest<{ order: ServiceOrder }>(`/api/service-orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ action, ...extra }) })
      if (printWindow) printWindow.location.href = `/receipt/bill/${order.id}?auto=1`
      if (action === "cancel") { toast.success(`${table?.label} liberada`); onChanged(); onClose(); return }
      setOrder(result.order); onChanged()
      toast.success(action === "send" ? "Enviado a cocina" : "Precuenta lista")
    } catch (error) { printWindow?.close(); toast.error(error instanceof Error ? error.message : "No se pudo completar") } finally { setBusy(null) }
  }
  const release = () => {
    if (!order) return
    if (!order.items.length) { void act("cancel", { reason: "Mesa liberada sin consumos" }); return }
    const reason = window.prompt(`¿Liberar ${table?.label} sin cobrar? La cuenta se cancela y se devuelve el stock. Escribí el motivo:`, "Se retiraron sin consumir")
    if (reason !== null) void act("cancel", { reason })
  }

  if (!table) return null
  const sent = order?.items.filter((line) => line.ticketId != null) ?? []
  const drafts = order?.items.filter((line) => line.ticketId == null) ?? []
  const pendingTotal = pending.reduce((sum, line) => sum + line.unit * line.quantity, 0)

  return <>
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={`Cuenta de ${table.label}`} onClick={(event) => event.stopPropagation()}
        className="flex h-dvh w-full max-w-5xl flex-col bg-slate-50 shadow-2xl animate-in slide-in-from-right-8 dark:bg-slate-950 lg:flex-row">
        {/* Cuenta de la mesa */}
        <div className="flex min-h-0 shrink-0 flex-col border-b bg-white dark:bg-slate-900 lg:w-[24rem] lg:border-b-0 lg:border-r">
          <header className="flex items-start justify-between gap-3 bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/75">{table.roomName} · {table.seats} sillas</p>
              <h2 className="text-2xl font-black">{table.label}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/85">
                {order ? <><span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">Cuenta #{order.id}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{since(order.createdAt)}</span>
                  {order.waiterName && <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{order.waiterName}</span>}</>
                  : <span className="rounded-full bg-emerald-400/30 px-2 py-0.5 text-xs font-bold">Libre</span>}
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/15" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 max-lg:max-h-[40dvh]">
            {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
              : !order ? <div className="space-y-3">
                <p className="text-sm text-muted-foreground">La mesa está libre. Elegí los productos a la derecha para abrir la cuenta.</p>
                <input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Nombre del cliente (opcional)" className="h-10 w-full rounded-xl border bg-background px-3 text-sm" />
              </div>
              : <div className="space-y-4">
                {order.customerName && <p className="text-sm text-muted-foreground">Cliente: <span className="font-medium text-foreground">{order.customerName}</span></p>}
                {drafts.length > 0 && <Lines title="Por enviar a cocina" tone="text-amber-700" lines={drafts} />}
                {sent.length > 0 && <Lines title="En cocina / servido" tone="text-emerald-700" lines={sent} />}
                {!order.items.length && <p className="text-sm text-muted-foreground">Cuenta abierta sin productos todavía.</p>}
              </div>}
          </div>

          {order && <footer className="space-y-2 border-t p-4">
            <p className="flex items-center justify-between text-lg font-black"><span>Total</span><span className="tabular-nums">{money(order.grandTotal)}</span></p>
            {order.billedAt && <p className="text-xs text-indigo-700">Precuenta impresa {new Date(order.billedAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}</p>}
            <div className="grid grid-cols-2 gap-2">
              {drafts.length > 0 && <Button onClick={() => void act("send")} disabled={busy !== null} className="col-span-2 bg-amber-600 text-white hover:bg-amber-700"><ChefHat className="mr-1 h-4 w-4" />Enviar a cocina ({drafts.reduce((s, l) => s + l.quantity, 0)})</Button>}
              <Button variant="outline" onClick={() => void act("bill")} disabled={busy !== null || !order.items.length}><ReceiptText className="mr-1 h-4 w-4" />Precuenta</Button>
              {canCharge ? <Button onClick={() => setPay({ kind: "order", orderId: order.id })} disabled={busy !== null || !order.items.length} className="bg-emerald-600 text-white hover:bg-emerald-700"><CreditCard className="mr-1 h-4 w-4" />Cobrar</Button>
                : <Link href={`/pos?order=${order.id}`} className="inline-flex items-center justify-center rounded-md border text-sm font-medium"><ShoppingCart className="mr-1 h-4 w-4" />Abrir en POS</Link>}
              {canCharge && <Button variant="ghost" onClick={release} disabled={busy !== null} className="col-span-2 text-red-600 hover:bg-red-50 hover:text-red-700"><UnlockKeyhole className="mr-1 h-4 w-4" />Liberar mesa sin cobrar</Button>}
            </div>
          </footer>}
        </div>

        {/* Agregar productos */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="space-y-2 border-b bg-white p-3 dark:bg-slate-900">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto o código…" className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:border-indigo-400" /></div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              {["all", ...categories].map((name) => <button key={name} type="button" onClick={() => setCategory(name)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${category === name ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{name === "all" ? "Todos" : name}</button>)}
            </div>
          </div>
          <div data-products className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((product) => <button key={product.id} type="button" onClick={() => pick(product)}
              className="group flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md dark:bg-slate-900">
              <span className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">{product.image && !product.image.includes("placeholder") ? <img src={product.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : null}
                <span className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white opacity-90 shadow group-hover:scale-110"><Plus className="h-4 w-4" /></span></span>
              <span className="flex flex-1 flex-col p-2"><span className="line-clamp-2 text-xs font-semibold leading-tight">{product.name}</span>
                <span className="mt-auto pt-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">{money(effectivePrice(product, "dineIn"))}</span></span>
            </button>)}
            {shown.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">Sin productos con esa búsqueda.</p>}
          </div>
          {pending.length > 0 && <div className="border-t bg-white p-3 shadow-[0_-8px_20px_rgba(15,23,42,.06)] dark:bg-slate-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Para agregar a {table.label}</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">{pending.map((line) => <li key={line.key} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{line.label}</span>
              <span className="inline-flex items-center rounded-full border"><button type="button" onClick={() => change(line.key, -1)} className="p-1" aria-label="Quitar uno">{line.quantity === 1 ? <Trash2 className="h-3.5 w-3.5 text-red-600" /> : <Minus className="h-3.5 w-3.5" />}</button>
                <span className="w-6 text-center font-semibold">{line.quantity}</span><button type="button" onClick={() => change(line.key, 1)} className="p-1" aria-label="Agregar uno"><Plus className="h-3.5 w-3.5" /></button></span>
              <span className="w-20 text-right tabular-nums">{money(line.unit * line.quantity)}</span></li>)}</ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => void save(false)} disabled={busy !== null}>{busy === "save" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}Agregar · {money(pendingTotal)}</Button>
              <Button onClick={() => void save(true)} disabled={busy !== null} className="bg-amber-600 text-white hover:bg-amber-700">{busy === "send-new" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ChefHat className="mr-1 h-4 w-4" />}Agregar y enviar</Button>
            </div>
          </div>}
        </div>
      </section>
    </div>
    {choosing && <OptionsPicker product={choosing} onClose={() => setChoosing(null)} onPick={(options) => { add(choosing, options); setChoosing(null) }} />}
    <PaymentDialog target={pay} onClose={() => setPay(null)} onPaid={() => { toast.success(`${table.label} cobrada y liberada`); onChanged() ; setOrder(null) }} />
  </>
}

function Lines({ title, tone, lines }: { title: string; tone: string; lines: ServiceOrder["items"] }) {
  return <div>
    <p className={`mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide ${tone}`}>{tone.includes("emerald") ? <CircleCheck className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{title}</p>
    <ul className="divide-y text-sm dark:divide-slate-800">{lines.map((line) => <li key={line.lineId} className="flex justify-between gap-2 py-1.5">
      <span><span className="font-semibold">{line.quantity} ×</span> {line.productName}{line.modifiers.length > 0 && <span className="block text-xs text-muted-foreground">{line.modifiers.map((m) => m.name).join(", ")}</span>}</span>
      <span className="shrink-0 tabular-nums">{money(line.subtotal)}</span></li>)}</ul>
  </div>
}

function OptionsPicker({ product, onClose, onPick }: { product: Product; onClose: () => void; onPick: (options: Choice[]) => void }) {
  const groups = product.modifierGroups ?? []
  const [picked, setPicked] = useState<Record<number, number[]>>({})
  const toggle = (groupId: number, optionId: number, multiple: boolean) => setPicked((current) => {
    const list = current[groupId] ?? []
    return { ...current, [groupId]: multiple ? (list.includes(optionId) ? list.filter((id) => id !== optionId) : [...list, optionId]) : (list[0] === optionId ? [] : [optionId]) }
  })
  const missing = groups.find((group) => group.required && !(picked[group.legacyId]?.length))
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-label={product.name} onClick={(event) => event.stopPropagation()} className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
      <div className="mb-3 flex items-start justify-between"><h3 className="text-lg font-black">{product.name}</h3><button type="button" onClick={onClose} className="rounded-full p-1" aria-label="Cerrar"><X className="h-5 w-5" /></button></div>
      <div className="space-y-4">{groups.map((group) => <fieldset key={group.legacyId}>
        <legend className="mb-1.5 text-sm font-bold">{group.name} <span className="text-xs font-normal text-muted-foreground">{group.required ? "· obligatorio" : group.multiple ? "· varios" : "· opcional"}</span></legend>
        <div className="grid grid-cols-2 gap-1.5">{group.options.map((option) => {
          const on = (picked[group.legacyId] ?? []).includes(option.legacyId)
          return <button key={option.legacyId} type="button" onClick={() => toggle(group.legacyId, option.legacyId, group.multiple)}
            className={`rounded-xl border px-2.5 py-2 text-left text-xs ${on ? "border-indigo-500 bg-indigo-50 font-semibold dark:bg-indigo-950/40" : ""}`}>{option.name}{option.price ? <span className="block text-muted-foreground">+ {money(option.price)}</span> : null}</button>
        })}</div>
      </fieldset>)}</div>
      <Button className="mt-4 w-full" disabled={Boolean(missing)} onClick={() => onPick(groups.flatMap((g) => (picked[g.legacyId] ?? []).map((optionId) => ({ groupId: g.legacyId, optionId }))))}>
        {missing ? `Elegí ${missing.name.toLowerCase()}` : "Agregar"}</Button>
    </div>
  </div>
}
