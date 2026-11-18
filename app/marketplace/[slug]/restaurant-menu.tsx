"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bike, Clock3, ExternalLink, Globe, Loader2, LocateFixed, MapPin, MessageCircle, Minus, Navigation, Phone, Plus, Search, ShoppingBag, SlidersHorizontal, Store, Tag, Trash2,
  UtensilsCrossed, X } from "lucide-react"
import type { MarketplaceProduct, MarketplaceRestaurant, MarketplaceZone } from "@/lib/marketplace"
import { Logo, OpenBadge, whatsappLink } from "../marketplace-list"
import { CustomerAuthForm, customerApi, useCustomer } from "../../cuenta/customer-auth"

type Choice = { groupId: number; optionId: number }
type Line = { key: string; id: number; quantity: number; options: Choice[] }
const lineKey = (id: number, options: Choice[]) => `${id}|${options.map((o) => `${o.groupId}:${o.optionId}`).sort().join(",")}`

const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const slugify = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "otros"
const todayName = () => ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: "America/Asuncion", weekday: "short" }).format(new Date()))]

export default function RestaurantMenu({ restaurant, products, zones }: { restaurant: MarketplaceRestaurant; products: MarketplaceProduct[]; zones: MarketplaceZone[] }) {
  const [query, setQuery] = useState("")
  const [current, setCurrent] = useState("")
  const [cart, setCart] = useState<Line[]>([])
  const [showOrder, setShowOrder] = useState(false)
  const [configuring, setConfiguring] = useState<MarketplaceProduct | null>(null)
  const [checkout, setCheckout] = useState(false)
  const storageKey = `restopos:marketplace-cart:${restaurant.slug}`
  const chipsRef = useRef<HTMLDivElement>(null)

  // El pedido armado se recuerda en este navegador por si la persona vuelve a la página.
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]"); if (Array.isArray(saved)) setCart(saved.filter((line) => line && Number.isSafeInteger(line.id) && line.quantity > 0)) } catch { /* sin almacenamiento */ } }, [storageKey])
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(cart)) } catch { /* sin almacenamiento */ } }, [cart, storageKey])

  const groups = useMemo(() => {
    const term = normalize(query.trim())
    const map = new Map<string, MarketplaceProduct[]>()
    for (const product of products) {
      if (term && !normalize(`${product.name} ${product.description} ${product.category}`).includes(term)) continue
      map.set(product.category, [...(map.get(product.category) ?? []), product])
    }
    const promos = products.filter((p) => p.price < p.regularPrice && (!term || normalize(p.name).includes(term)))
    const list = [...map.entries()].map(([name, items]) => ({ id: slugify(name), name, items }))
    return promos.length && !term ? [{ id: "promos", name: "Promociones", items: promos }, ...list] : list
  }, [products, query])

  // Resalta la categoría visible mientras se recorre el menú.
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setCurrent(visible.target.id.replace(/^cat-/, ""))
    }, { rootMargin: "-140px 0px -60% 0px" })
    groups.forEach((group) => { const el = document.getElementById(`cat-${group.id}`); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [groups])
  useEffect(() => { chipsRef.current?.querySelector(`[data-cat="${current}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }) }, [current])

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const lines = cart.map((line) => {
    const product = byId.get(line.id)
    if (!product) return null
    const chosen = line.options.map((choice) => product.groups.find((g) => g.id === choice.groupId)?.options.find((o) => o.id === choice.optionId)).filter((o): o is { id: number; name: string; price: number } => Boolean(o))
    if (chosen.length !== line.options.length) return null
    const unit = product.price + chosen.reduce((sum, option) => sum + option.price, 0)
    return { ...line, product, unit, label: chosen.length ? `${product.name} (${chosen.map((o) => o.name).join(", ")})` : product.name }
  }).filter((line): line is NonNullable<typeof line> => line !== null)
  const count = lines.reduce((sum, line) => sum + line.quantity, 0)
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unit, 0)
  const addLine = (id: number, options: Choice[], quantity = 1) => setCart((current) => {
    const key = lineKey(id, options)
    const found = current.find((line) => line.key === key)
    return found ? current.map((line) => line.key === key ? { ...line, quantity: Math.min(50, line.quantity + quantity) } : line) : [...current, { key, id, quantity, options }]
  })
  const changeLine = (key: string, delta: number) => setCart((current) => current.map((line) => line.key === key ? { ...line, quantity: Math.min(50, line.quantity + delta) } : line).filter((line) => line.quantity > 0))
  const quantityOf = (id: number) => cart.filter((line) => line.id === id).reduce((sum, line) => sum + line.quantity, 0)
  const changeProduct = (product: MarketplaceProduct, delta: number) => {
    if (delta > 0) { if (product.groups.length) setConfiguring(product); else addLine(product.id, []) ; return }
    const last = [...cart].reverse().find((line) => line.id === product.id)
    if (last) changeLine(last.key, -1)
  }

  const message = [`Hola ${restaurant.name}! Quiero hacer un pedido (lo armé en RestoPOS):`, "",
    ...lines.map((line) => `• ${line.quantity} × ${line.label} — ${money(line.quantity * line.unit)}`), "",
    `Total estimado: ${money(total)}`, "¿Me confirman disponibilidad? Es para (delivery / retiro):"].join("\n")
  const directions = restaurant.mapsUrl || (restaurant.latitude != null && restaurant.longitude != null ? `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}` : "")
  const today = todayName()
  const modes = [restaurant.serviceModes.delivery && { label: "Delivery", icon: Bike }, restaurant.serviceModes.pickup && { label: "Retiro en el local", icon: ShoppingBag },
    restaurant.serviceModes.dineIn && { label: "Comer en el local", icon: Store }].filter(Boolean) as { label: string; icon: typeof Bike }[]

  return (
    <main className="pb-28">
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0">
          {restaurant.cover ? <img src={restaurant.cover} alt="" className="h-full w-full object-cover" /> : null}
          <div className="absolute inset-0" style={{ background: restaurant.cover ? `linear-gradient(90deg, ${restaurant.color}f2 0%, ${restaurant.color}b3 38%, #0f172a66 75%, #0f172a33 100%)` : `linear-gradient(135deg, ${restaurant.color}, #0f172a 70%)` }} />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pb-10">
          <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"><ArrowLeft className="h-4 w-4" /> Todos los restaurantes</Link>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end">
            <Logo restaurant={restaurant} size="h-24 w-24 text-4xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><OpenBadge open={restaurant.openNow} />{restaurant.todayHours && <span className="text-sm text-white/80">{restaurant.todayHours}</span>}</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{restaurant.name}</h1>
              {(restaurant.slogan || restaurant.businessType) && <p className="mt-1 text-lg text-white/85">{restaurant.slogan || restaurant.businessType}</p>}
            </div>
          </div>
          {restaurant.description && <p className="mt-4 max-w-3xl text-white/85">{restaurant.description}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            {restaurant.whatsapp && <a href={whatsappLink(restaurant.whatsapp, `Hola ${restaurant.name}! Vi su menú en RestoPOS y quiero hacer un pedido.`)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 font-semibold shadow-lg shadow-emerald-900/30 hover:bg-emerald-600"><MessageCircle className="h-5 w-5" /> Pedir por WhatsApp</a>}
            {restaurant.phone && <a href={`tel:${restaurant.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 font-medium backdrop-blur hover:bg-white/25"><Phone className="h-4 w-4" /> Llamar</a>}
            {directions && <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 font-medium backdrop-blur hover:bg-white/25"><Navigation className="h-4 w-4" /> Cómo llegar</a>}
            {restaurant.website && <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 font-medium backdrop-blur hover:bg-white/25"><Globe className="h-4 w-4" /> Sitio web</a>}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <div className="sticky top-16 z-30 -mx-4 space-y-2 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white/95 sm:px-3 dark:border-slate-800 dark:bg-slate-950/95 sm:dark:bg-slate-900/95">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar en el menú de ${restaurant.name}…`} aria-label="Buscar en el menú"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900" />
            </div>
            <div ref={chipsRef} className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              {groups.map((group) => <a key={group.id} href={`#cat-${group.id}`} data-cat={group.id}
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition ${current === group.id ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}>
                {group.id === "promos" && <Tag className="mr-1 inline h-3.5 w-3.5" />}{group.name}</a>)}
            </div>
          </div>

          {groups.length === 0 && <div className="py-20 text-center text-slate-500"><UtensilsCrossed className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-2">{products.length ? "No encontramos platos con esa búsqueda." : "Este restaurante todavía no publicó su menú."}</p></div>}
          {groups.map((group) => <section key={group.id} id={`cat-${group.id}`} className="scroll-mt-40 pt-6">
            <h2 className="mb-3 flex items-baseline gap-2 text-xl font-bold">{group.name}<span className="text-sm font-normal text-slate-500">{group.items.length}</span></h2>
            <div className="grid gap-3 md:grid-cols-2">
              {group.items.map((product) => <ProductCard key={`${group.id}-${product.id}`} product={product} quantity={quantityOf(product.id)} onChange={(delta) => changeProduct(product, delta)} canOrder />)}
            </div>
          </section>)}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold">Información</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {restaurant.address && <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" /><span>{restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ""}
                {directions && <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1 text-indigo-600 hover:underline">Ver en el mapa <ExternalLink className="h-3 w-3" /></a>}</span></li>}
              {restaurant.phone && <li className="flex gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" /><a href={`tel:${restaurant.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">{restaurant.phone}</a></li>}
              {restaurant.whatsapp && <li className="flex gap-2.5"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><a href={`https://wa.me/${restaurant.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{restaurant.whatsapp.startsWith("595") ? `+595 ${restaurant.whatsapp.slice(3, 6)} ${restaurant.whatsapp.slice(6)}` : `+${restaurant.whatsapp}`}</a></li>}
            </ul>
            {modes.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{modes.map(({ label, icon: Icon }) => <span key={label} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"><Icon className="h-3.5 w-3.5" />{label}</span>)}</div>}
          </div>
          {restaurant.openingHours.length === 7 && <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 font-bold"><Clock3 className="h-4 w-4 text-indigo-500" /> Horarios</h2>
            <ul className="mt-3 space-y-1 text-sm">{restaurant.openingHours.map((day) => <li key={day.day} className={`flex justify-between rounded-lg px-2 py-1 ${day.day === today ? "bg-indigo-50 font-semibold text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100" : ""}`}>
              <span>{day.day}</span><span className={day.closed ? "text-slate-400" : ""}>{day.closed ? "Cerrado" : `${day.open} – ${day.close}`}</span></li>)}</ul>
          </div>}
          <p className="px-1 text-xs text-slate-500">Precios para retirar en el local; el delivery puede tener costo de envío. El restaurante confirma tu pedido y lo seguís desde <Link href="/cuenta" className="font-semibold text-indigo-600 hover:underline">Mi cuenta</Link>.</p>
        </aside>
      </div>

      {count > 0 && <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4">
        <div className="mx-auto max-w-3xl">
          {showOrder && <div className="mb-2 max-h-[50vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between"><p className="font-bold">Tu pedido</p>
              <button type="button" onClick={() => setShowOrder(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar detalle"><X className="h-4 w-4" /></button></div>
            <ul className="divide-y text-sm dark:divide-slate-800">{lines.map((line) => <li key={line.key} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate">{line.label}</span>
              <Stepper quantity={line.quantity} onChange={(delta) => changeLine(line.key, delta)} />
              <span className="w-24 text-right font-semibold tabular-nums">{money(line.quantity * line.unit)}</span></li>)}</ul>
            <button type="button" onClick={() => { setCart([]); setShowOrder(false) }} className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Vaciar</button>
          </div>}
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900 p-2 pl-4 text-white shadow-2xl dark:bg-white dark:text-slate-900">
            <button type="button" onClick={() => setShowOrder((value) => !value)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 font-bold dark:bg-slate-900/10">{count}</span>
              <span className="min-w-0"><span className="block text-xs opacity-70">{showOrder ? "Ocultar detalle" : "Ver pedido"}</span><span className="block font-bold tabular-nums">{money(total)}</span></span>
            </button>
            {restaurant.whatsapp && <a href={whatsappLink(restaurant.whatsapp, message)} target="_blank" rel="noopener noreferrer" title="Enviar por WhatsApp" aria-label="Enviar pedido por WhatsApp"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-3 font-semibold text-white hover:bg-emerald-600"><MessageCircle className="h-5 w-5" /><span className="hidden sm:inline">WhatsApp</span></a>}
            <button type="button" onClick={() => setCheckout(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 font-bold text-white shadow-lg">
              <ShoppingBag className="h-5 w-5" /> Hacer pedido</button>
          </div>
        </div>
      </div>}
      {configuring && <OptionsSheet product={configuring} onClose={() => setConfiguring(null)} onAdd={(options, quantity) => { addLine(configuring.id, options, quantity); setConfiguring(null) }} />}
      {checkout && <CheckoutSheet restaurant={restaurant} zones={zones} lines={lines} total={total} onChange={changeLine} onClose={() => setCheckout(false)} onPlaced={() => setCart([])} />}
    </main>
  )
}

function Stepper({ quantity, onChange }: { quantity: number; onChange: (delta: number) => void }) {
  return <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700">
    <button type="button" onClick={() => onChange(-1)} className="p-1.5 hover:text-indigo-600" aria-label="Quitar uno"><Minus className="h-3.5 w-3.5" /></button>
    <span className="w-6 text-center text-sm font-semibold tabular-nums">{quantity}</span>
    <button type="button" onClick={() => onChange(1)} className="p-1.5 hover:text-indigo-600" aria-label="Agregar uno"><Plus className="h-3.5 w-3.5" /></button>
  </span>
}

function ProductCard({ product, quantity, onChange, canOrder }: { product: MarketplaceProduct; quantity: number; onChange: (delta: number) => void; canOrder: boolean }) {
  const promo = product.price < product.regularPrice
  return (
    <article className={`flex gap-3 rounded-2xl border bg-white p-3 transition dark:bg-slate-900 ${quantity ? "border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-950" : "border-slate-200 hover:border-slate-300 dark:border-slate-800"}`}>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug">{product.name}</h3>
        {product.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{product.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          {product.prepMinutes && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{product.prepMinutes} min</span>}
          {product.hasOptions && <span className="inline-flex items-center gap-1"><SlidersHorizontal className="h-3 w-3" />Con opciones</span>}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="tabular-nums"><span className={`font-bold ${promo ? "text-rose-600" : ""}`}>{money(product.price)}</span>
            {promo && <span className="ml-1.5 text-xs text-slate-400 line-through">{money(product.regularPrice)}</span>}</p>
          {canOrder && (quantity ? <Stepper quantity={quantity} onChange={onChange} />
            : <button type="button" onClick={() => onChange(1)} className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"><Plus className="h-3.5 w-3.5" /> Agregar</button>)}
        </div>
      </div>
      {product.image && <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28 dark:bg-slate-800">
        <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        {promo && <span className="absolute left-1 top-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">PROMO</span>}
      </div>}
    </article>
  )
}

/** Elegir opciones del plato (guarnición, tamaño…) antes de agregarlo. */
function OptionsSheet({ product, onClose, onAdd }: { product: MarketplaceProduct; onClose: () => void; onAdd: (options: Choice[], quantity: number) => void }) {
  const [picked, setPicked] = useState<Record<number, number[]>>({})
  const [quantity, setQuantity] = useState(1)
  const toggle = (groupId: number, optionId: number, multiple: boolean) => setPicked((current) => {
    const list = current[groupId] ?? []
    return { ...current, [groupId]: multiple ? (list.includes(optionId) ? list.filter((id) => id !== optionId) : [...list, optionId]) : (list[0] === optionId ? [] : [optionId]) }
  })
  const missing = product.groups.filter((group) => group.required && !(picked[group.id]?.length))
  const extras = product.groups.reduce((sum, group) => sum + (picked[group.id] ?? []).reduce((acc, id) => acc + (group.options.find((o) => o.id === id)?.price ?? 0), 0), 0)
  const options = product.groups.flatMap((group) => (picked[group.id] ?? []).map((optionId) => ({ groupId: group.id, optionId })))
  return <Sheet onClose={onClose} title={product.name}>
    {product.description && <p className="text-sm text-slate-500">{product.description}</p>}
    <div className="mt-4 space-y-4">{product.groups.map((group) => <fieldset key={group.id}>
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-bold">{group.name}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${group.required ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{group.required ? "Obligatorio" : group.multiple ? "Podés elegir varios" : "Opcional"}</span></legend>
      <div className="space-y-1.5">{group.options.map((option) => {
        const on = (picked[group.id] ?? []).includes(option.id)
        return <button key={option.id} type="button" onClick={() => toggle(group.id, option.id, group.multiple)}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${on ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-200 dark:border-slate-700"}`}>
          <span className="flex items-center gap-2"><span className={`flex h-4 w-4 items-center justify-center ${group.multiple ? "rounded" : "rounded-full"} border ${on ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>{option.name}</span>
          <span className="text-xs text-slate-500">{option.price ? `+ ${money(option.price)}` : "Incluido"}</span></button>
      })}</div>
    </fieldset>)}</div>
    <div className="mt-5 flex items-center gap-3">
      <Stepper quantity={quantity} onChange={(delta) => setQuantity((value) => Math.max(1, Math.min(50, value + delta)))} />
      <button type="button" disabled={missing.length > 0} onClick={() => onAdd(options, quantity)} className="h-12 flex-1 rounded-xl bg-indigo-600 font-bold text-white disabled:opacity-50">
        {missing.length ? `Elegí ${missing[0].name.toLowerCase()}` : `Agregar · ${money((product.price + extras) * quantity)}`}</button>
    </div>
  </Sheet>
}

type PricedLine = Line & { product: MarketplaceProduct; unit: number; label: string }

/** Confirmar el pedido: cuenta del cliente, delivery o retiro, dirección o ubicación y notas. */
function CheckoutSheet({ restaurant, zones, lines, total, onChange, onClose, onPlaced }: { restaurant: MarketplaceRestaurant; zones: MarketplaceZone[]; lines: PricedLine[]; total: number
  onChange: (key: string, delta: number) => void; onClose: () => void; onPlaced: () => void }) {
  const router = useRouter()
  const { account, loading, setAccount } = useCustomer()
  const modes = ([restaurant.serviceModes.pickup && "pickup", restaurant.serviceModes.delivery && "delivery"].filter(Boolean) as ("pickup" | "delivery")[])
  const [type, setType] = useState<"pickup" | "delivery">(modes[0] ?? "pickup")
  const [zoneId, setZoneId] = useState<number | null>(zones.length === 1 ? zones[0].id : null)
  const [address, setAddress] = useState("")
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => { if (account?.address && !address) setAddress(account.address) }, [account]) // eslint-disable-line react-hooks/exhaustive-deps
  const zone = zones.find((entry) => entry.id === zoneId) ?? null
  const fee = type === "delivery" && zone ? (zone.freeOver != null && total >= zone.freeOver ? 0 : zone.fee) : 0
  const locate = () => {
    if (!navigator.geolocation) { setError("Tu navegador no comparte la ubicación."); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition((position) => { setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }); setLocating(false) },
      () => { setError("No pudimos obtener tu ubicación. Escribí la dirección."); setLocating(false) }, { enableHighAccuracy: true, timeout: 12000 })
  }
  const place = async () => {
    setBusy(true); setError("")
    try {
      const result = await customerApi<{ ref: string }>("/api/customer/orders", { method: "POST", body: JSON.stringify({ slug: restaurant.slug, orderType: type, zoneId, address, notes,
        lat: location?.lat, lng: location?.lng, items: lines.map((line) => ({ id: line.id, quantity: line.quantity, options: line.options })) }) })
      onPlaced()
      router.push(`/cuenta/pedidos/${result.ref}`)
    } catch (problem) { setError(problem instanceof Error ? problem.message : "No se pudo enviar el pedido."); setBusy(false) }
  }
  return <Sheet onClose={onClose} title="Tu pedido">
    <ul className="divide-y text-sm dark:divide-slate-800">{lines.map((line) => <li key={line.key} className="flex items-center gap-2 py-2">
      <span className="min-w-0 flex-1">{line.label}</span><Stepper quantity={line.quantity} onChange={(delta) => onChange(line.key, delta)} />
      <span className="w-24 text-right font-semibold tabular-nums">{money(line.quantity * line.unit)}</span></li>)}</ul>
    {lines.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Tu pedido está vacío.</p>
      : loading ? <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
      : !account ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50"><p className="mb-3 text-sm font-semibold">Ingresá o creá tu cuenta para pedir y seguir tu pedido</p><CustomerAuthForm onDone={setAccount} compact /></div>
      : <div className="mt-4 space-y-4">
        {modes.length > 1 && <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
          {modes.map((mode) => <button key={mode} type="button" onClick={() => setType(mode)} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold ${type === mode ? "bg-white shadow dark:bg-slate-900" : "text-slate-500"}`}>
            {mode === "delivery" ? <Bike className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}{mode === "delivery" ? "Delivery" : "Retiro en el local"}</button>)}</div>}
        {modes.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Este restaurante no recibe pedidos para retirar ni delivery por la web.</p>}
        {type === "delivery" && <div className="space-y-2">
          {zones.length > 0 && <select value={zoneId ?? ""} onChange={(event) => setZoneId(event.target.value ? Number(event.target.value) : null)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="">Elegí tu zona…</option>{zones.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.fee ? money(entry.fee) : "envío gratis"}{entry.etaMinutes ? ` · ~${entry.etaMinutes} min` : ""}</option>)}</select>}
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Dirección, número de casa y referencia" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900" />
          <button type="button" onClick={locate} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${location ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}{location ? "Ubicación compartida" : "Usar mi ubicación"}</button>
        </div>}
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={500} placeholder="Notas para el restaurante (sin cebolla, timbre roto…)" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900" />
        <div className="space-y-1 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
          <p className="flex justify-between"><span>Productos</span><span className="tabular-nums">{money(total)}</span></p>
          {type === "delivery" && <p className="flex justify-between text-slate-500"><span>Envío</span><span>{zone ? (fee ? money(fee) : "Gratis") : "Según la zona"}</span></p>}
          <p className="flex justify-between text-base font-black"><span>Total</span><span className="tabular-nums">{money(total + fee)}</span></p>
          <p className="text-xs text-slate-500">Pedís como {account.name} (+{account.phone}). Pagás al recibir o retirar.</p>
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <button type="button" disabled={busy || modes.length === 0} onClick={() => void place()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-bold text-white shadow-lg disabled:opacity-60">
          {busy && <Loader2 className="h-5 w-5 animate-spin" />}Confirmar pedido · {money(total + fee)}</button>
      </div>}
  </Sheet>
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = "" }
  }, [onClose])
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}
      className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-8 dark:bg-slate-900 sm:rounded-3xl">
      <div className="mb-3 flex items-start justify-between gap-3"><h2 className="text-xl font-black">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar"><X className="h-5 w-5" /></button></div>
      {children}
    </div>
  </div>
}
