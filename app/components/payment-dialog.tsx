"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, Banknote, CheckCircle2, CreditCard, Loader2, Lock, Plus, Printer, QrCode, Search, Smartphone, Split, Trash2, UserPlus, UserRound,
  Wallet, X, BookUser } from "lucide-react"
import toast from "react-hot-toast"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/api-client"
import { consultarRuc, formatRuc } from "@/lib/ruc-service"
import type { Customer, ServiceOrder } from "@/lib/service-order-types"
import { useCart } from "../context/cart-context"
import { useAuth } from "../context/auth-context"
import { useSales } from "../context/sales-context"

// Cobro en una ventana: medios de pago (uno o varios), vuelto, referencia y venta a crédito con cuenta corriente.

type Method = { code: string; name: string; kind: string; needsVerification: boolean }
type Line = { key: number; method: string; amount: string; reference: string }
type Cycle = Customer["billingCycle"]
type Done = { id: number; change: number; creditBalance: number | null; customer: string; methodName: string; pending: boolean }

const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const digits = (value: string) => Number(value.replace(/\D/g, "")) || 0
const cycles: { value: Cycle; label: string }[] = [
  { value: "weekly", label: "Semanal" }, { value: "biweekly", label: "Quincenal" }, { value: "monthly", label: "Mensual" },
]
const cycleName: Record<Cycle, string> = { weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual", none: "Sin ciclo" }
const PRINT_KEY = "restopos:print-on-pay"

function MethodIcon({ kind, className = "h-5 w-5" }: { kind: string; className?: string }) {
  const Icon = kind === "cash" ? Banknote : kind === "card" ? CreditCard : kind === "qr" ? QrCode : kind === "transfer" ? Smartphone : kind === "credit" ? BookUser : Wallet
  return <Icon className={className} />
}

const tone: Record<string, string> = {
  cash: "from-emerald-500 to-green-600", card: "from-sky-500 to-indigo-600", transfer: "from-violet-500 to-fuchsia-600",
  qr: "from-amber-500 to-orange-600", credit: "from-rose-500 to-pink-600", other: "from-slate-500 to-slate-700",
}

/** Sugerencias de billetes para el efectivo recibido (monto exacto y redondeos hacia arriba). */
function cashSuggestions(amount: number) {
  const set = new Set<number>([amount])
  for (const step of [5_000, 10_000, 20_000, 50_000, 100_000]) set.add(Math.ceil(amount / step) * step)
  return [...set].filter((value) => value >= amount).sort((a, b) => a - b).slice(0, 5)
}

export type PaymentTarget = { kind: "cart" } | { kind: "order"; orderId: number }

export default function PaymentDialog({ target, onClose, onPaid }: { target: PaymentTarget | null; onClose: () => void; onPaid?: (saleId: number) => void }) {
  const { cart, getCartTotal, clearCart, orderType } = useCart()
  const { user } = useAuth()
  const { addSale } = useSales()
  const [methods, setMethods] = useState<Method[]>([])
  const [cashOpen, setCashOpen] = useState(true)
  const [order, setOrder] = useState<ServiceOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [received, setReceived] = useState("")
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [invoice, setInvoice] = useState({ open: false, ruc: "", name: "", checking: false })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const [printOnPay, setPrintOnPay] = useState(true)
  const keyRef = useRef(1)
  const open = target !== null

  const total = target?.kind === "order" ? order?.grandTotal ?? 0 : getCartTotal()
  const itemCount = target?.kind === "order" ? order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0 : cart.reduce((sum, item) => sum + item.quantity, 0)

  // Al abrir: medios de pago, la orden (si corresponde) y estado inicial.
  useEffect(() => {
    if (!target) return
    setDone(null); setCustomer(null); setReceived(""); setInvoice({ open: false, ruc: "", name: "", checking: false })
    try { setPrintOnPay(localStorage.getItem(PRINT_KEY) !== "0") } catch { /* sin almacenamiento */ }
    apiRequest<{ items: Method[]; cashOpen: boolean }>("/api/payment-methods")
      .then((result) => { setMethods(result.items); setCashOpen(result.cashOpen) })
      .catch(() => setMethods([{ code: "cash", name: "Efectivo", kind: "cash", needsVerification: false }]))
    if (target.kind === "order") {
      setLoading(true); setOrder(null)
      apiRequest<{ order: ServiceOrder }>(`/api/service-orders/${target.orderId}`)
        .then(({ order }) => {
          if (order.status !== "open" || order.items.length === 0) { toast.error("La orden ya no está abierta."); onClose(); return }
          setOrder(order)
          if (order.customerName) setInvoice((current) => ({ ...current, name: order.customerName }))
        })
        .catch((error) => { toast.error(error.message); onClose() })
        .finally(() => setLoading(false))
    } else setOrder(null)
    setLines([{ key: keyRef.current++, method: "cash", amount: "", reference: "" }])
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

  const methodOf = (code: string) => methods.find((method) => method.code === code)
  const split = lines.length > 1
  // Con un solo medio, el monto es siempre el total.
  const amounts = lines.map((line) => split ? digits(line.amount) : total)
  const paid = amounts.reduce((sum, value) => sum + value, 0)
  const remaining = total - paid
  const cashDue = lines.reduce((sum, line, index) => sum + (methodOf(line.method)?.kind === "cash" ? amounts[index] : 0), 0)
  const creditDue = lines.reduce((sum, line, index) => sum + (methodOf(line.method)?.kind === "credit" ? amounts[index] : 0), 0)
  const receivedValue = received ? digits(received) : cashDue
  const change = receivedValue - cashDue
  const afterBalance = customer ? customer.balance + creditDue : 0
  const overLimit = Boolean(customer && creditDue > 0 && customer.creditLimit != null && afterBalance > customer.creditLimit)

  const problem = useMemo(() => {
    if (!methods.length || total <= 0) return "Cargando…"
    if (lines.some((line) => !methodOf(line.method))) return "Elegí el medio de pago."
    if (split && lines.some((_, index) => amounts[index] <= 0)) return "Completá el monto de cada medio."
    if (remaining > 0) return `Falta asignar ${money(remaining)}.`
    if (remaining < 0) return `Los montos superan el total por ${money(-remaining)}.`
    if (cashDue > 0 && receivedValue < cashDue) return "El efectivo recibido no alcanza."
    if (creditDue > 0 && !customer) return "Elegí o registrá el cliente para cargarlo a su cuenta."
    if (creditDue > 0 && customer && !customer.creditEnabled) return "Habilitá el crédito para este cliente."
    if (overLimit) return "Supera el límite de crédito del cliente."
    return null
  }, [methods, total, lines, split, amounts, remaining, cashDue, receivedValue, creditDue, customer, overLimit]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickMethod = (code: string) => {
    if (!split) { setLines([{ ...lines[0], method: code, reference: "" }]); return }
    // En pago dividido, el mosaico agrega ese medio con lo que falta (o lo enfoca si ya está).
    if (lines.some((line) => line.method === code)) return
    setLines([...lines, { key: keyRef.current++, method: code, amount: remaining > 0 ? String(remaining) : "", reference: "" }])
  }

  const startSplit = () => {
    const first = { ...lines[0], amount: String(Math.ceil(total / 2)) }
    const other = methods.find((method) => method.code !== first.method && method.kind !== "credit") ?? methods[0]
    setLines([first, { key: keyRef.current++, method: other.code, amount: String(total - Math.ceil(total / 2)), reference: "" }])
  }

  const updateLine = (key: number, changes: Partial<Line>) => setLines((current) => current.map((line) => line.key === key ? { ...line, ...changes } : line))
  const removeLine = (key: number) => setLines((current) => {
    const next = current.filter((line) => line.key !== key)
    return next.length === 1 ? [{ ...next[0], amount: "" }] : next
  })

  const lookedUp = useRef("")
  const lookupRuc = async (quiet = false) => {
    const base = invoice.ruc.trim().split("-")[0].replace(/\D/g, "")
    if (base.length < 5) return
    lookedUp.current = base
    setInvoice((current) => ({ ...current, checking: true }))
    try {
      const result = await consultarRuc(invoice.ruc)
      if (result.isValid && result.data) {
        setInvoice((current) => ({ ...current, ruc: result.data!.ruc || formatRuc(current.ruc), name: result.data!.name }))
        if (!quiet) toast.success(`RUC válido: ${result.data.name}`)
      } else toast.error(result.error || "RUC no encontrado")
    } catch { toast.error("No se pudo consultar el RUC") } finally { setInvoice((current) => ({ ...current, checking: false })) }
  }
  // Consulta sola al dejar de escribir la cédula o el RUC (6 dígitos o más).
  useEffect(() => {
    const base = invoice.ruc.trim().split("-")[0].replace(/\D/g, "")
    if (!invoice.open || base.length < 6 || base === lookedUp.current) return
    const timer = window.setTimeout(() => void lookupRuc(true), 800)
    return () => window.clearTimeout(timer)
  }, [invoice.ruc, invoice.open]) // eslint-disable-line react-hooks/exhaustive-deps

  const charge = async () => {
    if (problem || busy || !target) return
    setBusy(true)
    const printWindow = printOnPay ? window.open("", "_blank") : null
    try {
      const sale = await addSale({
        items: target.kind === "cart" ? cart : [],
        ...(target.kind === "order" ? { serviceOrderId: target.orderId } : {}),
        total, orderType: order?.orderType ?? orderType,
        payments: lines.map((line, index) => ({ method: line.method, amount: amounts[index], reference: line.reference })),
        cashReceived: cashDue > 0 ? receivedValue : undefined,
        customerId: customer?.id ?? null,
        customerName: customer ? undefined : invoice.name.trim() || undefined,
        customerRuc: customer ? undefined : invoice.ruc.trim() || undefined,
      }) as any
      const id = Number(sale.id)
      if (printWindow) printWindow.location.href = `/receipt/sale/${id}?auto=1`
      if (target.kind === "cart") clearCart()
      else {
        if (user) sessionStorage.removeItem(`pos:activeOrder:${user.id}`)
        window.dispatchEvent(new Event("orders:changed"))
      }
      setDone({ id, change: cashDue > 0 ? change : 0, creditBalance: sale.creditBalance ?? null, customer: customer?.name ?? "",
        methodName: lines.map((line) => methodOf(line.method)?.name ?? line.method).join(" + "), pending: lines.some((line) => methodOf(line.method)?.needsVerification) })
      onPaid?.(id)
    } catch (error) {
      printWindow?.close()
      toast.error(error instanceof Error ? error.message : "No se pudo cobrar.")
    } finally { setBusy(false) }
  }

  const togglePrint = (value: boolean) => { setPrintOnPay(value); try { localStorage.setItem(PRINT_KEY, value ? "1" : "0") } catch { /* sin almacenamiento */ } }
  const single = !split ? methodOf(lines[0]?.method ?? "") : undefined
  const title = target?.kind === "order" ? `Cobrar orden #${target.orderId}` : "Cobrar venta"
  const subtitle = target?.kind === "order" && order
    ? [order.tableLabel || null, order.customerName || null, `${itemCount} producto${itemCount === 1 ? "" : "s"}`].filter(Boolean).join(" · ")
    : `${itemCount} producto${itemCount === 1 ? "" : "s"}`

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && !busy) onClose() }}>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 sm:rounded-2xl">
        {done ? <Success done={done} onPrint={() => window.open(`/receipt/sale/${done.id}?auto=1`, "_blank")} onClose={onClose} /> : <>
          <div className="relative shrink-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 px-5 pb-4 pt-5 text-white sm:px-6 sm:pb-5 sm:pt-6">
            <DialogTitle className="text-sm font-medium uppercase tracking-wider text-indigo-200">{title}</DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-indigo-200/80">{loading ? "Cargando la orden…" : subtitle}</DialogDescription>
            <p className="mt-3 text-4xl font-bold tabular-nums sm:text-5xl">{money(total)}</p>
            {order && order.deliveryFee > 0 && <p className="mt-1 text-xs text-indigo-200">Incluye envío {money(order.deliveryFee)}</p>}
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {!cashOpen && <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" /><span>La caja está cerrada: la venta se registra, pero no entra en ningún arqueo. <Link href="/cash" className="font-semibold underline" onClick={onClose}>Abrir caja</Link></span></div>}

            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">¿Cómo paga?</p>
                {!split ? <button type="button" onClick={startSplit} disabled={methods.length < 2} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40">
                  <Split className="h-3.5 w-3.5" /> Dividir pago</button>
                  : <span className="text-xs text-muted-foreground">Tocá un medio para sumarlo</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {methods.map((method) => {
                  const active = lines.some((line) => line.method === method.code)
                  return <button type="button" key={method.code} onClick={() => pickMethod(method.code)}
                    className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-transparent bg-gradient-to-br text-white shadow-lg " + (tone[method.kind] ?? tone.other) : "hover:border-indigo-300 hover:bg-muted/60"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/20" : "bg-muted"}`}><MethodIcon kind={method.kind} /></span>
                    <span className="min-w-0 flex-1 text-sm font-medium leading-tight">{method.kind === "credit" ? "A cuenta (crédito)" : method.name}</span>
                    {method.needsVerification && <span className={`absolute right-2 top-1.5 text-[9px] font-semibold uppercase ${active ? "text-white/80" : "text-amber-600"}`}>verificar</span>}
                  </button>
                })}
              </div>
            </section>

            {split && <section className="space-y-2">
              {lines.map((line, index) => {
                const method = methodOf(line.method)
                return <div key={line.key} className="rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white ${tone[method?.kind ?? "other"] ?? tone.other}`}><MethodIcon kind={method?.kind ?? "other"} className="h-4 w-4" /></span>
                    <select value={line.method} onChange={(event) => updateLine(line.key, { method: event.target.value, reference: "" })} className="min-w-0 flex-1 rounded-lg border bg-background px-2 py-2 text-sm">
                      {methods.map((option) => <option key={option.code} value={option.code}>{option.kind === "credit" ? "A cuenta (crédito)" : option.name}</option>)}
                    </select>
                    <div className="relative w-36">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Gs</span>
                      <Input inputMode="numeric" value={line.amount ? digits(line.amount).toLocaleString("es-PY") : ""} onChange={(event) => updateLine(line.key, { amount: event.target.value })}
                        className="pl-8 text-right font-semibold tabular-nums" placeholder="0" aria-label={`Monto ${method?.name ?? ""}`} />
                    </div>
                    <button type="button" onClick={() => removeLine(line.key)} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Quitar medio"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {index === lines.length - 1 && remaining > 0 && <button type="button" onClick={() => updateLine(line.key, { amount: String(amounts[index] + remaining) })} className="mt-2 text-xs font-medium text-indigo-600 hover:underline">Completar con lo que falta ({money(remaining)})</button>}
                  {method?.needsVerification && <Input value={line.reference} onChange={(event) => updateLine(line.key, { reference: event.target.value })} placeholder="Referencia (n.º de operación, últimos dígitos…)" maxLength={80} className="mt-2" />}
                </div>
              })}
              <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium ${remaining === 0 ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"}`}>
                <span>{remaining === 0 ? "Total cubierto" : remaining > 0 ? "Falta" : "Sobra"}</span><span className="tabular-nums">{money(Math.abs(remaining))}</span>
              </div>
              <button type="button" onClick={() => setLines([...lines, { key: keyRef.current++, method: methods.find((m) => !lines.some((l) => l.method === m.code))?.code ?? methods[0].code, amount: remaining > 0 ? String(remaining) : "", reference: "" }])}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"><Plus className="h-3.5 w-3.5" /> Agregar otro medio</button>
            </section>}

            {!split && single?.needsVerification && <section className="space-y-1">
              <label className="text-sm font-semibold" htmlFor="pay-ref">Referencia (opcional)</label>
              <Input id="pay-ref" value={lines[0].reference} onChange={(event) => updateLine(lines[0].key, { reference: event.target.value })} placeholder="N.º de operación, últimos dígitos…" maxLength={80} />
              <p className="text-xs text-muted-foreground">Queda pendiente hasta que caja lo verifique en el banco o la billetera.</p>
            </section>}

            {cashDue > 0 && <section className="rounded-2xl bg-emerald-50/70 p-4 dark:bg-emerald-950/30">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem] flex-1">
                  <label htmlFor="cash-received" className="text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">Recibido en efectivo{split ? ` (de ${money(cashDue)})` : ""}</label>
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Gs</span>
                    <Input id="cash-received" autoFocus inputMode="numeric" value={received ? digits(received).toLocaleString("es-PY") : ""} placeholder={cashDue.toLocaleString("es-PY")}
                      onChange={(event) => setReceived(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void charge() }}
                      className="h-12 bg-background pl-10 text-right text-2xl font-bold tabular-nums placeholder:font-medium placeholder:text-muted-foreground/40" />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">Vuelto</p>
                  <p className={`text-3xl font-bold tabular-nums ${change < 0 ? "text-red-600" : "text-emerald-700 dark:text-emerald-300"}`}>{change < 0 ? `Faltan ${money(-change)}` : money(change)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {cashSuggestions(cashDue).map((value) => <button type="button" key={value} onClick={() => setReceived(String(value))}
                  className={`rounded-full border px-3 py-1 text-sm font-medium tabular-nums transition ${receivedValue === value ? "border-emerald-600 bg-emerald-600 text-white" : "bg-background hover:border-emerald-400"}`}>
                  {value === cashDue ? "Exacto" : value.toLocaleString("es-PY")}</button>)}
              </div>
            </section>}

            {creditDue > 0 && <CreditCustomer customer={customer} onChange={setCustomer} charge={creditDue} />}

            {creditDue === 0 && <section className="rounded-xl border">
              <button type="button" onClick={() => setInvoice((current) => ({ ...current, open: !current.open }))} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 font-medium">{customer ? customer.name : invoice.name || invoice.ruc ? `${invoice.name || "Cliente"}${invoice.ruc ? ` · RUC ${invoice.ruc}` : ""}` : "Cliente y RUC (opcional)"}</span>
                <span className="text-xs text-indigo-600">{invoice.open ? "Ocultar" : "Agregar"}</span>
              </button>
              {invoice.open && <div className="grid gap-2 border-t p-3 sm:grid-cols-[1fr_1.4fr]">
                <div className="flex gap-1">
                  <Input value={invoice.ruc} onChange={(event) => setInvoice((current) => ({ ...current, ruc: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void lookupRuc() } }} placeholder="RUC o cédula" />
                  <Button type="button" variant="outline" size="icon" onClick={() => void lookupRuc()} disabled={invoice.checking || !invoice.ruc.trim()} aria-label="Consultar RUC">
                    {invoice.checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
                </div>
                <Input value={invoice.name} onChange={(event) => setInvoice((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre o razón social" />
              </div>}
            </section>}
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={printOnPay} onChange={(event) => togglePrint(event.target.checked)} className="h-4 w-4 accent-indigo-600" /> Ticket
              </label>
              <div className="min-w-0 flex-1 text-xs text-amber-700 dark:text-amber-300 sm:text-sm">{problem && problem !== "Cargando…" ? <span className="inline-flex items-start gap-1"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{problem}</span> : null}</div>
            </div>
            <Button size="lg" onClick={() => void charge()} disabled={Boolean(problem) || busy || loading} className="h-12 w-full rounded-xl sm:w-auto sm:min-w-[12rem] bg-gradient-to-r from-indigo-600 to-violet-600 text-base text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700">
              {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
              {creditDue === total && total > 0 ? "Cargar a cuenta" : `Cobrar ${money(total)}`}
            </Button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  )
}

function Success({ done, onPrint, onClose }: { done: Done; onPrint: () => void; onClose: () => void }) {
  return <div className="flex flex-col items-center px-6 py-10 text-center">
    <DialogTitle className="sr-only">Venta cobrada</DialogTitle>
    <DialogDescription className="sr-only">La venta #{done.id} quedó registrada.</DialogDescription>
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 animate-in zoom-in-50 duration-300">
      <CheckCircle2 className="h-12 w-12" /></div>
    <p className="mt-4 text-2xl font-bold">¡Listo! Venta #{done.id}</p>
    <p className="mt-1 text-sm text-muted-foreground">{done.methodName}{done.pending ? " · pago pendiente de verificar" : ""}</p>
    {done.change > 0 && <div className="mt-6 rounded-2xl bg-emerald-50 px-8 py-4 dark:bg-emerald-950/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Entregar vuelto</p>
      <p className="text-4xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{money(done.change)}</p></div>}
    {done.creditBalance !== null && <div className="mt-6 rounded-2xl bg-rose-50 px-8 py-4 dark:bg-rose-950/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-200">Cargado a la cuenta de {done.customer}</p>
      <p className="text-sm text-rose-900 dark:text-rose-100">Saldo pendiente: <span className="text-xl font-bold tabular-nums">{money(done.creditBalance)}</span></p></div>}
    <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-2">
      <Button variant="outline" size="lg" onClick={onPrint}><Printer className="mr-2 h-4 w-4" /> Ticket</Button>
      <Button size="lg" onClick={onClose} autoFocus className="bg-indigo-600 text-white hover:bg-indigo-700">Nueva venta</Button>
    </div>
  </div>
}

/** Cliente para venta a crédito: buscar, ver saldo y límite, habilitar crédito o registrar uno nuevo ahí mismo. */
function CreditCustomer({ customer, onChange, charge }: { customer: Customer | null; onChange: (customer: Customer | null) => void; charge: number }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", ruc: "", cycle: "monthly" as Cycle, limit: "" })

  useEffect(() => {
    if (customer || creating) return
    const handle = setTimeout(() => {
      setSearching(true)
      apiRequest<{ items: Customer[] }>(query.trim() ? `/api/customers?limit=8&q=${encodeURIComponent(query.trim())}` : "/api/customers?limit=8&balance=1")
        .then((result) => setResults(result.items)).catch(() => setResults([])).finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [query, customer, creating])

  const enable = async (target: Customer, changes: { creditEnabled: boolean; billingCycle: Cycle; creditLimit: number | null }) => {
    setSaving(true)
    try {
      const result = await apiRequest<{ item: Customer }>(`/api/customers/${target.id}`, { method: "PUT", body: JSON.stringify({
        name: target.name, phone: target.phone, ruc: target.ruc, email: target.email, address: target.address, notes: target.notes, ...changes }) })
      onChange(result.item)
      toast.success(`Crédito habilitado para ${result.item.name}`)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo habilitar.") } finally { setSaving(false) }
  }

  const create = async () => {
    setSaving(true)
    try {
      const result = await apiRequest<{ item: Customer }>("/api/customers", { method: "POST", body: JSON.stringify({
        name: form.name, phone: form.phone, ruc: form.ruc, creditEnabled: true, billingCycle: form.cycle, creditLimit: form.limit ? digits(form.limit) : null }) })
      onChange(result.item); setCreating(false)
      toast.success(`Cliente ${result.item.name} registrado con crédito`)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo registrar.") } finally { setSaving(false) }
  }

  if (customer) {
    const after = customer.balance + charge
    const over = customer.creditLimit != null && after > customer.creditLimit
    return <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/30">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-base font-bold text-white">{(customer.name || "?").slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{customer.name || customer.phone}</p>
          <p className="text-xs text-muted-foreground">{[customer.phone, customer.ruc ? `RUC ${customer.ruc}` : null].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-background" aria-label="Cambiar cliente"><X className="h-4 w-4" /></button>
      </div>
      {customer.creditEnabled ? <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Saldo actual" value={money(customer.balance)} />
        <Stat label="Después" value={money(after)} strong warn={over} />
        <Stat label={`Límite · ${cycleName[customer.billingCycle]}`} value={customer.creditLimit == null ? "Sin límite" : money(customer.creditLimit)} />
      </div> : <EnableCredit customer={customer} saving={saving} onEnable={enable} />}
      {over && <p className="mt-2 text-xs font-medium text-red-600">Supera el límite. Pedí un abono o ajustá el límite en Clientes.</p>}
    </section>
  }

  if (creating) return <section className="space-y-3 rounded-2xl border p-4">
    <div className="flex items-center justify-between"><p className="text-sm font-semibold">Nuevo cliente con crédito</p>
      <button type="button" onClick={() => setCreating(false)} className="text-xs text-muted-foreground hover:underline">Volver a buscar</button></div>
    <div className="grid gap-2 sm:grid-cols-2">
      <Input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nombre y apellido" className="sm:col-span-2" />
      <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Teléfono / WhatsApp" inputMode="tel" />
      <Input value={form.ruc} onChange={(event) => setForm({ ...form, ruc: event.target.value })} placeholder="RUC o CI (opcional)" />
    </div>
    <CycleLimit cycle={form.cycle} limit={form.limit} onCycle={(cycle) => setForm({ ...form, cycle })} onLimit={(limit) => setForm({ ...form, limit })} />
    <Button onClick={() => void create()} disabled={saving || !form.name.trim()} className="w-full bg-rose-600 text-white hover:bg-rose-700">
      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Registrar y usar</Button>
  </section>

  return <section className="space-y-2 rounded-2xl border p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-semibold">¿A qué cliente se carga?</p>
      <button type="button" onClick={() => { setForm((current) => ({ ...current, name: /\d{5,}/.test(query) ? "" : query, phone: /\d{5,}/.test(query) ? query : "" })); setCreating(true) }}
        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"><UserPlus className="h-3.5 w-3.5" /> Nuevo cliente</button>
    </div>
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, teléfono o RUC" className="pl-9" />
      {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
    </div>
    {!query.trim() && results.length > 0 && <p className="text-xs text-muted-foreground">Clientes con saldo pendiente</p>}
    <div className="max-h-56 space-y-1 overflow-y-auto">
      {results.map((item) => <button type="button" key={item.id} onClick={() => onChange(item)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">{(item.name || "?").slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.name || item.phone}</span>
          <span className="block truncate text-xs text-muted-foreground">{[item.phone, item.ruc].filter(Boolean).join(" · ")}</span></span>
        {item.creditEnabled ? <span className="text-right text-xs"><span className="block font-semibold tabular-nums">{money(item.balance)}</span><span className="text-muted-foreground">{cycleName[item.billingCycle]}</span></span>
          : <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">sin crédito</span>}
      </button>)}
      {!searching && query.trim() && results.length === 0 && <p className="py-3 text-center text-sm text-muted-foreground">No hay clientes con «{query}». Registralo con «Nuevo cliente».</p>}
    </div>
  </section>
}

function EnableCredit({ customer, saving, onEnable }: { customer: Customer; saving: boolean
  onEnable: (customer: Customer, changes: { creditEnabled: boolean; billingCycle: Cycle; creditLimit: number | null }) => void }) {
  const [cycle, setCycle] = useState<Cycle>(customer.billingCycle === "none" ? "monthly" : customer.billingCycle)
  const [limit, setLimit] = useState("")
  return <div className="mt-3 space-y-3 rounded-xl bg-background p-3">
    <p className="text-sm">Este cliente todavía no compra a crédito. Elegí cada cuánto paga y habilitalo.</p>
    <CycleLimit cycle={cycle} limit={limit} onCycle={setCycle} onLimit={setLimit} />
    <Button onClick={() => onEnable(customer, { creditEnabled: true, billingCycle: cycle, creditLimit: limit ? digits(limit) : null })} disabled={saving} className="w-full bg-rose-600 text-white hover:bg-rose-700">
      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookUser className="mr-2 h-4 w-4" />} Habilitar crédito</Button>
  </div>
}

function CycleLimit({ cycle, limit, onCycle, onLimit }: { cycle: Cycle; limit: string; onCycle: (cycle: Cycle) => void; onLimit: (limit: string) => void }) {
  return <div className="grid gap-2 sm:grid-cols-[1fr_11rem] sm:items-end">
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">Paga</p>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {cycles.map((option) => <button type="button" key={option.value} onClick={() => onCycle(option.value)}
          className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${cycle === option.value ? "bg-background shadow" : "text-muted-foreground"}`}>{option.label}</button>)}
      </div>
    </div>
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">Límite (opcional)</p>
      <Input inputMode="numeric" value={limit ? digits(limit).toLocaleString("es-PY") : ""} onChange={(event) => onLimit(event.target.value)} placeholder="Sin límite" className="text-right tabular-nums" />
    </div>
  </div>
}

function Stat({ label, value, strong, warn }: { label: string; value: string; strong?: boolean; warn?: boolean }) {
  return <div className="rounded-xl bg-background px-2 py-2">
    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`text-sm tabular-nums ${strong ? "font-bold" : "font-medium"} ${warn ? "text-red-600" : ""}`}>{value}</p>
  </div>
}
