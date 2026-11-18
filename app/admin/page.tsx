"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Package,
  PackagePlus,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useAuth } from "../context/auth-context"
import { useCart } from "../context/cart-context"
import { useCompany } from "../context/company-context"
import { usePurchases } from "../context/purchases-context"
import { useSales } from "../context/sales-context"
import { businessDateKey } from "@/lib/business-date"
import { buildDashboardAnalytics, comparisonChange, type DashboardPeriod } from "@/lib/dashboard-analytics"

const SalesTrendChart = dynamic(() => import("../components/dashboard-charts").then((module) => module.SalesTrendChart), { ssr: false })
const PaymentChart = dynamic(() => import("../components/dashboard-charts").then((module) => module.PaymentChart), { ssr: false })
const WeekdayChart = dynamic(() => import("../components/dashboard-charts").then((module) => module.WeekdayChart), { ssr: false })

const money = (value: number) => new Intl.NumberFormat("es-PY", {
  style: "currency", currency: "PYG", maximumFractionDigits: 0,
}).format(value)
const number = (value: number) => new Intl.NumberFormat("es-PY").format(value)
const dayLabel = (day: string) => new Intl.DateTimeFormat("es-PY", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
}).format(new Date(day + "T12:00:00Z"))

const cardClass = "min-w-0 rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,.35)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:p-6"
const periods: DashboardPeriod[] = [7, 30, 90, 365]
const periodNames: Record<DashboardPeriod, string> = { 7: "7 días", 30: "30 días", 90: "90 días", 365: "12 meses" }
const paymentColors = ["#6366f1", "#06b6d4", "#f59e0b", "#94a3b8"]

type MetricTone = "indigo" | "cyan" | "violet" | "amber"
const tones: Record<MetricTone, { background: string; icon: string; accent: string }> = {
  indigo: { background: "from-indigo-50 via-white to-white dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900", icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300", accent: "bg-indigo-500" },
  cyan: { background: "from-cyan-50 via-white to-white dark:from-cyan-950/40 dark:via-slate-900 dark:to-slate-900", icon: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300", accent: "bg-cyan-500" },
  violet: { background: "from-violet-50 via-white to-white dark:from-violet-950/40 dark:via-slate-900 dark:to-slate-900", icon: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", accent: "bg-violet-500" },
  amber: { background: "from-amber-50 via-white to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900", icon: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", accent: "bg-amber-500" },
}

function ChangeBadge({ current, previous, comparable = true }: { current: number; previous: number; comparable?: boolean }) {
  if (!comparable) return <span className="text-xs text-slate-400">Sin historial comparable</span>
  const change = comparisonChange(current, previous)
  if (change === null) return <span className="text-xs text-slate-400">Sin movimiento previo</span>
  if (change === "nuevo") return <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">Nuevo en este período</span>
  const positive = change >= 0
  return <span className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold " + (positive
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300")}>
    {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
    {positive ? "+" : ""}{change}%
  </span>
}

function MetricCard({ title, value, detail, current, previous, icon: Icon, tone, comparable }: {
  title: string
  value: string
  detail: string
  current: number
  previous: number
  icon: LucideIcon
  tone: MetricTone
  comparable?: boolean
}) {
  const style = tones[tone]
  return <article className={"relative overflow-hidden rounded-[25px] border border-white/80 bg-gradient-to-br p-5 shadow-[0_18px_45px_-35px_rgba(15,23,42,.38)] dark:border-slate-800 sm:p-6 " + style.background}>
    <span className={"absolute left-0 top-6 h-12 w-1 rounded-r-full " + style.accent} aria-hidden="true" />
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl " + style.icon}><Icon className="h-5 w-5" /></span>
    </div>
    <p className="mt-6 break-words text-[clamp(1.45rem,2.2vw,2.05rem)] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">{value}</p>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <ChangeBadge current={current} previous={previous} comparable={comparable} />
      <span className="text-xs text-slate-400 dark:text-slate-500">{detail}</span>
    </div>
  </article>
}

function SectionHeading({ eyebrow, title, href, linkLabel }: {
  eyebrow: string
  title: string
  href?: string
  linkLabel?: string
}) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
    </div>
    {href && <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-300">{linkLabel}<ArrowUpRight className="h-4 w-4" /></Link>}
  </div>
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const { companyConfig, isLoading: companyLoading } = useCompany()
  const { products } = useCart()
  const { sales, expenses, salesLoading, salesError } = useSales()
  const { purchases } = usePurchases()
  const [period, setPeriod] = useState<DashboardPeriod>(30)
  const [chartMetric, setChartMetric] = useState<"amount" | "orders">("amount")
  const today = businessDateKey(new Date())
  const data = useMemo(
    () => buildDashboardAnalytics(sales, expenses, purchases, products, period, today),
    [sales, expenses, purchases, products, period, today],
  )
  const businessName = companyConfig.name || "tu negocio"
  const topRevenue = data.topProducts[0]?.revenue || 1

  const quickActions = [
    { href: "/pos", title: "Punto de venta", detail: "Buscar, escanear y cobrar", icon: ShoppingCart, color: "from-indigo-500 to-violet-600", permission: null },
    { href: "/admin/products", title: "Productos", detail: "Catálogo e inventario", icon: PackagePlus, color: "from-cyan-500 to-blue-600", permission: "manage_products" },
    { href: "/admin/purchase-orders", title: "Órdenes de compra", detail: "Planificar reposición", icon: ShoppingBag, color: "from-amber-400 to-orange-500", permission: "manage_purchases" },
    { href: "/admin/sales-reports", title: "Reportes", detail: "Detalle de movimientos", icon: BarChart3, color: "from-fuchsia-500 to-pink-600", permission: "view_reports" },
  ].filter((action) => !action.permission || user?.permissions.includes(action.permission))

  if (salesLoading || companyLoading) return <main className="min-h-full bg-[#f4f6fc] px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8" aria-busy="true">
    <div className="mx-auto max-w-[1600px] animate-pulse space-y-6">
      <div className="flex min-h-[240px] flex-col justify-center rounded-[30px] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-800 p-8 text-white">
        <Sparkles className="h-7 w-7 text-cyan-300" />
        <h1 className="mt-5 text-2xl font-bold">Preparando el panel</h1>
        <p className="mt-2 text-sm text-indigo-100/70" role="status">Cargando ventas y estadísticas de {companyConfig.name || "tu negocio"}…</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 rounded-[25px] bg-white dark:bg-slate-900" />)}</div>
      <div className="h-72 rounded-[26px] bg-white dark:bg-slate-900" />
    </div>
  </main>

  if (salesError) return <main className="flex min-h-[65vh] items-center justify-center bg-[#f4f6fc] px-4 dark:bg-slate-950">
    <div className="max-w-md rounded-[26px] border border-rose-100 bg-white p-8 text-center shadow-xl shadow-slate-200/50 dark:border-rose-500/20 dark:bg-slate-900 dark:shadow-none" role="alert">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"><CircleAlert className="h-6 w-6" /></span>
      <h1 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">Estadísticas no disponibles</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{salesError}</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">Reintentar</button>
    </div>
  </main>

  return <main className="min-h-full bg-[radial-gradient(circle_at_5%_5%,rgba(99,102,241,0.12),transparent_32%),radial-gradient(circle_at_90%_28%,rgba(6,182,212,0.10),transparent_28%)] px-4 pb-10 pt-5 dark:bg-[radial-gradient(circle_at_5%_5%,rgba(99,102,241,0.11),transparent_32%),radial-gradient(circle_at_90%_28%,rgba(6,182,212,0.08),transparent_28%)] sm:px-6 lg:px-8 lg:pt-7">
    <div className="mx-auto max-w-[1600px] space-y-5 sm:space-y-6">
      <section className="relative isolate overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-800 p-6 text-white shadow-[0_30px_60px_-30px_rgba(49,46,129,.55)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-36 h-80 w-80 rounded-full bg-fuchsia-500/25 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute right-8 top-8 h-32 w-32 rounded-full border border-white/10 sm:h-52 sm:w-52" aria-hidden="true" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100 backdrop-blur"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /> PANEL DE CONTROL</span>
            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.8rem]">Tu negocio, en perspectiva.</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-indigo-100/80 sm:text-base">Ventas, movimientos y productos de <strong className="font-semibold text-white">{businessName}</strong> en un solo lugar.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/pos" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-indigo-900 shadow-lg shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-50"><ShoppingCart className="h-4 w-4" /> Abrir punto de venta <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/admin/sales-reports" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"><ReceiptText className="h-4 w-4" /> Ver reportes</Link>
            </div>
          </div>
          <div className="min-w-[205px] rounded-[23px] border border-white/20 bg-white/10 p-5 backdrop-blur-xl sm:min-w-[245px]">
            <div className="flex items-center justify-between text-indigo-100"><span className="text-xs font-semibold uppercase tracking-[0.16em]">Ventas de hoy</span><span className="rounded-xl bg-white/10 p-2"><Wallet className="h-4 w-4" /></span></div>
            <p className="mt-5 break-words text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none tracking-tight">{money(data.todayRevenue)}</p>
            <p className="mt-3 text-xs text-indigo-100/75">{number(data.todayOrders)} operaciones · {dayLabel(today)}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">Visión general</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Rendimiento del negocio</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dayLabel(data.start)} — {dayLabel(data.end)} · {data.hasComparableHistory ? "comparación con el período anterior" : "historial anterior incompleto para comparar"}</p>
        </div>
        <div className="flex max-w-full flex-wrap rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="Período del dashboard">
          {periods.map((value) => <button key={value} type="button" onClick={() => setPeriod(value)} aria-pressed={period === value} className={"min-h-9 rounded-xl px-3 py-1.5 text-xs font-semibold transition sm:px-4 " + (period === value
            ? "bg-slate-900 text-white shadow-sm dark:bg-indigo-500"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white")}>{periodNames[value]}</button>)}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principales">
        <MetricCard title="Ingresos por ventas" value={money(data.revenue)} detail={data.hasComparableHistory ? "vs. período anterior" : "ventas registradas"} current={data.revenue} previous={data.previousRevenue} comparable={data.hasComparableHistory} icon={Wallet} tone="indigo" />
        <MetricCard title="Operaciones" value={number(data.orders)} detail={data.hasComparableHistory ? "vs. período anterior" : "ventas registradas"} current={data.orders} previous={data.previousOrders} comparable={data.hasComparableHistory} icon={ShoppingBag} tone="cyan" />
        <MetricCard title="Ticket promedio" value={money(data.averageTicket)} detail="por operación" current={data.averageTicket} previous={data.previousAverageTicket} comparable={data.hasComparableHistory} icon={CreditCard} tone="violet" />
        <MetricCard title="Compras registradas" value={money(data.purchaseTotal)} detail="mercadería recibida" current={data.purchaseTotal} previous={data.previousPurchaseTotal} icon={Package} tone="amber" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]" aria-label="Gráficos de ventas">
        <article className={cardClass}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionHeading eyebrow="Evolución" title="Movimiento de ventas" />
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Dato del gráfico">
              <button type="button" aria-pressed={chartMetric === "amount"} onClick={() => setChartMetric("amount")} className={"rounded-lg px-3 py-1.5 text-xs font-semibold transition " + (chartMetric === "amount" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-200" : "text-slate-500 dark:text-slate-400")}>Ingresos</button>
              <button type="button" aria-pressed={chartMetric === "orders"} onClick={() => setChartMetric("orders")} className={"rounded-lg px-3 py-1.5 text-xs font-semibold transition " + (chartMetric === "orders" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-200" : "text-slate-500 dark:text-slate-400")}>Operaciones</button>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Período actual</span>
            {data.hasComparableHistory && <span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" /> Período anterior</span>}
          </div>
          {data.orders || (data.hasComparableHistory && data.previousOrders) ? <SalesTrendChart timeline={data.timeline} metric={chartMetric} showPrevious={data.hasComparableHistory} /> : <div className="flex h-[270px] items-center justify-center text-sm text-slate-400">Todavía no hay ventas para graficar.</div>}
        </article>

        <article className={cardClass}>
          <SectionHeading eyebrow="Composición" title="Medios de pago" />
          <PaymentChart methods={data.paymentMethods} />
          <div className="mt-2 space-y-3">
            {data.paymentMethods.map((method, index) => <div key={method.key} className="flex items-center gap-3 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: paymentColors[index % paymentColors.length] }} />
              <span className="min-w-0 flex-1 font-medium text-slate-600 dark:text-slate-300">{method.name}</span>
              <span className="text-slate-400">{data.revenue ? Math.round(method.value / data.revenue * 100) : 0}%</span>
              <strong className="text-slate-800 dark:text-white">{money(method.value)}</strong>
            </div>)}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]" aria-label="Patrones y productos">
        <article className={cardClass}>
          <SectionHeading eyebrow="Patrón semanal" title="Ventas por día" />
          <WeekdayChart weekdays={data.weekdays} />
          <p className="mt-1 text-xs text-slate-400">Suma de ventas de cada día de la semana dentro del período elegido.</p>
        </article>
        <article className={cardClass}>
          <SectionHeading eyebrow="Favoritos" title="Productos más vendidos" href="/admin/sales-reports" linkLabel="Ver reporte" />
          <div className="space-y-4">
            {data.topProducts.length ? data.topProducts.map((product, index) => <div key={product.name + index} className="group">
              <div className="mb-2 flex items-start gap-3">
                <span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold " + (index === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300")}>{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-white" title={product.name}>{product.name}</span>
                <span className="shrink-0 text-right"><strong className="block text-sm text-slate-800 dark:text-white">{money(product.revenue)}</strong><small className="text-xs text-slate-400">{number(product.quantity)} uds.</small></span>
              </div>
              <div className="ml-11 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={"h-full rounded-full bg-gradient-to-r " + (index === 0 ? "from-amber-400 to-orange-500" : "from-indigo-500 to-cyan-400")} style={{ width: String(Math.max(3, product.revenue / topRevenue * 100)) + "%" }} /></div>
            </div>) : <p className="py-12 text-center text-sm text-slate-400">No hay detalle de productos en este período.</p>}
          </div>
          {data.orders > data.salesWithDetail && <p className="mt-5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Algunas ventas históricas no traen artículos detallados; el ranking usa las que sí los tienen.</p>}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]" aria-label="Inventario y últimas ventas">
        <article className={cardClass}>
          <SectionHeading eyebrow="Inventario" title="Estado de productos" href="/admin/products" linkLabel="Gestionar" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-500/10"><p className="text-xs font-medium text-indigo-600 dark:text-indigo-300">Activos</p><p className="mt-2 text-3xl font-bold text-indigo-950 dark:text-white">{number(data.activeProducts)}</p></div>
            <div className="rounded-2xl bg-cyan-50 p-4 dark:bg-cyan-500/10"><p className="text-xs font-medium text-cyan-700 dark:text-cyan-300">Con control de stock</p><p className="mt-2 text-3xl font-bold text-cyan-950 dark:text-white">{number(data.trackedProducts)}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{number(data.outOfStock)} agotados</span>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{number(data.lowStock)} con stock bajo</span>
          </div>
          {data.untrackedProducts > 0 && <div className="mt-5 flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />
            <div><p className="text-sm font-semibold text-indigo-950 dark:text-white">{number(data.untrackedProducts)} productos sin cantidad configurada</p><p className="mt-1 text-xs leading-relaxed text-indigo-700/80 dark:text-indigo-200/70">El respaldo del restaurante no incluye existencias físicas. Podés activar el control y cargar la cantidad inicial desde Productos.</p></div>
          </div>}
        </article>
        <article className={cardClass}>
          <SectionHeading eyebrow="Actividad" title="Últimas ventas" href="/admin/sales-reports" linkLabel="Ver todas" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentSales.length ? data.recentSales.map((sale) => <div key={sale.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-cyan-100 text-indigo-600 dark:from-indigo-500/20 dark:to-cyan-500/20 dark:text-indigo-300"><ReceiptText className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800 dark:text-white">Venta #{sale.id}</p><p className="text-xs text-slate-400">{new Date(sale.date).toLocaleString("es-PY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {sale.items.length} {sale.items.length === 1 ? "producto" : "productos"}</p></div>
              <strong className="shrink-0 text-sm text-slate-800 dark:text-white">{money(sale.total)}</strong>
            </div>) : <p className="py-10 text-center text-sm text-slate-400">Todavía no se registraron ventas.</p>}
          </div>
        </article>
      </section>

      <section className={cardClass} aria-label="Accesos rápidos">
        <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">Atajos</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Seguí trabajando</h2></div><CalendarDays className="h-5 w-5 text-slate-300" /></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => <Link key={action.href} href={action.href} className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-indigo-500/40">
            <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm " + action.color}><action.icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-800 dark:text-white">{action.title}</strong><small className="block truncate text-xs text-slate-400">{action.detail}</small></span>
            <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
          </Link>)}
        </div>
      </section>
      <p className="px-1 text-xs text-slate-400">Los importes y gráficos se calculan sobre ventas registradas. Los gastos históricos incompletos no se presentan como ganancia neta.</p>
    </div>
  </main>
}
