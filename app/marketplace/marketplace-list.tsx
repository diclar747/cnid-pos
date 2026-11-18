"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Bike, Clock3, MapPin, MessageCircle, Phone, Search, ShoppingBag, Sparkles, Store, Tag, UtensilsCrossed } from "lucide-react"
import type { MarketplaceRestaurant } from "@/lib/marketplace"

type Filter = "open" | "delivery" | "pickup" | "promo"
const filters: { key: Filter; label: string; icon: typeof Clock3 }[] = [
  { key: "open", label: "Abiertos ahora", icon: Clock3 }, { key: "delivery", label: "Delivery", icon: Bike },
  { key: "pickup", label: "Retiro", icon: ShoppingBag }, { key: "promo", label: "Con promos", icon: Tag },
]
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export function OpenBadge({ open, className = "" }: { open: boolean | null; className?: string }) {
  if (open === null) return null
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${open ? "bg-emerald-500 text-white" : "bg-slate-900/80 text-white"} ${className}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-white animate-pulse" : "bg-slate-400"}`} />{open ? "Abierto" : "Cerrado"}</span>
}

export function Logo({ restaurant, size = "h-14 w-14 text-xl" }: { restaurant: MarketplaceRestaurant; size?: string }) {
  return restaurant.logo
    ? <img src={restaurant.logo} alt="" className={`${size} shrink-0 rounded-2xl border-2 border-white bg-white object-cover shadow-lg`} />
    : <span className={`${size} flex shrink-0 items-center justify-center rounded-2xl border-2 border-white font-black text-white shadow-lg`} style={{ background: restaurant.color }}>
      {restaurant.name.slice(0, 1).toUpperCase()}</span>
}

export const whatsappLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`

export default function MarketplaceList({ items }: { items: MarketplaceRestaurant[] }) {
  const [query, setQuery] = useState("")
  const [active, setActive] = useState<Filter[]>([])
  const [city, setCity] = useState("")
  const cities = useMemo(() => [...new Set(items.map((item) => item.city).filter(Boolean))].sort(), [items])
  const visible = useMemo(() => {
    const term = normalize(query.trim())
    return items.filter((item) => {
      if (term && !normalize([item.name, item.slogan, item.businessType, item.address, item.city, ...item.categories].join(" ")).includes(term)) return false
      if (city && item.city !== city) return false
      if (active.includes("open") && item.openNow !== true) return false
      if (active.includes("delivery") && !item.serviceModes.delivery) return false
      if (active.includes("pickup") && !item.serviceModes.pickup) return false
      if (active.includes("promo") && item.promoCount === 0) return false
      return true
    }).sort((a, b) => Number(b.openNow === true) - Number(a.openNow === true))
  }, [items, query, active, city])
  const toggle = (key: Filter) => setActive((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])

  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-4 pb-16 pt-14 text-white sm:px-6">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-100"><Sparkles className="h-3.5 w-3.5" /> Marketplace</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">Pedí directo a tus restaurantes favoritos</h1>
          <p className="mt-3 max-w-2xl text-lg text-indigo-100/90">Menús actualizados, horarios, dirección y pedido por WhatsApp, sin intermediarios.</p>
          <div className="relative mt-8 max-w-2xl">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscá un restaurante, una comida o un barrio…" aria-label="Buscar restaurantes"
              className="h-14 w-full rounded-2xl border-0 bg-white pl-14 pr-4 text-base text-slate-900 shadow-2xl shadow-indigo-950/40 outline-none ring-4 ring-white/10 placeholder:text-slate-400 focus:ring-indigo-300/60" />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-6 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {filters.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => toggle(key)} aria-pressed={active.includes(key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${active.includes(key) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"}`}>
            <Icon className="h-4 w-4" />{label}</button>)}
          {cities.length > 1 && <select value={city} onChange={(event) => setCity(event.target.value)} aria-label="Ciudad" className="rounded-full border border-slate-200 bg-transparent px-3 py-1.5 text-sm dark:border-slate-700">
            <option value="">Todas las ciudades</option>{cities.map((name) => <option key={name} value={name}>{name}</option>)}</select>}
          <span className="ml-auto text-sm text-slate-500">{visible.length} restaurante{visible.length === 1 ? "" : "s"}</span>
        </div>

        {visible.length === 0 ? <div className="py-24 text-center">
          <Store className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 font-semibold">{items.length ? "No hay restaurantes con esos filtros." : "Pronto vas a ver restaurantes acá."}</p>
          {items.length > 0 && <button type="button" onClick={() => { setActive([]); setQuery(""); setCity("") }} className="mt-2 text-sm font-medium text-indigo-600 hover:underline">Ver todos</button>}
        </div> : <div className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => <RestaurantCard key={item.slug} item={item} />)}
        </div>}
      </section>
    </main>
  )
}

function RestaurantCard({ item }: { item: MarketplaceRestaurant }) {
  const modes = [item.serviceModes.delivery && "Delivery", item.serviceModes.pickup && "Retiro", item.serviceModes.dineIn && "En el local"].filter(Boolean)
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <Link href={`/marketplace/${item.slug}`} className="relative block h-44 overflow-hidden" aria-label={`Ver menú de ${item.name}`}>
        {item.cover
          ? <img src={item.cover} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${item.color}, #1e1b4b)` }}><UtensilsCrossed className="h-12 w-12 text-white/50" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <OpenBadge open={item.openNow} className="absolute left-3 top-3" />
        {item.promoCount > 0 && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950"><Tag className="h-3 w-3" />{item.promoCount} promo{item.promoCount === 1 ? "" : "s"}</span>}
        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
          <Logo restaurant={item} />
          <div className="min-w-0 text-white">
            <h2 className="truncate text-xl font-bold leading-tight">{item.name}</h2>
            <p className="truncate text-sm text-white/80">{[item.businessType, item.city].filter(Boolean).join(" · ") || item.slogan}</p>
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {item.slogan && <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.slogan}</p>}
        <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          {item.address && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span className="line-clamp-1">{item.address}</span></li>}
          {item.todayHours && <li className="flex gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{item.todayHours}</li>}
          <li className="flex gap-2"><UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{item.productCount} platos · {item.categories.length} categorías</li>
        </ul>
        {modes.length > 0 && <div className="flex flex-wrap gap-1.5">{modes.map((mode) => <span key={String(mode)} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">{mode}</span>)}</div>}
        <div className="mt-auto flex gap-2 pt-2">
          <Link href={`/marketplace/${item.slug}`} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700">Ver menú</Link>
          {item.whatsapp && <a href={whatsappLink(item.whatsapp, `Hola ${item.name}! Vi su menú en RestoPOS y quiero hacer un pedido.`)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${item.name}`}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-3.5 text-white hover:bg-emerald-600"><MessageCircle className="h-5 w-5" /></a>}
          {item.phone && <a href={`tel:${item.phone.replace(/[^\d+]/g, "")}`} aria-label={`Llamar a ${item.name}`} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Phone className="h-5 w-5" /></a>}
        </div>
      </div>
    </article>
  )
}
