"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bike, Clock3, ExternalLink, Globe, MapPin, MessageCircle, Minus, Navigation, Phone, Plus, Search, ShoppingBag, SlidersHorizontal, Store, Tag, Trash2,
  UtensilsCrossed, X } from "lucide-react"
import type { MarketplaceProduct, MarketplaceRestaurant } from "@/lib/marketplace"
import { Logo, OpenBadge, whatsappLink } from "../marketplace-list"

const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
const slugify = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "otros"
const todayName = () => ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: "America/Asuncion", weekday: "short" }).format(new Date()))]

export default function RestaurantMenu({ restaurant, products }: { restaurant: MarketplaceRestaurant; products: MarketplaceProduct[] }) {
  const [query, setQuery] = useState("")
  const [current, setCurrent] = useState("")
  const [order, setOrder] = useState<Record<number, number>>({})
  const [showOrder, setShowOrder] = useState(false)
  const storageKey = `restopos:marketplace:${restaurant.slug}`
  const chipsRef = useRef<HTMLDivElement>(null)

  // El pedido armado se recuerda en este navegador por si la persona vuelve a la página.
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}"); if (saved && typeof saved === "object") setOrder(saved) } catch { /* sin almacenamiento */ } }, [storageKey])
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(order)) } catch { /* sin almacenamiento */ } }, [order, storageKey])

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
  const lines = Object.entries(order).map(([id, quantity]) => ({ product: byId.get(Number(id)), quantity })).filter((line): line is { product: MarketplaceProduct; quantity: number } => Boolean(line.product) && line.quantity > 0)
  const count = lines.reduce((sum, line) => sum + line.quantity, 0)
  const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0)
  const change = (id: number, delta: number) => setOrder((current) => {
    const next = { ...current, [id]: Math.max(0, Math.min(50, (current[id] ?? 0) + delta)) }
    if (!next[id]) delete next[id]
    return next
  })

  const message = [`Hola ${restaurant.name}! Quiero hacer un pedido (lo armé en RestoPOS):`, "",
    ...lines.map((line) => `• ${line.quantity} × ${line.product.name} — ${money(line.quantity * line.product.price)}`), "",
    `Total estimado: ${money(total)}`, "¿Me confirman disponibilidad? Es para (delivery / retiro):"].join("\n")
  const directions = restaurant.mapsUrl || (restaurant.latitude != null && restaurant.longitude != null ? `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}` : "")
  const today = todayName()
  const modes = [restaurant.serviceModes.delivery && { label: "Delivery", icon: Bike }, restaurant.serviceModes.pickup && { label: "Retiro en el local", icon: ShoppingBag },
    restaurant.serviceModes.dineIn && { label: "Comer en el local", icon: Store }].filter(Boolean) as { label: string; icon: typeof Bike }[]

  return (
    <main className="pb-28">
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0">
          {restaurant.cover ? <img src={restaurant.cover} alt="" className="h-full w-full scale-110 object-cover blur-sm" /> : null}
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${restaurant.color}ee, #0f172aee 70%)` }} />
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
              {group.items.map((product) => <ProductCard key={`${group.id}-${product.id}`} product={product} quantity={order[product.id] ?? 0} onChange={(delta) => change(product.id, delta)} canOrder={Boolean(restaurant.whatsapp)} />)}
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
          <p className="px-1 text-xs text-slate-500">Precios para retirar en el local; el delivery puede tener costo de envío. El restaurante confirma disponibilidad y total por WhatsApp.</p>
        </aside>
      </div>

      {count > 0 && restaurant.whatsapp && <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4">
        <div className="mx-auto max-w-3xl">
          {showOrder && <div className="mb-2 max-h-[50vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between"><p className="font-bold">Tu pedido</p>
              <button type="button" onClick={() => setShowOrder(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar detalle"><X className="h-4 w-4" /></button></div>
            <ul className="divide-y text-sm dark:divide-slate-800">{lines.map((line) => <li key={line.product.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate">{line.product.name}</span>
              <Stepper quantity={line.quantity} onChange={(delta) => change(line.product.id, delta)} />
              <span className="w-24 text-right font-semibold tabular-nums">{money(line.quantity * line.product.price)}</span></li>)}</ul>
            <button type="button" onClick={() => { setOrder({}); setShowOrder(false) }} className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Vaciar</button>
          </div>}
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900 p-2 pl-4 text-white shadow-2xl dark:bg-white dark:text-slate-900">
            <button type="button" onClick={() => setShowOrder((value) => !value)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 font-bold dark:bg-slate-900/10">{count}</span>
              <span className="min-w-0"><span className="block text-xs opacity-70">{showOrder ? "Ocultar detalle" : "Ver pedido"}</span><span className="block font-bold tabular-nums">{money(total)}</span></span>
            </button>
            <a href={whatsappLink(restaurant.whatsapp, message)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white hover:bg-emerald-600">
              <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">Enviar pedido por</span> WhatsApp</a>
          </div>
        </div>
      </div>}
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
