"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ChefHat, Clock3, RefreshCw, ShoppingBasket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api-client"

interface PublicOrder {
  id: number
  orderType: "dineIn" | "delivery" | "pickup"
  tableLabel: string
  total: number
  items: { name: string; quantity: number; subtotal: number; modifiers: string[] }[]
  tickets: { id: number; status: string }[]
}
const states: Record<string, string> = { pending: "Pendiente", preparing: "En preparación", ready: "Listo", served: "Servido", out_for_delivery: "En reparto", delivered: "Entregado", cancelled: "Cancelado" }
const money = (value: number) => `Gs ${value.toLocaleString("es-PY")}`

export default function CardBalancePage() {
  const params = useParams<{ code: string }>()
  const [data, setData] = useState<{ label: string; restaurantName?: string; order: PublicOrder | null } | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try { setData(await apiRequest<{ label: string; restaurantName?: string; order: PublicOrder | null }>(`/api/card-lookup/${encodeURIComponent(params.code)}`)); setError("") }
    catch (problem) { setError(problem instanceof Error ? problem.message : "No se pudo consultar la tarjeta") }
    finally { setLoading(false) }
  }, [params.code])
  useEffect(() => { void load(); const timer = window.setInterval(() => { void load() }, 15000); return () => window.clearInterval(timer) }, [load])
  const order = data?.order
  return <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950 p-4 text-white sm:p-6"><div className="mx-auto max-w-lg">
    <header className="mb-6 rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-xl backdrop-blur"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600"><ShoppingBasket className="h-7 w-7" /></div><p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">{data?.restaurantName || "Tu restaurante"}</p><h1 className="mt-1 text-2xl font-bold">Tu cuenta</h1><p className="mt-2 text-sm text-indigo-200">{data?.label || "Tarjeta QR"}</p></header>
    {loading && <p className="py-10 text-center text-indigo-200">Consultando cuenta…</p>}
    {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-center text-red-100">{error}</div>}
    {!loading && !error && !order && <div className="rounded-2xl border border-white/10 bg-white/10 p-8 text-center"><Clock3 className="mx-auto mb-3 h-10 w-10 text-indigo-200" /><h2 className="font-bold">Todavía no hay una cuenta abierta</h2><p className="mt-2 text-sm text-indigo-200">Mostrá esta tarjeta al personal para agregar comidas y bebidas.</p></div>}
    {order && <div className="space-y-4"><section className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Orden #{order.id}</p><h2 className="mt-1 text-lg font-bold">{order.tableLabel || (order.orderType === "delivery" ? "Delivery" : order.orderType === "pickup" ? "Retiro" : "En el local")}</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Abierta</span></div><div className="my-5 space-y-3 border-y py-4">{order.items.length === 0 ? <p className="text-sm text-slate-500">Aún no agregaron productos.</p> : order.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-3 text-sm"><div><span className="font-semibold">{item.quantity} × {item.name}</span>{item.modifiers.length > 0 && <p className="text-xs text-slate-500">{item.modifiers.join(", ")}</p>}</div><span className="whitespace-nowrap">{money(item.subtotal)}</span></div>)}</div><div className="flex justify-between text-lg font-bold"><span>Total hasta ahora</span><span>{money(order.total)}</span></div></section>
      {order.tickets.length > 0 && <section className="rounded-2xl border border-white/10 bg-white/10 p-5"><h2 className="mb-3 flex items-center gap-2 font-bold"><ChefHat className="h-5 w-5 text-amber-300" /> Estado de tus pedidos</h2><div className="space-y-2">{order.tickets.map((ticket) => <div key={ticket.id} className="flex justify-between rounded-xl bg-white/10 px-3 py-2 text-sm"><span>Comanda #{ticket.id}</span><strong>{states[ticket.status] ?? ticket.status}</strong></div>)}</div></section>}
      <p className="text-center text-xs text-indigo-200">Para agregar productos o pagar, mostrale la tarjeta al personal.</p></div>}
    <Button variant="outline" onClick={() => void load()} className="mt-5 w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw className="mr-2 h-4 w-4" /> Actualizar cuenta</Button>
  </div></main>
}
