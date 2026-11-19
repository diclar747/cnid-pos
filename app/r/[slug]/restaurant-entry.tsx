"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Armchair, ChevronRight, Loader2, Search, ShoppingBag, UserRound } from "lucide-react"
import { BrandIcon } from "@/app/components/brand-logo"
import { customerApi, type CustomerAccount } from "@/app/cuenta/customer-auth"

type Table = { label: string; code: string; seats: number; room: string }
type Restaurant = { slug: string; name: string; slogan: string; logo: string; cover: string; color: string; takeaway: boolean }

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** Entrada por el QR del restaurante: crea (o recupera) la sesión de este teléfono y deja elegir la mesa. */
export default function RestaurantEntry({ restaurant, tables }: { restaurant: Restaurant; tables: Table[] }) {
  const router = useRouter()
  const [account, setAccount] = useState<CustomerAccount | null>(null)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [last, setLast] = useState("")
  const [opening, setOpening] = useState("")
  const lastKey = `restopos:last-table:${restaurant.slug}`

  useEffect(() => {
    customerApi<{ account: CustomerAccount }>("/api/customer/session", { method: "POST", body: JSON.stringify({ mode: "guest" }) })
      .then((result) => setAccount(result.account)).catch((problem) => setError(problem instanceof Error ? problem.message : "No se pudo iniciar la sesión."))
    try { setLast(localStorage.getItem(lastKey) ?? "") } catch { /* sin almacenamiento */ }
  }, [lastKey])

  const rooms = useMemo(() => {
    const term = normalize(query.trim())
    const map = new Map<string, Table[]>()
    for (const table of tables) {
      // «6» encuentra «Mesa 6» (y no «Mesa 16»); con texto busca por nombre o salón.
      const matches = !term || (/^\d+$/.test(term) ? new RegExp(`(^|\\D)${term}(\\D|$)`).test(table.label) : normalize(`${table.label} ${table.room}`).includes(term))
      if (matches) map.set(table.room, [...(map.get(table.room) ?? []), table])
    }
    return [...map.entries()]
  }, [tables, query])
  const lastTable = tables.find((table) => table.code === last)

  const open = (table: Table) => {
    setOpening(table.code)
    try { localStorage.setItem(lastKey, table.code) } catch { /* sin almacenamiento */ }
    router.push(`/table/${table.code}`)
  }
  const color = /^#[0-9a-f]{6}$/i.test(restaurant.color) ? restaurant.color : "#4f46e5"

  return <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <header className="relative overflow-hidden px-4 pb-16 pt-8 text-white" style={{ background: `linear-gradient(135deg, ${color}, #7c3aed)` }}>
      {restaurant.cover && <img src={restaurant.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
      <div className="relative mx-auto max-w-lg text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-white text-3xl font-black shadow-xl" style={{ color }}>
          {restaurant.logo ? <img src={restaurant.logo} alt="" className="h-full w-full object-cover" /> : restaurant.name.slice(0, 1).toUpperCase()}</span>
        <h1 className="mt-4 text-3xl font-black tracking-tight">{restaurant.name}</h1>
        {restaurant.slogan && <p className="mt-1 text-white/85">{restaurant.slogan}</p>}
        <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur">
          {account ? <><UserRound className="h-4 w-4" />Ya estás adentro{account.isGuest ? "" : `, ${account.name.split(" ")[0]}`}</> : error ? error : <><Loader2 className="h-4 w-4 animate-spin" />Entrando…</>}</p>
      </div>
    </header>

    <main className="relative mx-auto -mt-10 max-w-lg space-y-4 px-4 pb-16">
      {lastTable && <button type="button" onClick={() => open(lastTable)} className="flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-lg ring-2 ring-indigo-500 dark:bg-slate-900">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Armchair className="h-6 w-6" /></span>
        <span className="min-w-0 flex-1"><span className="block text-xs font-semibold uppercase tracking-wide text-indigo-600">Seguir en</span>
          <span className="block truncate text-lg font-black">{lastTable.label}</span><span className="text-xs text-slate-500">{lastTable.room}</span></span>
        {opening === lastTable.code ? <Loader2 className="h-5 w-5 animate-spin text-indigo-600" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}</button>}

      {tables.length > 0 && <section className="rounded-3xl bg-white p-4 shadow-lg dark:bg-slate-900">
        <h2 className="text-xl font-black">¿En qué mesa estás?</h2>
        <p className="mt-0.5 text-sm text-slate-500">Elegí tu mesa y pedí desde el teléfono: el pedido llega al mozo y a la cocina.</p>
        {tables.length > 8 && <label className="relative mt-3 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} inputMode="search" placeholder="Número de mesa, ej. 6"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800" /></label>}
        <div className="mt-3 space-y-4">
          {rooms.map(([room, list]) => <div key={room}>
            {rooms.length > 1 && <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{room}</p>}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{list.map((table) => <button key={table.code} type="button" onClick={() => open(table)} disabled={Boolean(opening)}
              className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-2 text-center transition active:scale-95 ${table.code === last ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-slate-200 bg-slate-50 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800"}`}>
              {opening === table.code ? <Loader2 className="h-6 w-6 animate-spin text-indigo-600" /> : <Armchair className="h-6 w-6 text-indigo-600" />}
              <span className="mt-1 line-clamp-2 text-sm font-bold leading-tight">{table.label}</span>
              <span className="text-[11px] text-slate-500">{table.seats} sillas</span></button>)}</div>
          </div>)}
          {rooms.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No encontramos la mesa «{query}».</p>}
        </div>
      </section>}

      <div className="grid gap-3 sm:grid-cols-2">
        {restaurant.takeaway && <Link href={`/marketplace/${restaurant.slug}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 font-semibold shadow-sm dark:bg-slate-900">
          <ShoppingBag className="h-5 w-5 text-indigo-600" /><span className="flex-1">{tables.length ? "Para llevar o delivery" : "Ver la carta y pedir"}</span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>}
        <Link href="/cuenta" className="flex items-center gap-3 rounded-2xl bg-white p-4 font-semibold shadow-sm dark:bg-slate-900">
          <UserRound className="h-5 w-5 text-indigo-600" /><span className="flex-1">Mis pedidos</span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>
      </div>
      <p className="flex items-center justify-center gap-2 pt-4 text-xs text-slate-400"><BrandIcon className="h-5 w-5" />Tu sesión queda abierta en este teléfono · RestoPOS</p>
    </main>
  </div>
}
