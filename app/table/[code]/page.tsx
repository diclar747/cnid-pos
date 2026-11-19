"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Armchair, CheckCircle2, ChefHat, Minus, Plus, Search, ShoppingBag, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AppExtras, OrderProgress, QuickRequest, ServiceActions, useGuestToast, useTicketChanges, type TableCall, type TableTicket } from "./table-service"

// Estado de cada producto para el cliente: por aceptar (el mozo lo confirma), en cocina, listo o servido.
const LINE_STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: "Esperando que el mozo lo acepte", tone: "bg-amber-100 text-amber-800" },
  pending: { label: "En cocina", tone: "bg-sky-100 text-sky-800" }, preparing: { label: "Preparando", tone: "bg-orange-100 text-orange-800" },
  ready: { label: "¡Listo!", tone: "bg-emerald-100 text-emerald-800" }, served: { label: "Servido", tone: "bg-slate-100 text-slate-700" },
  delivered: { label: "Entregado", tone: "bg-slate-100 text-slate-700" }, cancelled: { label: "Cancelado", tone: "bg-red-100 text-red-700" },
}

type Option = { legacyId: number; name: string; price: number }
type Group = { legacyId: number; name: string; required: boolean; multiple: boolean; options: Option[] }
type MenuProduct = { id: number; name: string; description: string; category: string; menuName?: string; image: string; price: number; regularPrice?: number; prepMinutes?: number | null;
  stock: number; trackStock?: boolean; modifierGroups: Group[] }
type CartLine = { key: string; product: MenuProduct; quantity: number; selectedModifiers: { groupId: number; optionId: number; name: string; price: number }[]; unitPrice: number }
type MenuData = { restaurant: string; table: { id: number; label: string; roomName: string; seats: number; imageData: string };
  products: MenuProduct[]; calls: TableCall[]; order: { id: number; total: number; billedAt: string | null; tickets: TableTicket[]; items: { lineId: string; ticketId: number | null; productName: string; quantity: number; subtotal: number; modifiers: { name: string }[] }[] } | null }
const money = (value: number) => `Gs ${value.toLocaleString("es-PY")}`

export default function TableMenuPage() {
  const code = String(useParams().code ?? "")
  const [data, setData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("Todos")
  const [visibleLimit, setVisibleLimit] = useState(24)
  const [cart, setCart] = useState<CartLine[]>([])
  const [showCart, setShowCart] = useState(false)
  const [configuring, setConfiguring] = useState<MenuProduct | null>(null)
  const [selected, setSelected] = useState<Record<number, number[]>>({})
  const [customerName, setCustomerName] = useState("")
  const [notes, setNotes] = useState("")
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState("")
  const pendingRequestId = useRef<string | null>(null)
  const toast = useGuestToast()
  const load = useCallback(async (silent = false) => {
    try {
      const response = await fetch(`/api/table/${encodeURIComponent(code)}`, { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "No se pudo abrir el menú.")
      setData(result); setError("")
    } catch (cause) { if (!silent) setError(cause instanceof Error ? cause.message : "No se pudo abrir el menú.") }
    finally { setLoading(false) }
  }, [code])
  useEffect(() => { void load() }, [load])
  // Estado en vivo: se consulta cada 8 s mientras la página está visible y al volver a ella.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void load(true) }
    const timer = window.setInterval(refresh, 8000)
    document.addEventListener("visibilitychange", refresh)
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh) }
  }, [load])
  useTicketChanges(data?.order?.tickets, toast.show)
  const categories = useMemo(() => ["Todos", ...new Set((data?.products ?? []).map((product) => product.category).filter(Boolean))], [data?.products])
  const visible = useMemo(() => (data?.products ?? []).filter((product) =>
    (category === "Todos" || product.category === category) && (!search.trim() ||
      `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")))), [data?.products, category, search])
  useEffect(() => { setVisibleLimit(24) }, [category, search])
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const total = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const add = (product: MenuProduct, modifiers: CartLine["selectedModifiers"] = []) => {
    const key = `${product.id}:${modifiers.map((item) => `${item.groupId}-${item.optionId}`).sort().join(",")}`
    const unitPrice = product.price + modifiers.reduce((sum, item) => sum + item.price, 0)
    setCart((current) => {
      const existing = current.find((item) => item.key === key)
      if (existing) return current.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1 } : item)
      return [...current, { key, product, quantity: 1, selectedModifiers: modifiers, unitPrice }]
    })
    pendingRequestId.current = null
    setConfiguring(null); setSelected({}); setSuccess("")
  }
  const choose = (product: MenuProduct) => product.modifierGroups?.length ? (setSelected({}), setConfiguring(product)) : add(product)
  const confirmProduct = () => {
    if (!configuring) return
    const modifiers: CartLine["selectedModifiers"] = []
    for (const group of configuring.modifierGroups) {
      const ids = selected[group.legacyId] ?? []
      if (group.required && !ids.length) { setError(`Elegí una opción de ${group.name}.`); return }
      for (const option of group.options) if (ids.includes(option.legacyId)) modifiers.push({ groupId: group.legacyId,
        optionId: option.legacyId, name: option.name, price: option.price })
    }
    setError(""); add(configuring, modifiers)
  }
  const send = async () => {
    if (!cart.length || sending) return
    setSending(true); setError("")
    pendingRequestId.current ??= crypto.randomUUID()
    try {
      const response = await fetch(`/api/table/${encodeURIComponent(code)}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: pendingRequestId.current, customerName, notes, items: cart.map((item) => ({ id: item.product.id, quantity: item.quantity,
          selectedModifiers: item.selectedModifiers })) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "No se pudo enviar el pedido.")
      pendingRequestId.current = null; setCart([]); setNotes(""); setShowCart(false)
      setSuccess(result.pendingApproval ? "¡Pedido enviado! El mozo lo confirma en un momento y pasa a cocina." : `Pedido enviado a cocina · orden #${result.orderId}`)
      await load()
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo enviar el pedido.") }
    finally { setSending(false) }
  }
  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Cargando menú…</main>
  if (!data) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center"><div><h1 className="text-2xl font-bold">Mesa no disponible</h1><p className="mt-2 text-slate-600">{error}</p><Button className="mt-4" onClick={() => void load()}>Reintentar</Button></div></main>
  return <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50 pb-28 text-slate-900">
    {toast.node}
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Menú para pedir</p><h1 className="text-lg font-black">{data.restaurant}</h1></div><div className="flex items-center gap-2"><a href="/cuenta" className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs font-semibold text-indigo-700" title="Ingresá para guardar este pedido en tu historial">Mi cuenta</a><div className="rounded-xl bg-indigo-50 px-3 py-2 text-right text-xs text-indigo-900"><span className="block font-bold">{data.table.label}</span><span>{data.table.roomName}</span></div></div></div></header>
    <div className="mx-auto max-w-6xl px-4">
      <section className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-blue-600 p-6 text-white shadow-xl shadow-indigo-300/40 sm:p-8" style={data.table.imageData ? { backgroundImage: `linear-gradient(90deg,rgba(30,27,75,.88),rgba(49,46,129,.45)),url(${data.table.imageData})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
        <div className="relative"><span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><Armchair className="h-3.5 w-3.5" /> {data.table.seats} lugares</span><h2 className="mt-3 text-3xl font-black sm:text-4xl">Pedí desde tu mesa</h2><p className="mt-2 max-w-lg text-sm text-white/80">Elegí tus platos y bebidas cuando quieras: el mozo confirma cada pedido y lo seguís acá. Pagás cuando termine tu visita.</p></div>
      </section>
      {success && <div role="status" className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" /> {success}</div>}
      {error && <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {data.order && <OrderProgress tickets={data.order.tickets} />}
      <ServiceActions code={code} calls={data.calls} hasOrder={Boolean(data.order)} billed={Boolean(data.order?.billedAt)} onCalled={() => void load(true)} notify={toast.show} />
      <QuickRequest code={code} calls={data.calls} onSent={() => void load(true)} notify={toast.show} products={data.products}
        onPick={(product) => { choose(product); if (!product.modifierGroups?.length) toast.show(`Agregado: ${product.name}. Tocá «Ver pedido» para enviarlo.`) }} />
      <AppExtras code={code} orderId={data.order?.id ?? null} notify={toast.show} />
      {data.order && data.order.items.length > 0 && <section className="mt-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm" aria-label="Lo que pediste">
        <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Lo que pediste</h3><span className="text-sm font-bold text-indigo-700">{money(data.order.total)}</span></div>
        <ul className="mt-3 divide-y text-sm">{[...data.order.items].reverse().map((item) => {
          const status = item.ticketId == null ? "draft" : data.order!.tickets.find((ticket) => ticket.id === item.ticketId)?.status ?? "pending"
          const badge = LINE_STATUS[status] ?? LINE_STATUS.pending
          return <li key={item.lineId} className="flex items-start justify-between gap-3 py-2">
            <span className="min-w-0"><span className="font-semibold">{item.quantity} ×</span> {item.productName}{item.modifiers.length ? <span className="block text-xs text-slate-500">{item.modifiers.map((mod) => mod.name).join(", ")}</span> : null}
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.tone}`}>{badge.label}</span></span>
            <strong className="shrink-0">{money(item.subtotal)}</strong></li>
        })}</ul>
        <p className="mt-2 text-xs text-slate-500">Cuenta de {data.table.label} · orden #{data.order.id}. Podés seguir pidiendo: se suma a esta cuenta.</p>
      </section>}
      <div className="mb-4 mt-7 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Carta del día</p><h2 className="text-2xl font-black">Elegí tus favoritos</h2></div><p className="text-sm text-slate-500">{data.products.length} productos disponibles</p></div>
      <div className="relative mb-4"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar comida o bebida…" className="h-12 rounded-2xl border-indigo-100 bg-white pl-11 shadow-sm" /></div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${category === item ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "border border-slate-200 bg-white text-slate-600"}`}>{item}</button>)}</div>
      {visible.length ? <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.slice(0, visibleLimit).map((product) => <article key={product.id} className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-indigo-100 to-rose-100"><img src={product.image || "/placeholder.svg"} alt={product.name} className="h-full w-full object-cover" loading="lazy" />{product.regularPrice != null && product.regularPrice > product.price && <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white shadow">Promo</span>}<span className="absolute bottom-3 right-3 rounded-full bg-slate-900/85 px-3 py-1 text-sm font-bold text-white">{product.regularPrice != null && product.regularPrice > product.price && <span className="mr-1.5 text-xs font-medium line-through opacity-70">{money(product.regularPrice)}</span>}{money(product.price)}</span></div><div className="p-4"><p className="text-xs font-bold uppercase text-indigo-600">{product.category}</p><h3 className="mt-1 min-h-12 text-lg font-bold leading-tight">{product.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{product.description || "Preparado para vos"}</p>{product.prepMinutes ? <p className="mt-1 text-xs font-medium text-slate-500">⏱ ~{product.prepMinutes} min</p> : null}<Button className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600" onClick={() => choose(product)}><Plus className="mr-1 h-4 w-4" /> Agregar</Button></div></article>)}</div>{visible.length > visibleLimit && <div className="mt-6 text-center"><Button variant="outline" className="rounded-xl" onClick={() => setVisibleLimit((current) => current + 24)}>Mostrar más productos ({visible.length - visibleLimit} restantes)</Button></div>}</> : <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">No encontramos productos con esa búsqueda.</div>}
    </div>
    <button type="button" onClick={() => setShowCart(true)} className="fixed bottom-4 left-4 right-4 z-20 mx-auto flex max-w-lg items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-700 px-5 py-4 text-white shadow-2xl shadow-indigo-400/50"><span className="flex items-center gap-2 font-bold"><ShoppingBag className="h-5 w-5" /> Ver pedido {count > 0 && <span className="rounded-full bg-white/20 px-2">{count}</span>}</span><strong>{money(total)}</strong></button>
    {showCart && <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowCart(false)}><section role="dialog" aria-modal="true" aria-label="Tu pedido" className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] max-w-xl flex-col rounded-t-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b p-5"><div><p className="text-xs font-bold uppercase text-indigo-600">{data.table.label}</p><h2 className="text-xl font-black">Tu pedido</h2></div><button type="button" onClick={() => setShowCart(false)} aria-label="Cerrar carrito"><X className="h-5 w-5" /></button></div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">{cart.length ? cart.map((item) => <div key={item.key} className="rounded-2xl border p-3"><div className="flex justify-between gap-3"><div><p className="font-semibold">{item.product.name}</p><p className="text-xs text-slate-500">{item.selectedModifiers.map((mod) => mod.name).join(", ")}</p></div><strong>{money(item.unitPrice * item.quantity)}</strong></div><div className="mt-3 flex items-center gap-3"><Button size="icon" variant="outline" onClick={() => setCart((current) => current.map((line) => line.key === item.key ? { ...line, quantity: line.quantity - 1 } : line).filter((line) => line.quantity > 0))} aria-label={`Quitar ${item.product.name}`}><Minus className="h-4 w-4" /></Button><span>{item.quantity}</span><Button size="icon" variant="outline" onClick={() => setCart((current) => current.map((line) => line.key === item.key ? { ...line, quantity: line.quantity + 1 } : line))} aria-label={`Agregar ${item.product.name}`}><Plus className="h-4 w-4" /></Button></div></div>) : <p className="py-10 text-center text-slate-500">Tu pedido está vacío. Elegí un producto para comenzar.</p>}{cart.length > 0 && <><label className="block text-sm font-semibold">Tu nombre (opcional)<Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={120} className="mt-1" /></label><label className="block text-sm font-semibold">Indicaciones para cocina (opcional)<Input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={300} className="mt-1" /></label></>}</div><div className="border-t bg-white p-5"><div className="mb-3 flex justify-between font-bold"><span>Total nuevo pedido</span><span>{money(total)}</span></div>{error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}<Button className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600" disabled={!cart.length || sending} onClick={() => void send()}><ChefHat className="mr-2 h-4 w-4" /> {sending ? "Enviando…" : data.order ? "Pedir esto también" : "Enviar pedido"}</Button><p className="mt-2 text-center text-xs text-slate-500">El cobro se realiza en el local.</p></div></section></div>}
    {configuring && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center" onClick={() => setConfiguring(null)}><section role="dialog" aria-modal="true" aria-label={`Opciones de ${configuring.name}`} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h2 className="text-xl font-black">{configuring.name}</h2><p className="text-sm text-slate-500">Personalizá tu pedido</p></div><button type="button" onClick={() => setConfiguring(null)} aria-label="Cerrar opciones"><X className="h-5 w-5" /></button></div>{configuring.modifierGroups.map((group) => <fieldset key={group.legacyId} className="mt-5 rounded-2xl border p-4"><legend className="px-2 text-sm font-bold">{group.name}{group.required ? " · obligatorio" : ""}</legend>{!group.required && !group.multiple && <label className="flex items-center gap-3 py-2 text-sm"><input type="radio" checked={!(selected[group.legacyId]?.length)} onChange={() => setSelected((current) => ({ ...current, [group.legacyId]: [] }))} /> Sin agregado</label>}{group.options.map((option) => { const checked = (selected[group.legacyId] ?? []).includes(option.legacyId); return <label key={option.legacyId} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="flex items-center gap-3"><input type={group.multiple ? "checkbox" : "radio"} checked={checked} onChange={() => setSelected((current) => ({ ...current, [group.legacyId]: group.multiple ? checked ? (current[group.legacyId] ?? []).filter((id) => id !== option.legacyId) : [...(current[group.legacyId] ?? []), option.legacyId] : [option.legacyId] }))} /> {option.name}</span><span className="font-semibold">{option.price ? `+ ${money(option.price)}` : "Incluido"}</span></label> })}</fieldset>)}{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}<Button className="mt-5 h-12 w-full rounded-xl" onClick={confirmProduct}>Agregar · {money(configuring.price + configuring.modifierGroups.reduce((sum, group) => sum + group.options.filter((option) => (selected[group.legacyId] ?? []).includes(option.legacyId)).reduce((acc, option) => acc + option.price, 0), 0))}</Button></section></div>}
  </main>
}
