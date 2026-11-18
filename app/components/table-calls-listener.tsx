"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Bell, BellOff, BellRing, HandPlatter, Receipt } from "lucide-react"
import { useAuth } from "@/app/context/auth-context"
import { Button } from "@/components/ui/button"
import { beep, pushSupport, subscribePush } from "@/lib/push-client"
import { useLiveTables } from "@/lib/use-live"

type TableCall = { id: number; tableId: number; tableLabel: string; kind: "waiter" | "bill"; createdAt: string; orderId: number | null; waiterName: string }

const PUBLIC_PREFIXES = ["/table/", "/landing", "/login", "/card/", "/welcome"]
const minutesAgo = (iso: string) => {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  return minutes < 1 ? "recién" : `hace ${minutes} min`
}

/** Llamados de las mesas (mozo o cuenta): aparecen en cualquier pantalla del personal y suenan. */
export function TableCallsListener() {
  const { user, hasPermission } = useAuth()
  const pathname = usePathname() ?? ""
  const active = Boolean(user) && user?.role !== "superadmin" && hasPermission("access_pos") && !PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const [calls, setCalls] = useState<TableCall[]>([])
  const [attending, setAttending] = useState<number | null>(null)
  const known = useRef<Set<number> | null>(null)
  const attended = useRef(new Set<number>())
  const originalTitle = useRef<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/table-calls", { cache: "no-store" })
      if (!response.ok) return
      const items = (await response.json() as { items: TableCall[] }).items.filter((call) => !attended.current.has(call.id))
      const fresh = known.current ? items.filter((call) => !known.current?.has(call.id)) : []
      known.current = new Set(items.map((call) => call.id))
      setCalls(items)
      if (fresh.length) { beep(4); navigator.vibrate?.([200, 100, 200]) }
    } catch { /* sin conexión: se reintenta en la próxima vuelta */ }
  }, [])

  useEffect(() => {
    if (!active) { setCalls([]); known.current = null; return }
    void load()
  }, [active, load])

  // El título de la pestaña parpadea con la cantidad de llamados para verlos desde otra pestaña.
  useEffect(() => {
    if (originalTitle.current === null) originalTitle.current = document.title
    if (!calls.length) { document.title = originalTitle.current; return }
    let on = false
    const timer = window.setInterval(() => { on = !on; document.title = on ? `(${calls.length}) 🔔 Llamado de mesa` : originalTitle.current ?? "RestoPOS" }, 1200)
    return () => { window.clearInterval(timer); document.title = originalTitle.current ?? "RestoPOS" }
  }, [calls.length])

  const attend = async (call: TableCall) => {
    setAttending(call.id)
    attended.current.add(call.id)
    setCalls((current) => current.filter((item) => item.id !== call.id))
    try {
      const response = await fetch(`/api/table-calls/${call.id}`, { method: "PATCH" })
      if (!response.ok && response.status !== 409) attended.current.delete(call.id)
    } catch { attended.current.delete(call.id) }
    finally { setAttending(null) }
  }

  if (!active) return null
  return <><LiveCalls onChange={load} />{calls.length > 0 && <div aria-live="assertive" className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 print:hidden">
    {calls.map((call) => {
      const bill = call.kind === "bill"
      return <div key={call.id} role="alert" className={`pointer-events-auto flex items-center gap-3 rounded-2xl border-2 p-3 shadow-2xl animate-in slide-in-from-right-8 ${bill ? "border-emerald-400 bg-emerald-50 text-emerald-950" : "border-amber-400 bg-amber-50 text-amber-950"}`}>
        <div className={`flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-xl text-white ${bill ? "bg-emerald-600" : "bg-amber-500"}`}>{bill ? <Receipt className="h-6 w-6" /> : <HandPlatter className="h-6 w-6" />}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black">{call.tableLabel}</p>
          <p className="text-sm font-semibold">{bill ? "Pide la cuenta" : "Llama al mozo"} · {minutesAgo(call.createdAt)}</p>
          {(call.orderId || call.waiterName) && <p className="truncate text-xs opacity-75">{call.orderId ? `Orden #${call.orderId}` : ""}{call.waiterName ? ` · ${call.waiterName}` : ""}</p>}
        </div>
        <Button size="sm" onClick={() => void attend(call)} disabled={attending === call.id} className={bill ? "bg-emerald-700 hover:bg-emerald-800" : "bg-amber-600 hover:bg-amber-700"}>{attending === call.id ? "…" : "Atender"}</Button>
      </div>
    })}
  </div>}</>
}

/** Escucha los llamados en vivo (con sondeo cada 5 s si no hay conexión en vivo). Solo se monta con sesión. */
function LiveCalls({ onChange }: { onChange: () => void }) {
  useLiveTables(["table_calls"], onChange, 5000)
  return null
}

/** Botón para que el personal reciba los pedidos y llamados como notificación del teléfono o la PC. */
export function StaffPushButton() {
  const [state, setState] = useState<"idle" | "working" | "on" | "blocked" | "unsupported">("idle")
  useEffect(() => {
    const support = pushSupport()
    if (support !== "supported") { setState("unsupported"); return }
    if (Notification.permission === "denied") { setState("blocked"); return }
    void navigator.serviceWorker.getRegistration("/").then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => { if (subscription && Notification.permission === "granted") setState("on") }).catch(() => undefined)
  }, [])
  const enable = async () => {
    setState("working")
    try {
      const subscription = await subscribePush()
      if (!subscription) { setState(Notification.permission === "denied" ? "blocked" : "idle"); return }
      const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription }) })
      setState(response.ok ? "on" : "idle")
    } catch { setState("idle") }
  }
  const disable = async () => {
    setState("working")
    try {
      const registration = await navigator.serviceWorker.getRegistration("/")
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) })
    } finally { setState("idle") }
  }
  if (state === "unsupported") return null
  if (state === "blocked") return <Button variant="outline" disabled title="Las notificaciones están bloqueadas en este navegador"><BellOff className="mr-2 h-4 w-4" /> Avisos bloqueados</Button>
  if (state === "on") return <Button variant="outline" onClick={() => void disable()} title="Desactivar avisos en este dispositivo" className="border-emerald-300 text-emerald-700"><BellRing className="mr-2 h-4 w-4" /> Avisos activos</Button>
  return <Button variant="outline" onClick={() => void enable()} disabled={state === "working"} title="Recibir pedidos del QR y llamados de mesa como notificación"><Bell className="mr-2 h-4 w-4" /> {state === "working" ? "Activando…" : "Activar avisos"}</Button>
}
