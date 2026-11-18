"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownCircle, ArrowLeft, ArrowUpCircle, Banknote, CheckCircle2, Clock3, Lock, LockOpen, Plus, Printer, RefreshCw, Settings2, XCircle } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ProtectedRoute from "../components/protected-route"
import { apiRequest } from "@/lib/api-client"
import { useAuth } from "../context/auth-context"

type Method = { code: string; name: string; kind: string; needsVerification: boolean; isActive: boolean }
type Session = { id: number; status: string; openingAmount: number; openedBy: string; openedAt: string; closedBy: string; closedAt: string | null
  expectedCash: number | null; countedCash: number | null; difference: number | null; notes: string }
type Summary = { openingAmount: number; byMethod: { method: string; name: string; kind: string; confirmed: number; pending: number; rejected: number; count: number }[]
  salesTotal: number; salesCount: number; incomes: number; expenses: number; cashSales: number; cashIncomes: number; cashExpenses: number; expectedCash: number; pendingCount: number }
type Movement = { id: number; kind: "income" | "expense"; method: string; amount: number; description: string; userName: string; createdAt: string }
type Payment = { id: number; saleId: number | null; orderId: number | null; method: string; methodName: string; amount: number; status: string; reference: string
  createdBy: string; verifiedBy: string; verifyNote: string; createdAt: string; customerName: string }
type CashState = { session: Session | null; summary: Summary | null; methods: Method[]; movements: Movement[]; payments: Payment[]; pending: Payment[]
  history: Session[]; withoutSession: { count: number; total: number } }

const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const time = (iso: string) => new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
const digits = (value: string) => value.replace(/\D/g, "").slice(0, 12)

export default function CashPage() {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [state, setState] = useState<CashState | null>(null)
  const [busy, setBusy] = useState(false)
  const [opening, setOpening] = useState("")
  const [openNotes, setOpenNotes] = useState("")
  const [movement, setMovement] = useState({ kind: "expense" as "income" | "expense", method: "cash", amount: "", description: "" })
  const [closing, setClosing] = useState(false)
  const [counted, setCounted] = useState("")
  const [closeNotes, setCloseNotes] = useState("")
  const [rejecting, setRejecting] = useState<Payment | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [showMethods, setShowMethods] = useState(false)

  const load = useCallback(async () => {
    try { setState(await apiRequest<CashState>("/api/cash")) } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cargar la caja") }
  }, [])
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); return () => window.clearInterval(timer) }, [load])

  const run = async (body: Record<string, unknown>, done: string) => {
    setBusy(true)
    try { await apiRequest("/api/cash", { method: "POST", body: JSON.stringify(body) }); toast.success(done); await load(); return true }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo completar"); return false }
    finally { setBusy(false) }
  }
  const verify = async (payment: Payment, action: "confirm" | "reject", note = "") => {
    setBusy(true)
    try {
      await apiRequest(`/api/payments/${payment.id}`, { method: "PATCH", body: JSON.stringify({ action, note }) })
      toast.success(action === "confirm" ? "Pago confirmado" : "Pago rechazado")
      setRejecting(null); setRejectNote(""); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo verificar") }
    finally { setBusy(false) }
  }

  const session = state?.session ?? null
  const summary = state?.summary ?? null
  const methodName = useMemo(() => new Map((state?.methods ?? []).map((method) => [method.code, method.name])), [state?.methods])
  const countedValue = Number(counted || 0)
  const difference = summary ? countedValue - summary.expectedCash : 0

  return <ProtectedRoute requiredPermissions={["manage_sales"]}>
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Button variant="ghost" size="sm" onClick={() => router.push("/pos")} className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> POS</Button>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight"><Banknote className="h-8 w-8 text-emerald-600" /> Caja</h1>
            <p className="text-muted-foreground">Apertura, ventas por medio de pago, ingresos, egresos y cierre con arqueo.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasPermission("manage_company") && <Button variant="outline" onClick={() => setShowMethods(true)}><Settings2 className="mr-2 h-4 w-4" /> Medios de pago</Button>}
            {session && <Button variant="outline" onClick={() => window.open(`/cash/report/${session.id}`, "_blank")}><Printer className="mr-2 h-4 w-4" /> Imprimir parcial</Button>}
            <Button variant="outline" onClick={() => void load()} aria-label="Actualizar"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </header>

        {!state ? <p className="py-20 text-center text-muted-foreground">Cargando caja…</p> : !session ? (
          <section className="mx-auto max-w-xl rounded-3xl border bg-white p-6 shadow-sm dark:bg-slate-900">
            <div className="flex items-center gap-3"><div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"><Lock className="h-6 w-6" /></div>
              <div><h2 className="text-xl font-bold">La caja está cerrada</h2><p className="text-sm text-muted-foreground">Contá el efectivo inicial (cambio) y abrí la caja para empezar el turno.</p></div></div>
            {state.withoutSession.count > 0 && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              En las últimas 24 h se cobraron {state.withoutSession.count} ventas ({money(state.withoutSession.total)}) sin caja abierta.</p>}
            <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); void run({ action: "open", amount: Number(opening || 0), notes: openNotes }, "Caja abierta").then((ok) => ok && setOpening("")) }}>
              <label className="block text-sm font-semibold">Monto inicial en efectivo
                <Input inputMode="numeric" value={opening} onChange={(event) => setOpening(digits(event.target.value))} placeholder="0" className="mt-1 h-12 text-lg" /></label>
              <label className="block text-sm font-semibold">Notas (opcional)
                <Input value={openNotes} onChange={(event) => setOpenNotes(event.target.value)} maxLength={300} className="mt-1" /></label>
              <Button type="submit" disabled={busy} className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700"><LockOpen className="mr-2 h-5 w-5" /> Abrir caja</Button>
            </form>
          </section>
        ) : summary && (
          <div className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat title="Efectivo esperado" value={money(summary.expectedCash)} note={`Inicial ${money(summary.openingAmount)} + ventas ${money(summary.cashSales)}`} tone="from-emerald-500 to-teal-600" />
              <Stat title="Ventas del turno" value={money(summary.salesTotal)} note={`${summary.salesCount} cobros`} tone="from-indigo-600 to-violet-600" />
              <Stat title="Ingresos" value={money(summary.incomes)} note={`Efectivo ${money(summary.cashIncomes)}`} tone="from-sky-500 to-blue-600" />
              <Stat title="Egresos" value={money(summary.expenses)} note={`Efectivo ${money(summary.cashExpenses)}`} tone="from-rose-500 to-orange-500" />
            </section>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" /> Abierta por {session.openedBy} el {time(session.openedAt)}</p>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
                <h2 className="font-bold">Ventas por medio de pago</h2>
                <table className="mt-3 w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Medio</th><th>Cobros</th><th className="text-right">Confirmado</th><th className="text-right">Por verificar</th></tr></thead>
                  <tbody>{summary.byMethod.length ? summary.byMethod.map((row) => <tr key={row.method} className="border-t">
                    <td className="py-2 font-medium">{row.name}</td><td>{row.count}</td><td className="text-right">{money(row.confirmed)}</td>
                    <td className="text-right text-amber-700">{row.pending ? money(row.pending) : "—"}</td></tr>)
                    : <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Todavía no hay cobros en este turno.</td></tr>}</tbody>
                </table>
              </section>
              <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
                <h2 className="font-bold">Registrar ingreso o egreso</h2>
                <form className="mt-3 space-y-3" onSubmit={(event) => {
                  event.preventDefault()
                  void run({ action: "movement", ...movement, amount: Number(movement.amount || 0) }, movement.kind === "income" ? "Ingreso registrado" : "Egreso registrado")
                    .then((ok) => ok && setMovement((current) => ({ ...current, amount: "", description: "" })))
                }}>
                  <div className="grid grid-cols-2 gap-2">
                    {(["income", "expense"] as const).map((kind) => <button key={kind} type="button" onClick={() => setMovement((current) => ({ ...current, kind }))}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-sm font-semibold ${movement.kind === kind ? kind === "income" ? "border-sky-500 bg-sky-50 text-sky-800" : "border-rose-500 bg-rose-50 text-rose-800" : ""}`}>
                      {kind === "income" ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}{kind === "income" ? "Ingreso" : "Egreso"}</button>)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input inputMode="numeric" value={movement.amount} onChange={(event) => setMovement((current) => ({ ...current, amount: digits(event.target.value) }))} placeholder="Monto" />
                    <select value={movement.method} onChange={(event) => setMovement((current) => ({ ...current, method: event.target.value }))} className="h-10 rounded-md border bg-background px-3 text-sm">
                      {state.methods.filter((method) => method.isActive).map((method) => <option key={method.code} value={method.code}>{method.name}</option>)}
                    </select>
                  </div>
                  <Input value={movement.description} onChange={(event) => setMovement((current) => ({ ...current, description: event.target.value }))} maxLength={200}
                    placeholder={movement.kind === "income" ? "Ej.: refuerzo de cambio" : "Ej.: compra de hielo, pago a proveedor"} />
                  <Button type="submit" disabled={busy || !movement.amount || !movement.description.trim()} className="w-full"><Plus className="mr-2 h-4 w-4" /> Registrar</Button>
                </form>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
                <h2 className="font-bold">Cobros del turno</h2>
                <ul className="mt-3 max-h-80 divide-y overflow-y-auto text-sm">{state.payments.length ? state.payments.map((payment) => <li key={payment.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0"><p className="truncate font-medium">{payment.saleId ? `Venta #${payment.saleId}` : "Pago"} · {payment.customerName || "Cliente"}</p>
                    <p className="text-xs text-muted-foreground">{time(payment.createdAt)} · {payment.methodName}{payment.reference ? ` · ${payment.reference}` : ""}</p></div>
                  <div className="text-right"><strong>{money(payment.amount)}</strong><StatusBadge status={payment.status} /></div></li>)
                  : <li className="py-6 text-center text-muted-foreground">Sin cobros todavía.</li>}</ul>
              </section>
              <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
                <h2 className="font-bold">Ingresos y egresos</h2>
                <ul className="mt-3 max-h-80 divide-y overflow-y-auto text-sm">{state.movements.length ? state.movements.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0"><p className="truncate font-medium">{item.description}</p><p className="text-xs text-muted-foreground">{time(item.createdAt)} · {methodName.get(item.method) ?? item.method} · {item.userName}</p></div>
                  <strong className={item.kind === "income" ? "text-sky-700" : "text-rose-700"}>{item.kind === "income" ? "+" : "−"}{money(item.amount)}</strong></li>)
                  : <li className="py-6 text-center text-muted-foreground">Sin movimientos.</li>}</ul>
              </section>
            </div>

            <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-bold">Cerrar caja</h2><p className="text-sm text-muted-foreground">Contá el efectivo del cajón; el sistema calcula la diferencia con lo esperado.</p></div>
                <Button onClick={() => { setCounted(String(summary.expectedCash)); setClosing(true) }} className="bg-slate-900 hover:bg-slate-800"><Lock className="mr-2 h-4 w-4" /> Cerrar caja</Button>
              </div>
            </section>
          </div>
        )}

        {state && state.pending.length > 0 && <section className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/30">
          <h2 className="font-bold text-amber-900 dark:text-amber-200">Pagos por verificar ({state.pending.length})</h2>
          <p className="text-sm text-amber-800 dark:text-amber-300">Confirmá cada transferencia o pago QR recién cuando lo veas acreditado en el banco o la billetera.</p>
          <ul className="mt-3 divide-y divide-amber-200 text-sm">{state.pending.map((payment) => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
            <div><p className="font-semibold">{money(payment.amount)} · {payment.methodName}{payment.reference ? ` · ref. ${payment.reference}` : ""}</p>
              <p className="text-xs">{payment.saleId ? `Venta #${payment.saleId}` : ""} · {payment.customerName || "Cliente"} · {time(payment.createdAt)} · cobró {payment.createdBy}</p></div>
            <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => void verify(payment, "confirm")} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => { setRejecting(payment); setRejectNote("") }} className="border-red-300 text-red-700"><XCircle className="mr-1 h-4 w-4" /> Rechazar</Button></div>
          </li>)}</ul>
        </section>}

        {state && state.history.length > 0 && <section className="mt-6 rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="font-bold">Cierres anteriores</h2>
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Turno</th><th>Cerró</th><th className="text-right">Esperado</th><th className="text-right">Contado</th><th className="text-right">Diferencia</th><th /></tr></thead>
            <tbody>{state.history.map((item) => <tr key={item.id} className="border-t">
              <td className="py-2">#{item.id} · {time(item.openedAt)} → {item.closedAt ? time(item.closedAt) : ""}</td><td>{item.closedBy}</td>
              <td className="text-right">{money(item.expectedCash ?? 0)}</td><td className="text-right">{money(item.countedCash ?? 0)}</td>
              <td className={`text-right font-semibold ${(item.difference ?? 0) === 0 ? "text-emerald-700" : (item.difference ?? 0) > 0 ? "text-sky-700" : "text-red-700"}`}>{(item.difference ?? 0) > 0 ? "+" : ""}{money(item.difference ?? 0)}</td>
              <td className="text-right"><Button size="sm" variant="ghost" onClick={() => window.open(`/cash/report/${item.id}`, "_blank")}><Printer className="h-4 w-4" /></Button></td></tr>)}</tbody>
          </table></div>
        </section>}
      </div>

      <Dialog open={closing} onOpenChange={setClosing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cerrar caja</DialogTitle><DialogDescription>Ingresá el efectivo contado en el cajón.</DialogDescription></DialogHeader>
          {summary && <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
              <p className="flex justify-between"><span>Inicial</span><span>{money(summary.openingAmount)}</span></p>
              <p className="flex justify-between"><span>Ventas en efectivo</span><span>{money(summary.cashSales)}</span></p>
              <p className="flex justify-between"><span>Ingresos en efectivo</span><span>{money(summary.cashIncomes)}</span></p>
              <p className="flex justify-between"><span>Egresos en efectivo</span><span>−{money(summary.cashExpenses)}</span></p>
              <p className="mt-1 flex justify-between border-t pt-1 font-bold"><span>Esperado</span><span>{money(summary.expectedCash)}</span></p>
            </div>
            <label className="block text-sm font-semibold">Efectivo contado<Input inputMode="numeric" value={counted} onChange={(event) => setCounted(digits(event.target.value))} className="mt-1 h-12 text-lg" /></label>
            <p className={`rounded-xl p-3 text-sm font-semibold ${difference === 0 ? "bg-emerald-50 text-emerald-800" : difference > 0 ? "bg-sky-50 text-sky-800" : "bg-red-50 text-red-800"}`}>
              {difference === 0 ? "La caja cuadra." : difference > 0 ? `Sobrante de ${money(difference)}` : `Faltante de ${money(-difference)}`}</p>
            {summary.pendingCount > 0 && <p className="text-sm text-amber-700">Hay {summary.pendingCount} pagos sin verificar; quedan en la lista de pagos por verificar.</p>}
            <Input value={closeNotes} onChange={(event) => setCloseNotes(event.target.value)} placeholder="Notas del cierre (opcional)" maxLength={300} />
            <Button disabled={busy || counted === ""} className="w-full" onClick={() => void run({ action: "close", countedCash: countedValue, notes: closeNotes }, "Caja cerrada").then((ok) => {
              if (ok) { setClosing(false); setCloseNotes(""); if (session) window.open(`/cash/report/${session.id}`, "_blank") }
            })}><Lock className="mr-2 h-4 w-4" /> Cerrar e imprimir arqueo</Button>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={rejecting !== null} onOpenChange={(open) => { if (!open) setRejecting(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rechazar pago</DialogTitle><DialogDescription>El pago queda marcado como no acreditado en la venta.</DialogDescription></DialogHeader>
          <Input value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} placeholder="Motivo (obligatorio)" maxLength={200} />
          <Button variant="destructive" disabled={busy || !rejectNote.trim() || !rejecting} onClick={() => rejecting && void verify(rejecting, "reject", rejectNote)}>Rechazar pago</Button>
        </DialogContent>
      </Dialog>

      <PaymentMethodsDialog open={showMethods} onOpenChange={setShowMethods} onChanged={() => void load()} />
    </main>
  </ProtectedRoute>
}

function Stat({ title, value, note, tone }: { title: string; value: string; note: string; tone: string }) {
  return <div className={`rounded-2xl bg-gradient-to-br ${tone} p-5 text-white shadow-lg`}><p className="text-sm opacity-80">{title}</p><strong className="text-2xl">{value}</strong><p className="mt-1 text-xs opacity-80">{note}</p></div>
}

function StatusBadge({ status }: { status: string }) {
  const label = status === "pending" ? "por verificar" : status === "rejected" ? "rechazado" : "confirmado"
  const tone = status === "pending" ? "bg-amber-100 text-amber-800" : status === "rejected" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
  return <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{label}</span>
}

function PaymentMethodsDialog({ open, onOpenChange, onChanged }: { open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const [items, setItems] = useState<Method[]>([])
  const [name, setName] = useState("")
  const [kind, setKind] = useState("other")
  const load = useCallback(() => apiRequest<{ items: Method[] }>("/api/payment-methods?all=1").then((result) => setItems(result.items)).catch(() => undefined), [])
  useEffect(() => { if (open) void load() }, [open, load])
  const patch = async (code: string, changes: Record<string, unknown>) => {
    try { const result = await apiRequest<{ items: Method[] }>(`/api/payment-methods/${code}`, { method: "PATCH", body: JSON.stringify(changes) }); setItems(result.items); onChanged() }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar") }
  }
  const add = async () => {
    try { const result = await apiRequest<{ items: Method[] }>("/api/payment-methods", { method: "POST", body: JSON.stringify({ name, kind }) }); setItems(result.items); setName(""); onChanged() }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo agregar") }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Medios de pago</DialogTitle><DialogDescription>Los activos aparecen al cobrar. Los que piden verificación quedan pendientes hasta confirmarlos en Caja.</DialogDescription></DialogHeader>
      <ul className="divide-y text-sm">{items.map((method) => <li key={method.code} className="flex items-center justify-between gap-3 py-2">
        <span className={method.isActive ? "font-medium" : "text-muted-foreground line-through"}>{method.name}</span>
        <div className="flex items-center gap-3">
          {method.kind !== "cash" && <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={method.needsVerification} onChange={(event) => void patch(method.code, { needsVerification: event.target.checked })} /> verificar</label>}
          {method.code !== "cash" && <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={method.isActive} onChange={(event) => void patch(method.code, { isActive: event.target.checked })} /> activo</label>}
        </div></li>)}</ul>
      <div className="flex gap-2">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nuevo medio (ej.: Tigo Money)" maxLength={60} />
        <select value={kind} onChange={(event) => setKind(event.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
          <option value="other">Otro</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="qr">QR / billetera</option>
        </select>
        <Button onClick={() => void add()} disabled={!name.trim()}><Plus className="h-4 w-4" /></Button>
      </div>
    </DialogContent>
  </Dialog>
}
