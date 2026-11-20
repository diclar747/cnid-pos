"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDownUp, ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Loader2, Printer, RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/api-client"
import { businessDateKey } from "@/lib/business-date"
import { downloadXlsx } from "@/lib/xlsx-lite"
import { printReport } from "@/lib/print-report"
import { useCompany } from "../../context/company-context"

type Line = { productId: number | null; name: string; category: string; quantity: number; subtotal: number }
type Row = { id: number; date: string; total: number; amount: number; lines: Line[]; methods: { code: string; name: string; amount: number }[]
  userName: string; customerName: string; customerRuc: string; orderType: string; typeName: string; tableLabel: string; waiterName: string }
type Report = {
  summary: { sales: number; revenue: number; units: number; average: number; products: number; lineFilter: boolean }
  byProduct: { productId: number | null; name: string; category: string; quantity: number; revenue: number; sales: number }[]
  byCategory: { category: string; quantity: number; revenue: number; sales: number }[]
  byMethod: { code: string; name: string; amount: number; sales: number }[]
  byUser: { name: string; revenue: number; sales: number }[]
  byType: { type: string; name: string; revenue: number; sales: number }[]
  byDay: { date: string; revenue: number; sales: number }[]
  options: { categories: string[]; products: { id: number; name: string; category: string }[]; methods: { code: string; name: string }[]; users: { id: number; name: string }[] }
  rows: Row[]; total: number; page: number; pages: number; pageSize: number
}

const gs = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const shift = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return businessDateKey(date) }
const monthStart = (offset = 0) => { const now = new Date(); return businessDateKey(new Date(now.getFullYear(), now.getMonth() + offset, 1, 12)) }
const monthEnd = (offset = 0) => { const now = new Date(); return businessDateKey(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 12)) }
const ranges = [
  { label: "Hoy", from: () => shift(0), to: () => shift(0) },
  { label: "Ayer", from: () => shift(-1), to: () => shift(-1) },
  { label: "7 días", from: () => shift(-6), to: () => shift(0) },
  { label: "30 días", from: () => shift(-29), to: () => shift(0) },
  { label: "Este mes", from: () => monthStart(), to: () => shift(0) },
  { label: "Mes pasado", from: () => monthStart(-1), to: () => monthEnd(-1) },
]
const when = (iso: string) => new Date(iso).toLocaleString("es-PY", { timeZone: "America/Asuncion", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
const dayLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString("es-PY", { weekday: "short", day: "2-digit", month: "2-digit" })
const select = "h-10 w-full rounded-xl border bg-background px-3 text-sm"

export default function SalesReportsPage() {
  const { companyConfig } = useCompany()
  const [from, setFrom] = useState(shift(0))
  const [to, setTo] = useState(shift(0))
  const [category, setCategory] = useState("")
  const [product, setProduct] = useState("")
  const [method, setMethod] = useState("")
  const [cashier, setCashier] = useState("")
  const [type, setType] = useState("")
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("date_desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [open, setOpen] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [tab, setTab] = useState<"products" | "categories" | "methods" | "users">("products")

  useEffect(() => { const timer = setTimeout(() => setSearch(query.trim()), 350); return () => clearTimeout(timer) }, [query])
  useEffect(() => { setPage(1) }, [from, to, category, product, method, cashier, type, search, sort, pageSize])

  const params = useCallback((extra: Record<string, string> = {}) => {
    const values: Record<string, string> = { from, to, category, product, method, user: cashier, type, q: search, sort, page: String(page), pageSize: String(pageSize), ...extra }
    return new URLSearchParams(Object.entries(values).filter(([, value]) => value !== "")).toString()
  }, [from, to, category, product, method, cashier, type, search, sort, page, pageSize])

  useEffect(() => {
    let alive = true
    setLoading(true)
    apiRequest<Report>(`/api/reports/sales?${params()}`)
      .then((result) => { if (alive) { setReport(result); setError("") } })
      .catch((failure) => { if (alive) setError(failure instanceof Error ? failure.message : "No se pudo cargar el reporte.") })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [params])

  const products = useMemo(() => (report?.options.products ?? []).filter((item) => !category || item.category === category), [report?.options.products, category])
  const filtersLabel = useMemo(() => {
    const parts = [`${from === to ? from : `${from} al ${to}`}`]
    if (category) parts.push(`Categoría: ${category}`)
    if (product) parts.push(`Producto: ${report?.options.products.find((item) => String(item.id) === product)?.name ?? product}`)
    if (method) parts.push(`Pago: ${report?.options.methods.find((item) => item.code === method)?.name ?? method}`)
    if (cashier) parts.push(`Cajero: ${report?.options.users.find((item) => String(item.id) === cashier)?.name ?? cashier}`)
    if (type) parts.push(`Tipo: ${({ dineIn: "En el local", delivery: "Delivery", pickup: "Retiro" } as Record<string, string>)[type]}`)
    if (search) parts.push(`Búsqueda: «${search}»`)
    return parts.join(" · ")
  }, [from, to, category, product, method, cashier, type, search, report?.options])
  const reset = () => { setCategory(""); setProduct(""); setMethod(""); setCashier(""); setType(""); setQuery(""); setSort("date_desc") }

  const fetchAll = () => apiRequest<Report>(`/api/reports/sales?${params({ all: "1", page: "1" })}`)
  const exportExcel = async () => {
    setExporting(true)
    try {
      const data = await fetchAll()
      downloadXlsx(`ventas-${from}-a-${to}`, [
        { name: "Ventas", title: `Ventas · ${filtersLabel}`, widths: [10, 18, 12, 14, 18, 22, 16, 22, 60],
          rows: [["Ticket", "Fecha", "Tipo", "Importe", "Medio de pago", "Cliente", "RUC", "Cajero / mesero", "Productos"],
            ...data.rows.map((row) => [row.id, when(row.date), row.typeName, row.amount, row.methods.map((entry) => entry.name).join(" + "), row.customerName, row.customerRuc,
              [row.userName, row.waiterName && `Mesero: ${row.waiterName}`].filter(Boolean).join(" · "), row.lines.map((line) => `${line.quantity} × ${line.name}`).join(", ")]),
            [], ["", "", "Total", data.summary.revenue]] },
        { name: "Detalle por producto", widths: [10, 18, 30, 22, 10, 14],
          rows: [["Ticket", "Fecha", "Producto", "Categoría", "Cantidad", "Subtotal"],
            ...data.rows.flatMap((row) => row.lines.filter((line) => (!category || line.category === category) && (!product || String(line.productId) === product))
              .map((line) => [row.id, when(row.date), line.name, line.category, line.quantity, line.subtotal]))] },
        { name: "Productos", widths: [36, 22, 12, 12, 16], rows: [["Producto", "Categoría", "Cantidad", "Tickets", "Ventas"], ...data.byProduct.map((item) => [item.name, item.category, item.quantity, item.sales, item.revenue])] },
        { name: "Categorías", widths: [26, 12, 12, 16], rows: [["Categoría", "Cantidad", "Tickets", "Ventas"], ...data.byCategory.map((item) => [item.category, item.quantity, item.sales, item.revenue])] },
        { name: "Medios de pago", widths: [24, 12, 16], rows: [["Medio de pago", "Tickets", "Importe"], ...data.byMethod.map((item) => [item.name, item.sales, item.amount])] },
        { name: "Por día", widths: [14, 12, 16], rows: [["Fecha", "Tickets", "Ventas"], ...data.byDay.map((item) => [item.date, item.sales, item.revenue])] },
      ])
    } catch (failure) { alert(failure instanceof Error ? failure.message : "No se pudo exportar.") } finally { setExporting(false) }
  }
  const exportPrint = async () => {
    setExporting(true)
    try {
      const data = await fetchAll()
      printReport({
        title: "Reporte de ventas", subtitle: filtersLabel, business: companyConfig?.name ?? "", landscape: true,
        summary: [{ label: "Ventas", value: gs(data.summary.revenue) }, { label: "Tickets", value: data.summary.sales.toLocaleString("es-PY") },
          { label: "Ticket promedio", value: gs(data.summary.average) }, { label: "Unidades", value: data.summary.units.toLocaleString("es-PY") }],
        tables: [
          { title: "Por categoría", headers: ["Categoría", "Cantidad", "Tickets", "Ventas"], align: ["left", "right", "right", "right"],
            rows: data.byCategory.map((item) => [item.category, item.quantity, item.sales, gs(item.revenue)]) },
          { title: "Por medio de pago", headers: ["Medio", "Tickets", "Importe"], align: ["left", "right", "right"], rows: data.byMethod.map((item) => [item.name, item.sales, gs(item.amount)]) },
          { title: "Productos", headers: ["Producto", "Categoría", "Cantidad", "Ventas"], align: ["left", "left", "right", "right"],
            rows: data.byProduct.map((item) => [item.name, item.category, item.quantity, gs(item.revenue)]) },
          { title: "Detalle de ventas", headers: ["Ticket", "Fecha", "Tipo", "Pago", "Cliente", "Productos", "Importe"], align: ["left", "left", "left", "left", "left", "left", "right"],
            rows: data.rows.map((row) => [`#${row.id}`, when(row.date), row.typeName, row.methods.map((entry) => entry.name).join(" + "), row.customerName || "—",
              row.lines.map((line) => `${line.quantity} × ${line.name}`).join(", "), gs(row.amount)]),
            footer: ["", "", "", "", "", "Total", gs(data.summary.revenue)] },
        ],
      })
    } catch (failure) { alert(failure instanceof Error ? failure.message : "No se pudo preparar el reporte.") } finally { setExporting(false) }
  }

  const summary = report?.summary
  const maxDay = Math.max(1, ...(report?.byDay ?? []).map((day) => day.revenue))
  const ranking = tab === "products" ? (report?.byProduct ?? []).map((item) => ({ key: `${item.productId ?? item.name}`, name: item.name, detail: `${item.category} · ${item.quantity.toLocaleString("es-PY")} u.`, value: item.revenue }))
    : tab === "categories" ? (report?.byCategory ?? []).map((item) => ({ key: item.category, name: item.category, detail: `${item.quantity.toLocaleString("es-PY")} u. · ${item.sales} tickets`, value: item.revenue }))
    : tab === "methods" ? (report?.byMethod ?? []).map((item) => ({ key: item.code, name: item.name, detail: `${item.sales} tickets`, value: item.amount }))
    : (report?.byUser ?? []).map((item) => ({ key: item.name, name: item.name, detail: `${item.sales} tickets`, value: item.revenue }))
  const maxRank = Math.max(1, ...ranking.map((item) => item.value))
  const rankTotal = ranking.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Reporte de ventas</h1>
          <p className="text-sm text-muted-foreground">{filtersLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportExcel()} disabled={exporting || !summary?.sales} className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />} Excel
          </Button>
          <Button variant="outline" onClick={() => void exportPrint()} disabled={exporting || !summary?.sales} title="Abre el reporte para guardarlo como PDF"><FileText className="mr-2 h-4 w-4" /> PDF</Button>
          <Button variant="outline" onClick={() => void exportPrint()} disabled={exporting || !summary?.sales}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>
      </div>

      {/* Filtros */}
      <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {ranges.map((range) => {
            const active = from === range.from() && to === range.to()
            return <button key={range.label} type="button" onClick={() => { setFrom(range.from()); setTo(range.to()) }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? "border-indigo-600 bg-indigo-600 text-white" : "hover:bg-muted"}`}>{range.label}</button>
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <label className="text-xs font-medium text-muted-foreground">Desde<Input type="date" value={from} max={to} onChange={(event) => event.target.value && setFrom(event.target.value)} className="mt-1 rounded-xl" /></label>
          <label className="text-xs font-medium text-muted-foreground">Hasta<Input type="date" value={to} min={from} onChange={(event) => event.target.value && setTo(event.target.value)} className="mt-1 rounded-xl" /></label>
          <label className="text-xs font-medium text-muted-foreground">Categoría<select value={category} onChange={(event) => { setCategory(event.target.value); setProduct("") }} className={`mt-1 ${select}`}>
            <option value="">Todas</option>{report?.options.categories.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
          <label className="text-xs font-medium text-muted-foreground">Producto<select value={product} onChange={(event) => setProduct(event.target.value)} className={`mt-1 ${select}`}>
            <option value="">Todos</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-medium text-muted-foreground">Medio de pago<select value={method} onChange={(event) => setMethod(event.target.value)} className={`mt-1 ${select}`}>
            <option value="">Todos</option>{report?.options.methods.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
          <label className="text-xs font-medium text-muted-foreground">Cajero<select value={cashier} onChange={(event) => setCashier(event.target.value)} className={`mt-1 ${select}`}>
            <option value="">Todos</option>{report?.options.users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-medium text-muted-foreground">Tipo<select value={type} onChange={(event) => setType(event.target.value)} className={`mt-1 ${select}`}>
            <option value="">Todos</option><option value="dineIn">En el local</option><option value="delivery">Delivery</option><option value="pickup">Retiro</option></select></label>
          <label className="text-xs font-medium text-muted-foreground">Buscar<div className="relative mt-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticket, cliente, mesa…" className="rounded-xl pl-9" /></div></label>
        </div>
        {(category || product || method || cashier || type || query) && <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Quitar filtros</Button>}
      </section>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: summary?.lineFilter ? "Ventas del filtro" : "Ventas", value: summary ? gs(summary.revenue) : "—", tone: "from-indigo-600 to-violet-600 text-white" },
          { label: "Tickets", value: summary ? summary.sales.toLocaleString("es-PY") : "—", tone: "bg-card" },
          { label: "Ticket promedio", value: summary ? gs(summary.average) : "—", tone: "bg-card" },
          { label: "Unidades vendidas", value: summary ? summary.units.toLocaleString("es-PY") : "—", tone: "bg-card" },
        ].map((tile, index) => <div key={tile.label} className={`rounded-2xl border p-4 shadow-sm ${index === 0 ? `bg-gradient-to-br ${tile.tone} border-transparent` : tile.tone}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${index === 0 ? "text-indigo-100" : "text-muted-foreground"}`}>{tile.label}</p>
          <p className="mt-1 text-2xl font-black tabular-nums sm:text-3xl">{loading && !summary ? <Loader2 className="h-6 w-6 animate-spin" /> : tile.value}</p>
        </div>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        {/* Ventas por día: una sola serie, barras finas con el valor al pasar el mouse */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-3">
          <h2 className="font-bold">Ventas por día</h2>
          <p className="mb-3 text-xs text-muted-foreground">Importe vendido cada día del período</p>
          {!report?.byDay.length ? <p className="py-10 text-center text-sm text-muted-foreground">Sin ventas en el período.</p>
            : <div className="flex h-48 items-end gap-1 overflow-x-auto border-b border-slate-200 pb-0 dark:border-slate-700">
              {report.byDay.map((day) => <div key={day.date} className="group relative flex h-full min-w-[18px] flex-1 flex-col justify-end" title={`${dayLabel(day.date)}: ${gs(day.revenue)} · ${day.sales} tickets`}>
                <div className="mx-auto w-full max-w-10 rounded-t bg-indigo-500 transition group-hover:bg-indigo-600 dark:bg-indigo-400" style={{ height: `${Math.max(2, (day.revenue / maxDay) * 100)}%` }} />
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow group-hover:block">{dayLabel(day.date)} · {gs(day.revenue)}</span>
              </div>)}
            </div>}
          {report && report.byDay.length > 0 && <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{dayLabel(report.byDay[0].date)}</span><span>{dayLabel(report.byDay[report.byDay.length - 1].date)}</span></div>}
        </div>

        {/* Rankings */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-2">
          <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-muted p-1 text-xs font-semibold">
            {([["products", "Productos"], ["categories", "Categorías"], ["methods", "Pagos"], ["users", "Cajeros"]] as const).map(([value, label]) =>
              <button key={value} type="button" onClick={() => setTab(value)} className={`flex-1 rounded-lg px-2 py-1.5 ${tab === value ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{label}</button>)}
          </div>
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {ranking.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">Sin datos.</li>}
            {ranking.map((item, index) => <li key={item.key} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate"><span className="mr-1 text-xs text-muted-foreground">{index + 1}.</span><span className="font-semibold">{item.name}</span></span>
                <span className="shrink-0 font-semibold tabular-nums">{gs(item.value)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ width: `${(item.value / maxRank) * 100}%` }} /></div>
                <span className="w-24 shrink-0 truncate text-right text-[11px] text-muted-foreground">{rankTotal ? `${Math.round((item.value / rankTotal) * 100)}%` : ""} · {item.detail}</span>
              </div>
            </li>)}
          </ul>
        </div>
      </section>

      {/* Detalle de ventas */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-bold">Detalle de ventas</h2>
            <p className="text-xs text-muted-foreground">{report ? `${report.total.toLocaleString("es-PY")} ventas · página ${report.page} de ${report.pages}` : "Cargando…"}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-lg border bg-background px-2">
              <option value="date_desc">Más recientes</option><option value="date_asc">Más antiguas</option><option value="total_desc">Mayor importe</option><option value="total_asc">Menor importe</option>
            </select>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-9 rounded-lg border bg-background px-2" aria-label="Filas por página">
              {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} por página</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="w-8 px-3 py-2.5" /><th className="px-3 py-2.5">Ticket</th><th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Tipo</th><th className="px-3 py-2.5">Cliente</th>
                <th className="px-3 py-2.5">Pago</th><th className="px-3 py-2.5">Cajero</th><th className="px-3 py-2.5 text-right">Importe</th></tr>
            </thead>
            <tbody className="divide-y">
              {loading && !report && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
              {report?.rows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No hay ventas con estos filtros.</td></tr>}
              {report?.rows.map((row) => <Fragment key={row.id}>
                <tr onClick={() => setOpen(open === row.id ? null : row.id)} className={`cursor-pointer transition hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 ${open === row.id ? "bg-indigo-50/60 dark:bg-indigo-950/30" : ""}`}>
                  <td className="px-3 py-2.5"><ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open === row.id ? "rotate-180" : ""}`} /></td>
                  <td className="px-3 py-2.5 font-bold">#{row.id}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{when(row.date)}</td>
                  <td className="px-3 py-2.5"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">{row.typeName}</span>{row.tableLabel && <span className="ml-1 text-xs text-muted-foreground">{row.tableLabel.split(" · ").pop()}</span>}</td>
                  <td className="max-w-48 truncate px-3 py-2.5">{row.customerName || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-xs">{row.methods.map((entry) => entry.name).join(" + ") || "—"}</td>
                  <td className="max-w-40 truncate px-3 py-2.5 text-xs text-muted-foreground">{row.userName}{row.waiterName ? ` · ${row.waiterName}` : ""}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums">{gs(row.amount)}{row.amount !== row.total && <span className="block text-[11px] font-normal text-muted-foreground">de {gs(row.total)}</span>}</td>
                </tr>
                {open === row.id && <tr className="bg-slate-50/80 dark:bg-slate-900/60"><td /><td colSpan={7} className="px-3 pb-3 pt-1">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground"><tr><th className="py-1 text-left font-medium">Producto</th><th className="py-1 text-left font-medium">Categoría</th><th className="py-1 text-right font-medium">Cant.</th><th className="py-1 text-right font-medium">Subtotal</th></tr></thead>
                    <tbody>{row.lines.map((line, index) => <tr key={index} className={(category && line.category !== category) || (product && String(line.productId) !== product) ? "opacity-45" : ""}>
                      <td className="py-1 font-medium">{line.name}</td><td className="py-1 text-muted-foreground">{line.category}</td><td className="py-1 text-right tabular-nums">{line.quantity}</td><td className="py-1 text-right tabular-nums">{gs(line.subtotal)}</td></tr>)}</tbody>
                  </table>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {row.methods.map((entry, index) => <span key={index}>{entry.name}: <b className="text-foreground">{gs(entry.amount)}</b></span>)}
                    {row.customerRuc && <span>RUC {row.customerRuc}</span>}
                    <a href={`/receipt/sale/${row.id}`} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300">Ver ticket</a>
                  </div>
                </td></tr>}
              </Fragment>)}
            </tbody>
          </table>
        </div>
        {report && report.pages > 1 && <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-sm">
          <span className="text-muted-foreground">Mostrando {(report.page - 1) * report.pageSize + 1}–{Math.min(report.page * report.pageSize, report.total)} de {report.total.toLocaleString("es-PY")}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={report.page <= 1} onClick={() => setPage(report.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            {Array.from({ length: report.pages }, (_, i) => i + 1).filter((n) => n === 1 || n === report.pages || Math.abs(n - report.page) <= 1)
              .map((n, i, list) => <Fragment key={n}>{i > 0 && n - list[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
                <Button variant={n === report.page ? "default" : "outline"} size="sm" className="min-w-9" onClick={() => setPage(n)}>{n}</Button></Fragment>)}
            <Button variant="outline" size="sm" disabled={report.page >= report.pages} onClick={() => setPage(report.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>}
      </section>
    </div>
  )
}
