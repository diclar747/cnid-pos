"use client"

import { useCallback, useEffect, useState } from "react"
import { BookUser, HandCoins, Loader2, MessageCircle, Pencil, Phone, Plus, RefreshCw, Search, SlidersHorizontal, UserRound, UsersRound, Wallet } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiRequest } from "@/lib/api-client"
import type { Customer } from "@/lib/service-order-types"
import { useAuth } from "../../context/auth-context"
import { useCompany } from "../../context/company-context"

const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const digits = (value: string) => Number(value.replace(/\D/g, "")) || 0
const formatPhone = (phone: string) => phone.startsWith("595") ? `+595 ${phone.slice(3)}` : phone
const typeLabel: Record<string, string> = { dineIn: "Local", delivery: "Delivery", pickup: "Retiro" }
const payLabel: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", qr: "QR", credit: "A cuenta", mixed: "Mixto", unknown: "—" }
const cycleName: Record<Customer["billingCycle"], string> = { weekly: "Semanal", biweekly: "Quincenal", monthly: "Mensual", none: "Sin ciclo" }
const periodName: Record<Customer["billingCycle"], string> = { weekly: "Esta semana", biweekly: "Esta quincena", monthly: "Este mes", none: "Período" }
const kindLabel: Record<string, string> = { charge: "Consumo", payment: "Pago", adjustment: "Ajuste" }
const empty = { name: "", phone: "", ruc: "", email: "", address: "", notes: "", creditEnabled: false, billingCycle: "monthly" as Customer["billingCycle"], creditLimit: "" }

type Detail = {
  item: Customer
  sales: Array<{ id: number; date: string; total: number; paymentMethod: string; orderType: string; itemCount: number }>
  openOrders: Array<{ id: number; orderType: string; total: number; createdAt: string }>
}
type Account = {
  balance: number; creditEnabled: boolean; creditLimit: number | null; billingCycle: Customer["billingCycle"]; cycleLabel: string; cycleStart: string | null
  period: { charges: number; payments: number; visits: number } | null
  ledger: Array<{ id: number; kind: string; amount: number; balanceAfter: number; saleId: number | null; method: string; description: string; userName: string; createdAt: string }>
}
type Method = { code: string; name: string; kind: string; needsVerification: boolean }

export default function CustomersPage() {
  const { hasPermission } = useAuth()
  const { companyConfig } = useCompany()
  const canCredit = hasPermission("manage_sales")
  const canAdjust = hasPermission("manage_company")
  const [items, setItems] = useState<Customer[]>([])
  const [stats, setStats] = useState({ total: 0, returning: 0, debtors: 0, receivable: 0 })
  const [query, setQuery] = useState("")
  const [onlyDebt, setOnlyDebt] = useState(false)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [editing, setEditing] = useState<{ id: number | null; form: typeof empty } | null>(null)
  const [saving, setSaving] = useState(false)
  const [methods, setMethods] = useState<Method[]>([])
  const [payment, setPayment] = useState<{ mode: "payment" | "adjust"; amount: string; method: string; reference: string; note: string; sign: 1 | -1 } | null>(null)

  const load = useCallback(async (q = query) => {
    setLoading(true)
    try {
      const result = await apiRequest<{ items: Customer[]; total: number; returning: number; debtors: number; receivable: number }>(
        onlyDebt ? "/api/customers?limit=300&balance=1" : `/api/customers?limit=300${q ? `&q=${encodeURIComponent(q)}` : ""}`)
      setItems(onlyDebt && q ? result.items.filter((c) => [c.name, c.phone, c.ruc].some((v) => v.toLowerCase().includes(q.toLowerCase()))) : result.items)
      setStats({ total: result.total, returning: result.returning, debtors: result.debtors ?? 0, receivable: result.receivable ?? 0 })
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron cargar los clientes") }
    finally { setLoading(false) }
  }, [query, onlyDebt])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(query) }, 250)
    return () => window.clearTimeout(timer)
  }, [query, load])

  useEffect(() => {
    if (!canCredit) return
    apiRequest<{ items: Method[] }>("/api/payment-methods").then((result) => setMethods(result.items.filter((m) => m.kind !== "credit"))).catch(() => setMethods([]))
  }, [canCredit])

  const open = async (customer: Customer) => {
    try {
      const [info, acc] = await Promise.all([apiRequest<Detail>(`/api/customers/${customer.id}`), apiRequest<{ account: Account }>(`/api/customers/${customer.id}/account`)])
      setDetail(info); setAccount(acc.account); setPayment(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo abrir el cliente") }
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const path = editing.id ? `/api/customers/${editing.id}` : "/api/customers"
      const { creditLimit, ...rest } = editing.form
      const body = canCredit ? { ...rest, creditLimit: creditLimit ? digits(creditLimit) : null } : { name: rest.name, phone: rest.phone, ruc: rest.ruc, email: rest.email, address: rest.address, notes: rest.notes }
      const result = await apiRequest<{ item: Customer }>(path, { method: editing.id ? "PUT" : "POST", body: JSON.stringify(body) })
      toast.success(editing.id ? "Cliente actualizado" : "Cliente creado")
      setEditing(null)
      if (detail?.item.id === result.item.id) await open(result.item)
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar") }
    finally { setSaving(false) }
  }

  const submitPayment = async () => {
    if (!detail || !payment) return
    setSaving(true)
    try {
      const body = payment.mode === "payment"
        ? { action: "payment", method: payment.method, amount: digits(payment.amount), reference: payment.reference, note: payment.note }
        : { action: "adjust", amount: digits(payment.amount) * payment.sign, note: payment.note }
      const result = await apiRequest<{ item: Customer; account: Account; result: { status?: string } }>(`/api/customers/${detail.item.id}/account`, { method: "POST", body: JSON.stringify(body) })
      setAccount(result.account); setDetail({ ...detail, item: result.item }); setPayment(null)
      toast.success(payment.mode === "payment" ? (result.result.status === "pending" ? "Pago registrado (a verificar en caja)" : "Pago registrado en la caja") : "Ajuste registrado")
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo registrar") }
    finally { setSaving(false) }
  }

  const reminder = (customer: Customer, acc: Account) => {
    const lines = [`Hola ${customer.name || ""}! Te escribimos de ${companyConfig?.name || "el restaurante"}.`,
      acc.period && acc.period.visits > 0 ? `${periodName[acc.billingCycle]}: ${acc.period.visits} consumo${acc.period.visits === 1 ? "" : "s"} por ${money(acc.period.charges)}.` : null,
      `Tu saldo pendiente es de ${money(acc.balance)}.`, "¡Gracias!"].filter(Boolean)
    return `https://wa.me/${customer.phone}?text=${encodeURIComponent(lines.join("\n"))}`
  }

  const spent = items.reduce((sum, c) => sum + c.totalSpent, 0)

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Se registran solos con el teléfono o el RUC de cada pedido. Los clientes fijos pueden comer a cuenta y pagar por semana, quincena o mes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} aria-label="Actualizar"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setEditing({ id: null, form: { ...empty } })}><Plus className="mr-2 h-4 w-4" /> Nuevo cliente</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[{ label: "Clientes", value: stats.total.toLocaleString("es-PY"), icon: UsersRound, color: "from-indigo-600 to-violet-600" },
          { label: "Volvieron a comprar", value: stats.returning.toLocaleString("es-PY"), icon: UserRound, color: "from-emerald-500 to-teal-600" },
          { label: "Por cobrar (cuentas)", value: money(stats.receivable), icon: BookUser, color: "from-rose-500 to-pink-600", hint: `${stats.debtors} cliente${stats.debtors === 1 ? "" : "s"} con saldo` },
          { label: query ? "Compras de la búsqueda" : "Compras de los listados", value: money(spent), icon: Wallet, color: "from-amber-500 to-orange-500" }].map((card) => (
          <div key={card.label} className={`rounded-2xl bg-gradient-to-br ${card.color} p-5 text-white shadow-lg`}>
            <card.icon className="h-5 w-5 opacity-80" />
            <p className="mt-3 text-sm opacity-80">{card.label}</p>
            <strong className="text-2xl">{card.value}</strong>
            {"hint" in card && card.hint && <p className="text-xs opacity-80">{card.hint}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] max-w-lg flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, teléfono o RUC…" className="h-10 pl-10" />
        </div>
        <div className="flex rounded-xl bg-muted p-1 text-sm">
          {[{ value: false, label: "Todos" }, { value: true, label: "Con saldo pendiente" }].map((tab) => (
            <button key={tab.label} type="button" onClick={() => setOnlyDebt(tab.value)} className={`rounded-lg px-3 py-1.5 font-medium transition ${onlyDebt === tab.value ? "bg-background shadow" : "text-muted-foreground"}`}>{tab.label}</button>))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-slate-900">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-950">
            <tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Teléfono</th><th className="px-4 py-3">RUC</th><th className="px-4 py-3 text-right">Compras</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3">Última</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
              : items.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{onlyDebt ? "Ningún cliente debe nada." : query ? "Sin resultados." : "Todavía no hay clientes. Aparecen al cargar un teléfono o RUC en un pedido."}</td></tr>
              : items.map((customer) => (
                <tr key={customer.id} onClick={() => void open(customer)} className="cursor-pointer border-b last:border-0 hover:bg-indigo-50/50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-medium">{customer.name || <span className="text-muted-foreground">Sin nombre</span>}
                    {customer.creditEnabled && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">{cycleName[customer.billingCycle]}</span>}</td>
                  <td className="px-4 py-3">{customer.phone ? formatPhone(customer.phone) : "—"}</td>
                  <td className="px-4 py-3">{customer.ruc || "—"}</td>
                  <td className="px-4 py-3 text-right">{customer.ordersCount}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(customer.totalSpent)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${customer.balance > 0 ? "text-rose-600" : "text-muted-foreground"}`}>{customer.balance ? money(customer.balance) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("es-PY") : "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(value) => { if (!value) { setDetail(null); setAccount(null); setPayment(null) } }}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          {detail && <>
            <DialogHeader>
              <DialogTitle>{detail.item.name || "Cliente sin nombre"}</DialogTitle>
              <DialogDescription>Cliente desde {new Date(detail.item.createdAt).toLocaleDateString("es-PY")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p><span className="text-muted-foreground">Teléfono:</span> {detail.item.phone ? <a className="text-indigo-600" href={`https://wa.me/${detail.item.phone}`} target="_blank" rel="noopener noreferrer"><Phone className="mr-1 inline h-3 w-3" />{formatPhone(detail.item.phone)}</a> : "—"}</p>
              <p><span className="text-muted-foreground">RUC:</span> {detail.item.ruc || "—"}</p>
              <p><span className="text-muted-foreground">Email:</span> {detail.item.email || "—"}</p>
              <p><span className="text-muted-foreground">Dirección:</span> {detail.item.address || "—"}</p>
              {detail.item.notes && <p className="sm:col-span-2"><span className="text-muted-foreground">Notas:</span> {detail.item.notes}</p>}
            </div>

            {account && (account.creditEnabled || account.balance !== 0 || account.ledger.length > 0) && <section className="overflow-hidden rounded-2xl border border-rose-200 dark:border-rose-900">
              <div className="flex flex-wrap items-end justify-between gap-3 bg-gradient-to-br from-rose-500 to-pink-600 p-4 text-white">
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">Cuenta corriente · {account.creditEnabled ? `paga ${account.cycleLabel.toLowerCase()}` : "crédito deshabilitado"}</p>
                  <p className="text-3xl font-bold tabular-nums">{money(account.balance)}</p>
                  <p className="text-xs opacity-80">{account.creditLimit == null ? "Sin límite" : `Límite ${money(account.creditLimit)}`}</p>
                </div>
                {account.period && <div className="rounded-xl bg-white/15 px-3 py-2 text-sm">
                  <p className="text-xs opacity-80">{periodName[account.billingCycle]}</p>
                  <p><strong>{account.period.visits}</strong> consumo{account.period.visits === 1 ? "" : "s"} · {money(account.period.charges)}</p>
                  <p className="text-xs opacity-80">Pagó {money(account.period.payments)}</p>
                </div>}
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                {canCredit && account.balance > 0 && <Button size="sm" onClick={() => setPayment({ mode: "payment", amount: String(account.balance), method: methods[0]?.code ?? "cash", reference: "", note: "", sign: -1 })} className="bg-emerald-600 text-white hover:bg-emerald-700"><HandCoins className="mr-1 h-4 w-4" /> Registrar pago</Button>}
                {canAdjust && <Button size="sm" variant="outline" onClick={() => setPayment({ mode: "adjust", amount: "", method: "", reference: "", note: "", sign: -1 })}><SlidersHorizontal className="mr-1 h-4 w-4" /> Ajuste</Button>}
                {detail.item.phone && account.balance > 0 && <Button size="sm" variant="outline" onClick={() => window.open(reminder(detail.item, account), "_blank", "noopener")}><MessageCircle className="mr-1 h-4 w-4" /> Recordar por WhatsApp</Button>}
              </div>
              {payment && <div className="space-y-2 border-t bg-muted/30 p-3">
                {payment.mode === "payment" ? <>
                  <p className="text-sm font-semibold">Pago a cuenta (entra en la caja abierta)</p>
                  <div className="flex flex-wrap gap-1">{methods.map((m) => <button key={m.code} type="button" onClick={() => setPayment({ ...payment, method: m.code })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${payment.method === m.code ? "border-emerald-600 bg-emerald-600 text-white" : "bg-background"}`}>{m.name}</button>)}</div>
                </> : <>
                  <p className="text-sm font-semibold">Ajuste de saldo</p>
                  <div className="flex gap-1">{([[-1, "Descontar"], [1, "Sumar deuda"]] as const).map(([sign, label]) => <button key={sign} type="button" onClick={() => setPayment({ ...payment, sign })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${payment.sign === sign ? "border-indigo-600 bg-indigo-600 text-white" : "bg-background"}`}>{label}</button>)}</div>
                </>}
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Gs</span>
                    <Input autoFocus inputMode="numeric" value={payment.amount ? digits(payment.amount).toLocaleString("es-PY") : ""} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} className="pl-9 text-right font-semibold tabular-nums" placeholder="Monto" /></div>
                  {payment.mode === "payment" && methods.find((m) => m.code === payment.method)?.needsVerification
                    ? <Input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} placeholder="Referencia" maxLength={80} />
                    : <Input value={payment.note} onChange={(event) => setPayment({ ...payment, note: event.target.value })} placeholder={payment.mode === "adjust" ? "Motivo (obligatorio)" : "Nota (opcional)"} maxLength={200} />}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void submitPayment()} disabled={saving || !digits(payment.amount) || (payment.mode === "adjust" && !payment.note.trim())}>
                    {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Confirmar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPayment(null)}>Cancelar</Button>
                </div>
              </div>}
              {account.ledger.length > 0 && <ul className="max-h-64 divide-y overflow-y-auto border-t text-sm">{account.ledger.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0"><span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${entry.kind === "charge" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : entry.kind === "payment" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{kindLabel[entry.kind] ?? entry.kind}</span>
                    {entry.description}<span className="block text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })}{entry.userName ? ` · ${entry.userName}` : ""}</span></span>
                  <span className="text-right tabular-nums"><strong className={entry.amount > 0 ? "text-rose-600" : "text-emerald-600"}>{entry.amount > 0 ? "+" : "−"}{money(Math.abs(entry.amount))}</strong>
                    <span className="block text-xs text-muted-foreground">Saldo {money(entry.balanceAfter)}</span></span>
                </li>))}</ul>}
            </section>}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/40"><p className="text-xs text-muted-foreground">Compras</p><strong className="text-xl">{detail.item.ordersCount}</strong></div>
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40"><p className="text-xs text-muted-foreground">Total gastado</p><strong className="text-xl">{money(detail.item.totalSpent)}</strong></div>
            </div>
            {detail.openOrders.length > 0 && <div><h3 className="mb-2 font-semibold">Cuentas abiertas</h3>
              <ul className="space-y-1 text-sm">{detail.openOrders.map((o) => <li key={o.id} className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30"><span>Orden #{o.id} · {typeLabel[o.orderType] ?? o.orderType}</span><strong>{money(o.total)}</strong></li>)}</ul></div>}
            <div>
              <h3 className="mb-2 font-semibold">Últimas compras</h3>
              {detail.sales.length === 0 ? <p className="text-sm text-muted-foreground">Sin compras registradas.</p> :
                <ul className="divide-y rounded-xl border text-sm">{detail.sales.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span>Venta #{s.id} · {s.date ? new Date(s.date).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" }) : ""}<span className="block text-xs text-muted-foreground">{s.itemCount} productos · {typeLabel[s.orderType] ?? "Local"} · {payLabel[s.paymentMethod] ?? s.paymentMethod}</span></span>
                    <span className="flex items-center gap-2"><strong>{money(s.total)}</strong><Button variant="ghost" size="sm" onClick={() => window.open(`/receipt/sale/${s.id}`, "_blank")}>Ticket</Button></span>
                  </li>))}</ul>}
            </div>
            <Button variant="outline" onClick={() => setEditing({ id: detail.item.id, form: { name: detail.item.name, phone: detail.item.phone, ruc: detail.item.ruc, email: detail.item.email, address: detail.item.address, notes: detail.item.notes,
              creditEnabled: detail.item.creditEnabled, billingCycle: detail.item.billingCycle, creditLimit: detail.item.creditLimit == null ? "" : String(detail.item.creditLimit) } })}><Pencil className="mr-2 h-4 w-4" /> Editar datos y crédito</Button>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(value) => { if (!value) setEditing(null) }}>
        <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar cliente" : "Nuevo cliente"}</DialogTitle><DialogDescription>El teléfono identifica al cliente en pedidos y en WhatsApp.</DialogDescription></DialogHeader>
          {editing && <div className="space-y-3">
            {([["name", "Nombre"], ["phone", "Teléfono (WhatsApp)"], ["ruc", "RUC o CI"], ["email", "Email"], ["address", "Dirección"], ["notes", "Notas"]] as const).map(([key, label]) => (
              <label key={key} className="block text-sm font-medium">{label}
                <Input value={editing.form[key]} onChange={(event) => setEditing({ ...editing, form: { ...editing.form, [key]: event.target.value } })} className="mt-1" />
              </label>))}
            {canCredit && <div className="space-y-3 rounded-xl border border-rose-200 p-3 dark:border-rose-900">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={editing.form.creditEnabled} onChange={(event) => setEditing({ ...editing, form: { ...editing.form, creditEnabled: event.target.checked } })} className="h-4 w-4 accent-rose-600" />
                Puede comer a cuenta (crédito)</label>
              {editing.form.creditEnabled && <>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                  {(["weekly", "biweekly", "monthly"] as const).map((cycle) => <button key={cycle} type="button" onClick={() => setEditing({ ...editing, form: { ...editing.form, billingCycle: cycle } })}
                    className={`rounded-lg px-2 py-1.5 text-xs font-medium ${editing.form.billingCycle === cycle ? "bg-background shadow" : "text-muted-foreground"}`}>{cycleName[cycle]}</button>)}
                </div>
                <label className="block text-sm font-medium">Límite de crédito (vacío = sin límite)
                  <Input inputMode="numeric" value={editing.form.creditLimit ? digits(editing.form.creditLimit).toLocaleString("es-PY") : ""} onChange={(event) => setEditing({ ...editing, form: { ...editing.form, creditLimit: event.target.value } })} className="mt-1" placeholder="Sin límite" />
                </label>
              </>}
            </div>}
            <Button className="w-full" onClick={() => void save()} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
