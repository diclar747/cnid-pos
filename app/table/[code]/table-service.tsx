"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, BellRing, CheckCircle2, ChefHat, Download, HandPlatter, Receipt, Share, Truck, UtensilsCrossed, XCircle } from "lucide-react"
import { beep, isStandalone, pushSupport, subscribePush, type PushSupport } from "@/lib/push-client"

export type TicketStatus = "pending" | "preparing" | "ready" | "served" | "out_for_delivery" | "delivered" | "cancelled"
export type TableTicket = { id: number; status: TicketStatus; updatedAt: string }
export type TableCall = { kind: "waiter" | "bill"; createdAt: string }

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const STEPS: { status: TicketStatus; label: string }[] = [
  { status: "pending", label: "Recibido" },
  { status: "preparing", label: "En cocina" },
  { status: "ready", label: "Listo" },
  { status: "served", label: "Servido" },
]
const STATUS_TEXT: Record<TicketStatus, string> = {
  pending: "Esperando que la cocina lo acepte",
  preparing: "Aceptado: la cocina lo está preparando",
  ready: "¡Listo! Ya te lo llevan a la mesa",
  served: "Servido. ¡Buen provecho!",
  out_for_delivery: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado por el local",
}
const stepIndex = (status: TicketStatus) => status === "delivered" ? 3 : status === "out_for_delivery" ? 2 : Math.max(0, STEPS.findIndex((step) => step.status === status))
const time = (iso: string) => new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })

/** Aviso flotante para cambios de estado y confirmaciones. */
export function useGuestToast() {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])
  const show = useCallback((text: string) => setToast({ id: Date.now(), text }), [])
  const node = toast ? <div key={toast.id} role="status" aria-live="polite" className="fixed inset-x-4 top-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-top-4">
    <BellRing className="h-5 w-5 shrink-0 text-amber-300" /> {toast.text}</div> : null
  return { show, node }
}

/** Detecta cambios de estado de los tickets entre una consulta y la siguiente. */
export function useTicketChanges(tickets: TableTicket[] | undefined, onChange: (text: string) => void) {
  const previous = useRef<Map<number, TicketStatus> | null>(null)
  useEffect(() => {
    if (!tickets) return
    const before = previous.current
    previous.current = new Map(tickets.map((ticket) => [ticket.id, ticket.status]))
    if (!before) return
    const changed = tickets.find((ticket) => before.has(ticket.id) && before.get(ticket.id) !== ticket.status)
    if (!changed) return
    onChange(STATUS_TEXT[changed.status])
    navigator.vibrate?.([120, 60, 120])
    beep(changed.status === "ready" ? 3 : 1)
  }, [tickets, onChange])
}

export function OrderProgress({ tickets }: { tickets: TableTicket[] }) {
  if (!tickets.length) return null
  return <section aria-label="Estado de tu pedido" className="mt-4 rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2"><ChefHat className="h-5 w-5 text-indigo-600" /><h2 className="font-black">Estado de tu pedido</h2>
      <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> En vivo</span></div>
    <div className="mt-3 space-y-3">{tickets.map((ticket, index) => {
      const cancelled = ticket.status === "cancelled"
      const current = stepIndex(ticket.status)
      return <div key={ticket.id} className={`rounded-2xl border p-3 ${cancelled ? "border-red-200 bg-red-50" : ticket.status === "ready" ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"}`}>
        <div className="flex items-center justify-between gap-2 text-sm"><strong>{tickets.length > 1 ? `Envío ${index + 1}` : "Tu pedido"}</strong><span className="text-xs text-slate-500">Actualizado {time(ticket.updatedAt)}</span></div>
        <p className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${cancelled ? "text-red-700" : "text-slate-800"}`}>
          {cancelled ? <XCircle className="h-4 w-4" /> : ticket.status === "out_for_delivery" ? <Truck className="h-4 w-4" /> : ticket.status === "ready" || ticket.status === "served" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <UtensilsCrossed className="h-4 w-4 text-indigo-600" />}
          {STATUS_TEXT[ticket.status]}</p>
        {!cancelled && <ol className="mt-3 grid grid-cols-4 gap-1.5">{STEPS.map((step, stepNumber) => <li key={step.status} className="text-center">
          <div className={`h-1.5 rounded-full transition-colors ${stepNumber <= current ? "bg-gradient-to-r from-indigo-600 to-violet-600" : "bg-slate-200"}`} />
          <span className={`mt-1 block text-[11px] font-semibold ${stepNumber <= current ? "text-indigo-700" : "text-slate-400"}`}>{step.label}</span></li>)}</ol>}
      </div>
    })}</div>
  </section>
}

export function ServiceActions({ code, calls, hasOrder, billed, onCalled, notify }: { code: string; calls: TableCall[]; hasOrder: boolean; billed: boolean
  onCalled: () => void; notify: (text: string) => void }) {
  const [busy, setBusy] = useState<"waiter" | "bill" | null>(null)
  const call = async (kind: "waiter" | "bill") => {
    if (busy) return
    setBusy(kind)
    try {
      const response = await fetch(`/api/table/${encodeURIComponent(code)}/call`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "No se pudo avisar al personal.")
      notify(kind === "waiter" ? (result.call?.repeated ? "Ya avisamos al mozo, enseguida viene." : "Listo, el mozo ya fue avisado.") : "Pedimos tu cuenta, enseguida te la traen.")
      navigator.vibrate?.(80)
      onCalled()
    } catch (cause) { notify(cause instanceof Error ? cause.message : "No se pudo avisar al personal.") }
    finally { setBusy(null) }
  }
  const open = (kind: "waiter" | "bill") => calls.find((item) => item.kind === kind)
  const waiter = open("waiter"), bill = open("bill")
  return <section aria-label="Atención en la mesa" className="mt-4 grid grid-cols-2 gap-3">
    <button type="button" onClick={() => void call("waiter")} disabled={busy !== null}
      className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center text-sm font-bold shadow-sm transition active:scale-[.98] ${waiter ? "border-amber-200 bg-amber-50 text-amber-800" : "border-indigo-100 bg-white text-slate-800 hover:border-indigo-300"}`}>
      <HandPlatter className={`h-6 w-6 ${waiter ? "animate-bounce text-amber-600" : "text-indigo-600"}`} />
      {busy === "waiter" ? "Avisando…" : waiter ? "Mozo en camino" : "Llamar al mozo"}
      {waiter && <span className="text-[11px] font-medium">Avisado {time(waiter.createdAt)}</span>}
    </button>
    <button type="button" onClick={() => void call("bill")} disabled={busy !== null || !hasOrder}
      className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-3 text-center text-sm font-bold shadow-sm transition active:scale-[.98] disabled:opacity-50 ${bill || billed ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-indigo-100 bg-white text-slate-800 hover:border-indigo-300"}`}>
      <Receipt className={`h-6 w-6 ${bill || billed ? "text-emerald-600" : "text-indigo-600"}`} />
      {busy === "bill" ? "Avisando…" : billed ? "Cuenta lista" : bill ? "Cuenta pedida" : "Pedir la cuenta"}
      {bill && <span className="text-[11px] font-medium">Pedida {time(bill.createdAt)}</span>}
      {!hasOrder && <span className="text-[11px] font-medium text-slate-500">Primero hacé tu pedido</span>}
    </button>
  </section>
}

const storageKey = (code: string, orderId: number) => `restopos-push:${code}:${orderId}`
const readFlag = (key: string) => { try { return window.localStorage.getItem(key) === "1" } catch { return false } }
const writeFlag = (key: string) => { try { window.localStorage.setItem(key, "1") } catch { /* sin almacenamiento */ } }

/** Activar avisos push del pedido e instalar la carta como aplicación. */
export function AppExtras({ code, orderId, notify }: { code: string; orderId: number | null; notify: (text: string) => void }) {
  const [support, setSupport] = useState<PushSupport>("unsupported")
  const [enabled, setEnabled] = useState(false)
  const [working, setWorking] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(true)
  const [showIosHint, setShowIosHint] = useState(false)
  useEffect(() => {
    setSupport(pushSupport())
    setInstalled(isStandalone())
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt) }
    const done = () => { setInstalled(true); setInstallPrompt(null) }
    window.addEventListener("beforeinstallprompt", capture)
    window.addEventListener("appinstalled", done)
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", done) }
  }, [])
  useEffect(() => { setEnabled(orderId != null && readFlag(storageKey(code, orderId)) && typeof Notification !== "undefined" && Notification.permission === "granted") }, [code, orderId])
  const activate = async () => {
    if (!orderId || working) return
    setWorking(true)
    try {
      const subscription = await subscribePush()
      if (!subscription) { notify(typeof Notification !== "undefined" && Notification.permission === "denied" ? "Los avisos están bloqueados en este navegador. Activalos desde la configuración del sitio." : "No se pudieron activar los avisos."); return }
      const response = await fetch(`/api/table/${encodeURIComponent(code)}/push`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "No se pudieron activar los avisos.")
      writeFlag(storageKey(code, orderId)); setEnabled(true)
      notify("Avisos activados: te avisamos cuando cambie tu pedido.")
    } catch (cause) { notify(cause instanceof Error ? cause.message : "No se pudieron activar los avisos.") }
    finally { setWorking(false) }
  }
  const install = async () => {
    if (!installPrompt) { setShowIosHint(true); return }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice.catch(() => ({ outcome: "dismissed" }))
    if (choice.outcome === "accepted") setInstalled(true)
    setInstallPrompt(null)
  }
  const ios = support === "ios-install"
  const canInstall = !installed && (installPrompt !== null || ios)
  const pushRow = orderId != null && (support === "supported" || ios)
  if (!pushRow && !canInstall) return null
  return <section aria-label="Avisos y aplicación" className="mt-4 space-y-3 rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm">
    {pushRow && <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>{enabled ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}</div>
      <div className="min-w-0 flex-1"><p className="text-sm font-bold">{enabled ? "Avisos activados" : "Avisame cuando esté listo"}</p>
        <p className="text-xs text-slate-500">{enabled ? "Te llega una notificación aunque cierres esta página." : ios ? "En iPhone, primero agregá la carta a tu pantalla de inicio." : "Recibí una notificación en el teléfono cuando la cocina avance."}</p></div>
      {!enabled && !ios && <button type="button" onClick={() => void activate()} disabled={working} className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">{working ? "Activando…" : "Activar"}</button>}
    </div>}
    {canInstall && <div className="flex items-center gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Download className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-bold">Instalar la carta</p><p className="text-xs text-slate-500">Abrila como una app desde tu pantalla de inicio.</p></div>
      <button type="button" onClick={() => void install()} className="shrink-0 rounded-xl border border-violet-200 px-3 py-2 text-sm font-bold text-violet-700">Instalar</button>
    </div>}
    {showIosHint && <p className="flex items-start gap-2 rounded-2xl bg-violet-50 p-3 text-xs text-violet-900"><Share className="mt-0.5 h-4 w-4 shrink-0" />
      En Safari tocá <strong className="mx-1">Compartir</strong> y luego <strong className="mx-1">Agregar a inicio</strong>. Abrí la carta desde el ícono para activar los avisos.</p>}
  </section>
}
