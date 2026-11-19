"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellRing, ChevronRight, Loader2, LogOut, MapPin, Pencil, QrCode, ShoppingBag, Store, UserRound } from "lucide-react"
import MarketplaceHeader from "../marketplace/marketplace-header"
import { CodeCamera } from "../components/code-camera"
import { parseScannedCode } from "@/lib/scan-code"
import { pushSupport, subscribePush } from "@/lib/push-client"
import { CustomerAuthForm, customerApi, useCustomer } from "./customer-auth"
import { isActive, money, ProgressBar, stageTone, type CustomerOrder } from "./order-progress"

const tableCode = (value: string) => {
  const text = (() => { try { return decodeURIComponent(value) } catch { return value } })()
  return parseScannedCode(text).code.toUpperCase().match(/CNID-TABLE-[A-F0-9]{24}/)?.[0] ?? text.toUpperCase().match(/CNID-TABLE-[A-F0-9]{24}/)?.[0] ?? ""
}
const typeName = { dineIn: "En la mesa", delivery: "Delivery", pickup: "Retiro" } as const

export default function AccountPage() {
  const router = useRouter()
  const { account, loading, setAccount, logout } = useCustomer()
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState("")
  const [editing, setEditing] = useState(false)
  const [push, setPush] = useState<"idle" | "busy" | "on" | "blocked" | "ios">("idle")

  const load = useCallback(async () => {
    try { setOrders((await customerApi<{ items: CustomerOrder[] }>("/api/customer/orders")).items) } catch { setOrders([]) }
  }, [])
  useEffect(() => {
    if (!account) return
    void load()
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load() }, 12000)
    return () => window.clearInterval(timer)
  }, [account, load])
  useEffect(() => {
    if (pushSupport() === "ios-install") setPush("ios")
    else if (typeof Notification !== "undefined" && Notification.permission === "granted") setPush("on")
  }, [])

  const enablePush = async () => {
    setPush("busy")
    try {
      const subscription = await subscribePush()
      if (!subscription) { setPush(pushSupport() === "ios-install" ? "ios" : "blocked"); return }
      await customerApi("/api/customer/push", { method: "POST", body: JSON.stringify({ subscription }) })
      setPush("on")
    } catch { setPush("blocked") }
  }
  const onScan = (value: string) => {
    const code = tableCode(value)
    if (code) { setScanning(false); router.push(`/table/${code}`); return }
    // QR del restaurante: /r/<restaurante>
    const slug = value.match(/\/r\/([a-z0-9-]{1,80})(?:[/?#]|$)/)?.[1]
    if (slug) { setScanning(false); router.push(`/r/${slug}`) }
    else setScanError("Ese código no es un QR de RestoPOS.")
  }
  const signOut = () => {
    if (account?.isGuest && !window.confirm("Entraste como invitado: si cerrás la sesión, este teléfono ya no verá estos pedidos. ¿Cerrar igual?")) return
    void logout()
  }

  const active = (orders ?? []).filter(isActive)
  const past = (orders ?? []).filter((order) => !isActive(order))

  return <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <MarketplaceHeader />
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      {loading ? <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
        : !account ? <section className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30"><UserRound className="h-8 w-8" /></span>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Mi cuenta</h1>
            <p className="mt-1 text-slate-500">Pedí desde tu teléfono, seguí el estado de cada pedido y mirá tu historial.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><CustomerAuthForm onDone={setAccount} /></div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => { setScanError(""); setScanning(true) }} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-900"><QrCode className="h-4 w-4" /> Escanear QR de mesa</button>
            <Link href="/marketplace" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-900"><Store className="h-4 w-4" /> Ver restaurantes</Link>
          </div>
        </section>
        : <>
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500 p-5 text-white shadow-xl shadow-indigo-500/20">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black">{account.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="text-sm text-white/80">Hola,</p><h1 className="truncate text-2xl font-black">{account.name}</h1>
                <p className="text-sm text-white/80">{!account.phone ? "Invitado en este teléfono" : account.phone.startsWith("595") ? `+595 ${account.phone.slice(3, 6)} ${account.phone.slice(6)}` : `+${account.phone}`}</p></div>
              {!account.isGuest && <button type="button" onClick={() => setEditing((value) => !value)} className="rounded-xl bg-white/15 p-2.5 hover:bg-white/25" aria-label="Editar mis datos"><Pencil className="h-4 w-4" /></button>}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
              <button type="button" onClick={() => { setScanError(""); setScanning(true) }} className="rounded-2xl bg-white/15 px-2 py-3 hover:bg-white/25"><QrCode className="mx-auto mb-1 h-5 w-5" />Escanear mesa</button>
              <Link href="/marketplace" className="rounded-2xl bg-white/15 px-2 py-3 hover:bg-white/25"><ShoppingBag className="mx-auto mb-1 h-5 w-5" />Hacer un pedido</Link>
              <button type="button" onClick={() => void enablePush()} disabled={push === "busy" || push === "on"} className="rounded-2xl bg-white/15 px-2 py-3 hover:bg-white/25 disabled:opacity-80">
                {push === "busy" ? <Loader2 className="mx-auto mb-1 h-5 w-5 animate-spin" /> : <BellRing className="mx-auto mb-1 h-5 w-5" />}{push === "on" ? "Avisos activos" : "Activar avisos"}</button>
            </div>
            {push === "ios" && <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs">En iPhone, primero agregá RestoPOS a tu pantalla de inicio (Compartir → Agregar a inicio) para recibir avisos.</p>}
            {push === "blocked" && <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs">Las notificaciones están bloqueadas en este navegador. Habilitalas en la configuración del sitio.</p>}
          </section>

          {account.isGuest && <section className="mt-4 rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-indigo-900 dark:bg-slate-900">
            <h2 className="font-bold">Guardá tu cuenta</h2>
            <p className="mb-3 mt-0.5 text-sm text-slate-500">Entraste con el QR y tu sesión queda abierta en este teléfono. Si dejás tu teléfono, guardás tus pedidos y podés entrar desde otro equipo.</p>
            <CustomerAuthForm onDone={setAccount} compact claim /></section>}
          {editing && !account.isGuest && <ProfileForm account={account} onSaved={(next) => { setAccount(next); setEditing(false) }} />}

          <section className="mt-6">
            <h2 className="mb-3 text-lg font-bold">Pedidos en curso</h2>
            {orders === null ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              : active.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
                <p className="font-semibold">No tenés pedidos en curso</p><p className="mt-1 text-sm text-slate-500">Pedí en un restaurante o escaneá el QR de tu mesa.</p>
                <Link href="/marketplace" className="mt-3 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Ver restaurantes <ChevronRight className="h-4 w-4" /></Link></div>
              : <div className="space-y-3">{active.map((order) => <OrderCard key={order.ref} order={order} highlight />)}</div>}
          </section>

          {past.length > 0 && <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold">Historial</h2>
            <div className="space-y-2">{past.map((order) => <OrderCard key={order.ref} order={order} />)}</div>
          </section>}

          <button type="button" onClick={signOut} className="mt-10 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"><LogOut className="h-4 w-4" /> Cerrar sesión</button>
        </>}
    </main>

    <CodeCamera open={scanning} onClose={() => setScanning(false)} onResult={onScan} />
    {scanning && scanError && <p className="fixed inset-x-4 bottom-6 z-[100] mx-auto max-w-sm rounded-2xl bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">{scanError}</p>}
  </div>
}

function OrderCard({ order, highlight }: { order: CustomerOrder; highlight?: boolean }) {
  return <Link href={`/cuenta/pedidos/${order.ref}`} className={`block rounded-3xl border bg-white p-4 transition hover:shadow-md dark:bg-slate-900 ${highlight ? "border-indigo-200 shadow-sm dark:border-indigo-900" : "border-slate-200 dark:border-slate-800"}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-bold">{order.restaurant.name}</p>
        <p className="text-xs text-slate-500">Pedido #{order.id} · {typeName[order.orderType] ?? order.orderType} · {new Date(order.createdAt).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${stageTone[order.stage]}`}>{order.stageLabel}</span>
    </div>
    <p className="mt-2 line-clamp-1 text-sm text-slate-600 dark:text-slate-300">{order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ") || "Sin productos"}</p>
    {highlight && <div className="mt-3"><ProgressBar order={order} /></div>}
    <div className="mt-2 flex items-center justify-between text-sm"><span className="font-bold tabular-nums">{money(order.grandTotal)}</span>
      <span className="inline-flex items-center gap-0.5 text-indigo-600">{highlight ? "Seguir pedido" : "Ver detalle"} <ChevronRight className="h-4 w-4" /></span></div>
  </Link>
}

function ProfileForm({ account, onSaved }: { account: { name: string; address: string; email: string } & Record<string, any>; onSaved: (account: any) => void }) {
  const [form, setForm] = useState({ name: account.name, address: account.address, email: account.email, currentPassword: "", newPassword: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("")
    try { onSaved((await customerApi<{ account: any }>("/api/customer/session", { method: "PATCH", body: JSON.stringify(form) })).account) }
    catch (problem) { setError(problem instanceof Error ? problem.message : "No se pudo guardar.") } finally { setBusy(false) }
  }
  const field = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
  return <form onSubmit={save} className="mt-4 space-y-3 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="font-bold">Mis datos</h2>
    <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre" className={field} />
    <label className="relative block"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Dirección para delivery" className={`${field} pl-9`} /></label>
    <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email (opcional)" className={field} />
    <details className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50"><summary className="cursor-pointer font-medium">Cambiar contraseña</summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} placeholder="Contraseña actual" className={field} />
        <input type="password" autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} placeholder="Nueva contraseña" className={field} />
      </div></details>
    {error && <p className="text-sm text-red-600">{error}</p>}
    <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button>
  </form>
}
