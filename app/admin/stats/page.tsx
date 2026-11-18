"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowDownRight, ArrowUpRight, BarChart3, ChefHat, Clock3, Download, Receipt, RefreshCw, ShoppingBag, Truck, Users, XCircle } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/api-client"
import type { RestaurantStats } from "@/lib/stats"

const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const compact = (value: number) => new Intl.NumberFormat("es-PY", { notation: "compact", maximumFractionDigits: 1 }).format(value)
const shortDay = (day: string) => new Intl.DateTimeFormat("es-PY", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))
const monthLabel = (month: string) => new Intl.DateTimeFormat("es-PY", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`))
const tooltipStyle = { backgroundColor: "#0f172a", color: "#fff", border: "1px solid #334155", borderRadius: 14 }
const COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#94a3b8"]
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const SOURCE = { pos: "POS / mostrador", table_qr: "QR de mesa", whatsapp: "WhatsApp", web: "Web" } as Record<string, string>
const TYPES = { dineIn: "En el local", pickup: "Retiro", delivery: "Delivery" } as Record<string, string>
const PAY = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", qr: "QR / billetera" } as Record<string, string>

const localDay = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion" }).format(date)
const shift = (day: string, delta: number) => { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + delta); return date.toISOString().slice(0, 10) }
const PRESETS = [
  { id: "today", label: "Hoy", range: () => { const t = localDay(); return [t, t] } },
  { id: "7", label: "7 días", range: () => { const t = localDay(); return [shift(t, -6), t] } },
  { id: "30", label: "30 días", range: () => { const t = localDay(); return [shift(t, -29), t] } },
  { id: "month", label: "Este mes", range: () => { const t = localDay(); return [`${t.slice(0, 8)}01`, t] } },
  { id: "90", label: "90 días", range: () => { const t = localDay(); return [shift(t, -89), t] } },
] as const

export default function StatsPage() {
  const [preset, setPreset] = useState<string>("30")
  const [[from, to], setRange] = useState<[string, string]>(() => PRESETS[2].range() as [string, string])
  const [stats, setStats] = useState<RestaurantStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState<"daily" | "weekly" | "monthly">("daily")

  const load = useCallback(async () => {
    setLoading(true)
    try { setStats(await apiRequest<RestaurantStats>(`/api/stats?from=${from}&to=${to}`)) }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron cargar las estadísticas") }
    finally { setLoading(false) }
  }, [from, to])
  useEffect(() => { void load() }, [load])

  const chart = useMemo(() => {
    if (!stats) return []
    if (series === "weekly") return stats.weekly.map((row) => ({ label: shortDay(row.week), sales: row.sales, revenue: row.revenue }))
    if (series === "monthly") return stats.monthly.map((row) => ({ label: monthLabel(row.month), sales: row.sales, revenue: row.revenue }))
    return stats.daily.map((row) => ({ label: shortDay(row.day), sales: row.sales, revenue: row.revenue }))
  }, [stats, series])
  const heat = useMemo(() => {
    const map = new Map((stats?.heatmap ?? []).map((cell) => [`${cell.dow}-${cell.hour}`, cell.sales]))
    const max = Math.max(1, ...(stats?.heatmap ?? []).map((cell) => cell.sales))
    const hours = (stats?.heatmap ?? []).map((cell) => cell.hour)
    const first = hours.length ? Math.min(...hours, 10) : 10, last = hours.length ? Math.max(...hours, 22) : 22
    return { map, max, hours: Array.from({ length: last - first + 1 }, (_, i) => first + i) }
  }, [stats])
  const peak = useMemo(() => [...(stats?.heatmap ?? [])].sort((a, b) => b.sales - a.sales)[0], [stats])

  const exportCsv = () => {
    if (!stats) return
    const rows = [["Fecha", "Ventas", "Ingresos"], ...stats.daily.map((row) => [row.day, row.sales, row.revenue]), [], ["Producto", "Cantidad", "Ingresos"],
      ...stats.topByRevenue.map((row) => [row.name, row.quantity, row.revenue])]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
    link.download = `estadisticas-${from}-a-${to}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const c = stats?.current, p = stats?.previous
  return <div className="space-y-6 p-4 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight"><BarChart3 className="h-8 w-8 text-indigo-600" /> Estadísticas</h1>
        <p className="text-muted-foreground">Ventas, demanda, productos, clientes, equipo, cocina y delivery del restaurante.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border bg-white p-1 dark:bg-slate-900">{PRESETS.map((item) => <button key={item.id} type="button"
          onClick={() => { setPreset(item.id); setRange(item.range() as [string, string]) }}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${preset === item.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{item.label}</button>)}</div>
        <Input type="date" value={from} max={to} onChange={(event) => { setPreset("custom"); setRange([event.target.value, to]) }} className="w-auto" aria-label="Desde" />
        <Input type="date" value={to} min={from} onChange={(event) => { setPreset("custom"); setRange([from, event.target.value]) }} className="w-auto" aria-label="Hasta" />
        <Button variant="outline" onClick={() => void load()} aria-label="Actualizar"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        <Button variant="outline" onClick={exportCsv} disabled={!stats}><Download className="mr-2 h-4 w-4" /> CSV</Button>
      </div>
    </header>

    {!stats || !c || !p ? <p className="py-20 text-center text-muted-foreground">Cargando estadísticas…</p> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Receipt} title="Ventas" value={money(c.revenue)} now={c.revenue} before={p.revenue} tone="from-indigo-600 to-violet-600" />
        <Kpi icon={ShoppingBag} title="Cobros" value={String(c.sales)} now={c.sales} before={p.sales} tone="from-sky-500 to-blue-600" />
        <Kpi icon={BarChart3} title="Ticket promedio" value={money(c.averageTicket)} now={c.averageTicket} before={p.averageTicket} tone="from-emerald-500 to-teal-600" />
        <Kpi icon={Users} title="Clientes identificados" value={String(c.customers)} now={c.customers} before={p.customers} tone="from-amber-500 to-orange-500" />
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Mini icon={ShoppingBag} label="Pedidos creados" value={String(c.orders)} note={`${p.orders} el período anterior`} />
        <Mini icon={XCircle} label="Cancelados / rechazados" value={`${c.cancelled} / ${c.rejected}`} note={c.orders ? `${Math.round(((c.cancelled + c.rejected) / c.orders) * 100)} % de los pedidos` : "Sin pedidos"} />
        <Mini icon={ChefHat} label="Preparación promedio" value={stats.kitchen.prepMinutes == null ? "—" : `${stats.kitchen.prepMinutes} min`}
          note={stats.kitchen.measured ? `${stats.kitchen.measured} de ${stats.kitchen.tickets} comandas medidas · 90 %: ${stats.kitchen.prepP90Minutes ?? "—"} min` : "Se mide de la comanda a «Listo»"} />
        <Mini icon={Clock3} label="Hora pico" value={peak ? `${DAYS[peak.dow - 1]} ${peak.hour}:00` : "—"} note={peak ? `${peak.sales} cobros en esa franja` : "Sin ventas"} />
      </section>

      <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Evolución de ventas</h2>
          <div className="flex rounded-lg border p-0.5 text-sm">{(["daily", "weekly", "monthly"] as const).map((item) => <button key={item} type="button" onClick={() => setSeries(item)}
            className={`rounded-md px-3 py-1 font-semibold ${series === item ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500"}`}>{item === "daily" ? "Diario" : item === "weekly" ? "Semanal (12)" : "Mensual (12)"}</button>)}</div></div>
        <div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
          <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis yAxisId="left" tickFormatter={compact} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => name === "revenue" ? [money(Number(value)), "Ventas"] : [value, "Cobros"]} />
          <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#rev)" />
          <Line yAxisId="right" type="monotone" dataKey="sales" stroke="#06b6d4" strokeWidth={2} dot={false} />
        </ComposedChart></ResponsiveContainer></div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="font-bold">Horarios de mayor demanda</h2><p className="text-sm text-muted-foreground">Cobros por día y hora del período.</p>
          <div className="mt-4 overflow-x-auto"><table className="border-separate border-spacing-1 text-[11px]">
            <thead><tr><th />{heat.hours.map((hour) => <th key={hour} className="w-7 font-medium text-muted-foreground">{hour}</th>)}</tr></thead>
            <tbody>{DAYS.map((day, index) => <tr key={day}><th className="pr-2 text-left font-medium text-muted-foreground">{day}</th>
              {heat.hours.map((hour) => { const value = heat.map.get(`${index + 1}-${hour}`) ?? 0
                return <td key={hour} title={`${day} ${hour}:00 · ${value} cobros`} className="h-7 w-7 rounded-md text-center font-semibold"
                  style={{ background: value ? `rgba(99,102,241,${0.15 + 0.85 * (value / heat.max)})` : "rgba(148,163,184,.12)", color: value / heat.max > 0.5 ? "white" : undefined }}>{value || ""}</td> })}</tr>)}</tbody>
          </table></div>
        </section>
        <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="font-bold">Medios de pago</h2>
          <div className="mt-2 h-56"><ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={stats.paymentMethods.map((row) => ({ name: row.name || PAY[row.method] || row.method, value: row.revenue }))} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
              {stats.paymentMethods.map((row, index) => <Cell key={row.method} fill={COLORS[index % COLORS.length]} />)}</Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} /></PieChart></ResponsiveContainer></div>
          <ul className="space-y-1 text-sm">{stats.paymentMethods.map((row, index) => <li key={row.method} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />{row.name || PAY[row.method] || row.method} · {row.sales}</span><strong>{money(row.revenue)}</strong></li>)}</ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Ranking title="Más vendidos (unidades)" rows={stats.topProducts.map((row) => ({ name: row.name, value: row.quantity, detail: money(row.revenue) }))} format={(value) => `${value} u.`} color="#6366f1" />
        <Ranking title="Más vendidos (ingresos)" rows={stats.topByRevenue.map((row) => ({ name: row.name, value: row.revenue, detail: `${row.quantity} u.` }))} format={money} color="#10b981" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="font-bold">Menos vendidos</h2>
          <ul className="mt-3 divide-y text-sm">{stats.leastSold.length ? stats.leastSold.map((row) => <li key={`${row.id}-${row.name}`} className="flex justify-between py-1.5"><span>{row.name}</span><span className="text-muted-foreground">{row.quantity} u. · {money(row.revenue)}</span></li>)
            : <li className="py-4 text-center text-muted-foreground">Hacen falta más de 10 productos vendidos para comparar.</li>}</ul>
          {stats.unsold.length > 0 && <><h3 className="mt-4 text-sm font-semibold">Sin ventas en el período</h3>
            <p className="mt-1 text-sm text-muted-foreground">{stats.unsold.map((row) => row.name).join(" · ")}{stats.unsold.length === 15 ? "…" : ""}</p></>}
        </section>
        <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="font-bold">Clientes frecuentes</h2>
          <Table head={["Cliente", "Compras", "Total", "Última"]} rows={stats.customers.map((row) => [row.name, row.sales, money(row.revenue), shortDay(row.lastAt.slice(0, 10))])}
            empty="Todavía no hay compras con cliente identificado (teléfono o RUC)." />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="font-bold">Origen de los pedidos</h2>
          <div className="mt-3 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.sources.map((row) => ({ name: SOURCE[row.source] ?? row.source, pedidos: row.orders, cobrados: row.paid }))} layout="vertical" margin={{ left: 8 }}>
            <XAxis type="number" hide allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} /><Bar dataKey="pedidos" fill="#6366f1" radius={[0, 6, 6, 0]} /><Bar dataKey="cobrados" fill="#10b981" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
        </section>
        <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="font-bold">Modalidad</h2>
          <Table head={["Tipo", "Cobros", "Ventas"]} rows={stats.orderTypes.map((row) => [TYPES[row.type] ?? row.type, row.sales, money(row.revenue)])} empty="Sin ventas." />
        </section>
        <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 font-bold"><Truck className="h-4 w-4" /> Delivery</h2>
          <Table head={["Zona", "Envíos", "Ventas", "Envío"]} rows={stats.delivery.zones.map((row) => [row.zone, row.sales, money(row.revenue), money(row.fees)])} empty="Sin entregas en el período." />
          {stats.kitchen.deliveryMinutes != null && <p className="mt-2 text-sm text-muted-foreground">Tiempo promedio hasta la entrega: <strong>{stats.kitchen.deliveryMinutes} min</strong></p>}
          {stats.delivery.couriers.length > 0 && <Table head={["Repartidor", "Entregas", "Ventas"]} rows={stats.delivery.couriers.map((row) => [row.name, row.deliveries, money(row.revenue)])} empty="" />}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="font-bold">Rendimiento en caja</h2>
          <Table head={["Usuario", "Cobros", "Ventas", "Promedio"]} rows={stats.cashiers.map((row) => [row.name, row.sales, money(row.revenue), money(row.sales ? row.revenue / row.sales : 0)])} empty="Sin cobros." />
        </section>
        <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900">
          <h2 className="font-bold">Rendimiento de mozos</h2>
          <Table head={["Mozo", "Cuentas", "Mesas", "Ventas"]} rows={stats.waiters.map((row) => [row.name, row.sales, row.tables, money(row.revenue)])} empty="Ninguna cuenta con mozo asignado en el período." />
        </section>
      </div>
      <p className="text-xs text-muted-foreground">Período {stats.range.from} a {stats.range.to} ({stats.range.days} días), comparado con {stats.range.previous.from} a {stats.range.previous.to}. Zona horaria {stats.timezone}. Los pagos rechazados no se cuentan.</p>
    </>}
  </div>
}

function Kpi({ icon: Icon, title, value, now, before, tone }: { icon: typeof Receipt; title: string; value: string; now: number; before: number; tone: string }) {
  const delta = before ? Math.round(((now - before) / before) * 100) : null
  return <div className={`rounded-2xl bg-gradient-to-br ${tone} p-5 text-white shadow-lg`}>
    <div className="flex items-center justify-between"><p className="text-sm opacity-85">{title}</p><Icon className="h-5 w-5 opacity-80" /></div>
    <strong className="mt-1 block text-2xl">{value}</strong>
    <p className="mt-1 flex items-center gap-1 text-xs opacity-90">{delta == null ? "Sin datos del período anterior" : <>{delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{delta >= 0 ? "+" : ""}{delta} % vs. período anterior</>}</p>
  </div>
}

function Mini({ icon: Icon, label, value, note }: { icon: typeof Receipt; label: string; value: string; note: string }) {
  return <div className="flex items-start gap-3 rounded-2xl border bg-white p-4 dark:bg-slate-900"><div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800"><Icon className="h-5 w-5 text-slate-700 dark:text-slate-200" /></div>
    <div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><strong className="text-xl">{value}</strong><p className="text-xs text-muted-foreground">{note}</p></div></div>
}

function Ranking({ title, rows, format, color }: { title: string; rows: { name: string; value: number; detail: string }[]; format: (value: number) => string; color: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  return <section className="rounded-2xl border bg-white p-5 dark:bg-slate-900"><h2 className="font-bold">{title}</h2>
    <ol className="mt-3 space-y-2 text-sm">{rows.length ? rows.map((row, index) => <li key={`${row.name}-${index}`}>
      <div className="flex justify-between gap-2"><span className="truncate"><span className="mr-2 text-muted-foreground">{index + 1}.</span>{row.name}</span><span className="shrink-0 font-semibold">{format(row.value)} <span className="font-normal text-muted-foreground">· {row.detail}</span></span></div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{ width: `${(row.value / max) * 100}%`, background: color }} /></div></li>)
      : <li className="py-4 text-center text-muted-foreground">Sin ventas en el período.</li>}</ol></section>
}

function Table({ head, rows, empty }: { head: string[]; rows: (string | number)[][]; empty: string }) {
  if (!rows.length) return empty ? <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p> : null
  return <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase text-muted-foreground">{head.map((cell, index) => <th key={cell} className={`py-1.5 ${index ? "text-right" : ""}`}>{cell}</th>)}</tr></thead>
    <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t">{row.map((cell, index) => <td key={index} className={`py-1.5 ${index ? "text-right" : "font-medium"}`}>{cell}</td>)}</tr>)}</tbody></table></div>
}
