"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye, EyeOff, Loader2, Phone, UserRound } from "lucide-react"

// Cuenta del cliente: sesión, ingreso y registro (teléfono + contraseña).

export type CustomerAccount = { id: number; name: string; phone: string; email: string; address: string; createdAt: string; isGuest?: boolean }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error || "No se pudo completar.")
  return body as T
}
export const customerApi = call

export function useCustomer() {
  const [account, setAccount] = useState<CustomerAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    try { setAccount((await call<{ account: CustomerAccount | null }>("/api/customer/session")).account) } catch { setAccount(null) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const logout = async () => { await call("/api/customer/session", { method: "DELETE" }).catch(() => undefined); setAccount(null) }
  return { account, loading, setAccount, refresh, logout }
}

/** Ingresar o crear cuenta. Con `claim`, el invitado (entró por el QR) guarda su cuenta con teléfono y conserva sus pedidos. */
export function CustomerAuthForm({ onDone, compact = false, claim = false }: { onDone: (account: CustomerAccount) => void; compact?: boolean; claim?: boolean }) {
  const [mode, setMode] = useState<"login" | "register" | "claim">(claim ? "claim" : "login")
  const modes = claim ? (["claim", "login"] as const) : (["login", "register"] as const)
  const tabLabel = { login: claim ? "Ya tengo cuenta" : "Ingresar", register: "Crear cuenta", claim: "Guardar mi cuenta" } as const
  const [form, setForm] = useState({ name: "", phone: "", password: "" })
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setError("")
    try { onDone((await call<{ account: CustomerAccount }>("/api/customer/session", { method: "POST", body: JSON.stringify({ mode, ...form }) })).account) }
    catch (problem) { setError(problem instanceof Error ? problem.message : "No se pudo ingresar.") }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="space-y-3">
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
      {modes.map((value) => <button key={value} type="button" onClick={() => { setMode(value); setError("") }}
        className={`rounded-xl py-2 text-sm font-semibold transition ${mode === value ? "bg-white shadow dark:bg-slate-900" : "text-slate-500"}`}>{tabLabel[value]}</button>)}
    </div>
    {!compact && <p className="text-sm text-slate-500">{mode === "login" ? "Ingresá con tu teléfono para ver tus pedidos." : mode === "claim" ? "Tus pedidos quedan guardados y podés entrar desde otro teléfono." : "Una sola cuenta para pedir en todos los restaurantes de RestoPOS."}</p>}
    {mode !== "login" && <label className="relative block">
      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre y apellido"
        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900" /></label>}
    <label className="relative block">
      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Teléfono (WhatsApp) · 0981 123 456"
        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900" /></label>
    <label className="relative block">
      <input required minLength={6} type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password}
        onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={mode === "login" ? "Contraseña" : "Elegí una contraseña (mín. 6)"}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 pr-11 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900" />
      <button type="button" onClick={() => setShow((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></label>
    {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
    <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-60">
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "login" ? "Ingresar" : mode === "claim" ? "Guardar mi cuenta" : "Crear mi cuenta"}</button>
  </form>
}
