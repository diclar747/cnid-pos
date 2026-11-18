"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Loader2, MapPin, MessageCircle, Phone, RefreshCw } from "lucide-react"
import MarketplaceHeader from "../../../marketplace/marketplace-header"
import { CustomerAuthForm, customerApi, useCustomer } from "../../customer-auth"
import { isActive, money, stageTone, Timeline, type CustomerOrder } from "../../order-progress"

const typeName = { dineIn: "En la mesa", delivery: "Delivery", pickup: "Retiro en el local" } as const

export default function OrderTrackingPage() {
  const { ref } = useParams<{ ref: string }>()
  const { account, loading, setAccount } = useCustomer()
  const [order, setOrder] = useState<CustomerOrder | null>(null)
  const [error, setError] = useState("")
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try { setOrder((await customerApi<{ order: CustomerOrder }>(`/api/customer/orders/${ref}`)).order); setError(""); setUpdatedAt(new Date()) }
    catch (problem) { setError(problem instanceof Error ? problem.message : "No se pudo cargar el pedido.") }
  }, [ref])
  useEffect(() => {
    if (!account) return
    void load()
    // Mientras el pedido sigue en curso, se actualiza solo.
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load() }, 8000)
    return () => window.clearInterval(timer)
  }, [account, load])
  useEffect(() => { if (order && !isActive(order)) return }, [order])

  return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <MarketplaceHeader />
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-5 sm:px-6">
      <Link href="/cuenta" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft className="h-4 w-4" /> Mis pedidos</Link>
      {loading ? <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
        : !account ? <div className="mx-auto mt-6 max-w-md rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 font-semibold">Ingresá para ver tu pedido</p><CustomerAuthForm onDone={setAccount} compact /></div>
        : error && !order ? <p className="mt-10 text-center text-slate-500">{error}</p>
        : !order ? <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
        : <>
          <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm text-slate-500">{order.restaurant.name}</p><h1 className="text-2xl font-black">Pedido #{order.id}</h1>
                <p className="text-sm text-slate-500">{typeName[order.orderType] ?? order.orderType}{order.tableLabel ? ` · ${order.tableLabel}` : ""} · {new Date(order.createdAt).toLocaleString("es-PY", { dateStyle: "medium", timeStyle: "short" })}</p></div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${stageTone[order.stage]}`}>{order.stageLabel}</span>
            </div>
            <div className="mt-6"><Timeline order={order} /></div>
            {isActive(order) && <p className="mt-5 flex items-center gap-1.5 text-xs text-slate-400"><RefreshCw className="h-3.5 w-3.5" />Se actualiza solo{updatedAt ? ` · ${updatedAt.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}</p>}
          </section>

          <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="font-bold">Tu pedido</h2>
            <ul className="mt-3 divide-y text-sm dark:divide-slate-800">{order.items.map((item, index) => <li key={index} className="flex justify-between gap-3 py-2">
              <span><span className="font-semibold">{item.quantity} ×</span> {item.name}{item.modifiers.length > 0 && <span className="block text-xs text-slate-500">{item.modifiers.join(", ")}</span>}</span>
              <span className="tabular-nums">{money(item.subtotal)}</span></li>)}</ul>
            <div className="mt-2 space-y-1 border-t pt-3 text-sm dark:border-slate-800">
              {order.deliveryFee > 0 && <p className="flex justify-between text-slate-500"><span>Envío{order.deliveryZoneName ? ` · ${order.deliveryZoneName}` : ""}</span><span>{money(order.deliveryFee)}</span></p>}
              <p className="flex justify-between text-base font-black"><span>Total</span><span className="tabular-nums">{money(order.grandTotal)}</span></p>
            </div>
            {order.orderType === "delivery" && order.deliveryAddress && <p className="mt-3 flex gap-2 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />{order.deliveryAddress}</p>}
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {order.restaurant.whatsapp && <a href={`https://wa.me/${order.restaurant.whatsapp}?text=${encodeURIComponent(`Hola! Consulto por mi pedido #${order.id}.`)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 font-semibold text-white"><MessageCircle className="h-5 w-5" /> WhatsApp</a>}
            {order.restaurant.phone && <a href={`tel:${order.restaurant.phone.replace(/[^\d+]/g, "")}`} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 font-semibold dark:border-slate-800 dark:bg-slate-900"><Phone className="h-5 w-5" /> Llamar</a>}
            <Link href={`/marketplace/${order.restaurant.slug}`} className="col-span-2 rounded-2xl py-2 text-center text-sm font-semibold text-indigo-600 hover:underline">Volver a pedir en {order.restaurant.name}</Link>
          </div>
        </>}
    </main>
  </div>
}
