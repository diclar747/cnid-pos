"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { Ban, ChevronDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Loader2, Plus, Printer, RotateCcw, ScanLine, Search, Sparkles } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/api-client"
import { businessDateKey } from "@/lib/business-date"
import { downloadXlsx } from "@/lib/xlsx-lite"
import { printReport } from "@/lib/print-report"
import { useLiveTables } from "@/lib/use-live"
import type { PurchaseInvoice } from "@/lib/purchase-invoice-types"
import PurchaseInvoiceDialog from "../../components/purchase-invoice-dialog"
import { useSuppliers } from "../../context/suppliers-context"
import { useCompany } from "../../context/company-context"

type Result = {
  items: PurchaseInvoice[]; total: number; page: number; pages: number; pageSize: number
  summary: { count: number; total: number; tax: number; credit: number }
  bySupplier: { supplierId: number | null; name: string; count: number; total: number }[]
  byCategory: { category: string; count: number; total: number }[]
  options: { categories: string[] }
}

const gs = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const shift = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return businessDateKey(date) }
const monthStart = (offset = 0) => { const now = new Date(); return businessDateKey(new Date(now.getFullYear(), now.getMonth() + offset, 1, 12)) }
const monthEnd = (offset = 0) => { const now = new Date(); return businessDateKey(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 12)) }
const ranges = [
  { label: "Hoy", from: () => shift(0), to: () => shift(0) },
  { label: "7 días", from: () => shift(-6), to: () => shift(0) },
  { label: "30 días", from: () => shift(-29), to: () => shift(0) },
  { label: "Este mes", from: () => monthStart(), to: () => shift(0) },
  { label: "Mes pasado", from: () => monthStart(-1), to: () => monthEnd(-1) },
  { label: "Este año", from: () => `${shift(0).slice(0, 4)}-01-01`, to: () => shift(0) },
]
const day = (key: string) => key ? new Date(`${key}T12:00:00`).toLocaleDateString("es-PY") : "—"
const select = "h-10 w-full rounded-xl border bg-background px-3 text-sm"

export default function PurchasesPage() {
  const { suppliers } = useSuppliers()
  const { companyConfig } = useCompany()
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(shift(0))
  const [supplier, setSupplier] = useState("")
  const [category, setCategory] = useState("")
  const [condition, setCondition] = useState("")
  const [status, setStatus] = useState("active")
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("date_desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [data, setData] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [open, setOpen] = useState<number | null>(null)
  const [dialog, setDialog] = useState<"manual" | "scan" | null>(null)
  const [exporting, setExporting] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => { const timer = setTimeout(() => setSearch(query.trim()), 350); return () => clearTimeout(timer) }, [query])
  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    if (search.has("scan")) setDialog("scan"); else if (search.has("new")) setDialog("manual")
    if (search.has("scan") || search.has("new")) window.history.replaceState(null, "", "/admin/purchases")
  }, [])
  useEffect(() => { setPage(1) }, [from, to, supplier, category, condition, status, search, sort, pageSize])
  const params = useCallback((extra: Record<string, string> = {}) => new URLSearchParams(Object.entries({ from, to, supplier, category, condition, status, q: search, sort,
    page: String(page), pageSize: String(pageSize), ...extra }).filter(([, value]) => value !== "")).toString(), [from, to, supplier, category, condition, status, search, sort, page, pageSize])

  useEffect(() => {
    let alive = true
    setLoading(true)
    apiRequest<Result>(`/api/purchase-invoices?${params()}`)
      .then((result) => { if (alive) { setData(result); setError("") } })
      .catch((failure) => { if (alive) setError(failure instanceof Error ? failure.message : "No se pudieron cargar las compras.") })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [params, refresh])
  useLiveTables(["purchase_invoices"], () => setRefresh((value) => value + 1), 60000)

  const label = [from === to ? day(from) : `${day(from)} al ${day(to)}`, supplier && `Proveedor: ${suppliers.find((item) => String(item.id) === supplier)?.name ?? supplier}`,
    category && `Categoría: ${category}`, condition && (condition === "credit" ? "Crédito" : "Contado"), status === "cancelled" ? "Anuladas" : status === "all" ? "Incluye anuladas" : "",
    search && `Búsqueda: «${search}»`].filter(Boolean).join(" · ")
  const reset = () => { setSupplier(""); setCategory(""); setCondition(""); setStatus("active"); setQuery(""); setSort("date_desc") }

  const cancel = async (invoice: PurchaseInvoice) => {
    const reason = window.prompt(`Anular la factura ${invoice.invoiceNumber || `#${invoice.id}`} de ${invoice.supplierName} (${gs(invoice.total)}).\nSe descuenta del stock lo que se había sumado.\n\nMotivo:`)
    if (reason === null) return
    try {
      const result = await apiRequest<{ note: string }>(`/api/purchase-invoices/${invoice.id}`, { method: "PATCH", body: JSON.stringify({ action: "cancel", reason }) })
      toast.success("Factura anulada")
      if (result.note) toast(result.note, { duration: 8000 })
      window.dispatchEvent(new Event("purchases:changed")); window.dispatchEvent(new Event("products:changed"))
      setRefresh((value) => value + 1)
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "No se pudo anular.") }
  }

  const all = () => apiRequest<Result>(`/api/purchase-invoices?${params({ all: "1", page: "1" })}`)
  const exportExcel = async () => {
    setExporting(true)
    try {
      const result = await all()
      downloadXlsx(`compras-${from}-a-${to}`, [
        { name: "Facturas", title: `Compras · ${label}`, widths: [8, 12, 30, 14, 18, 10, 14, 12, 12, 16, 12, 30],
          rows: [["ID", "Fecha", "Proveedor", "RUC", "N.º factura", "Condición", "Exentas", "IVA 5 %", "IVA 10 %", "Total", "Estado", "Notas"],
            ...result.items.map((item) => [item.id, item.invoiceDate, item.supplierName, item.supplierRuc, item.invoiceNumber, item.condition === "credit" ? "Crédito" : "Contado",
              item.exempt, item.tax5, item.tax10, item.total, item.status === "cancelled" ? "Anulada" : "Vigente", item.notes]),
            [], ["", "", "", "", "", "Total", "", "", "", result.summary.total]] },
        { name: "Ítems", widths: [12, 26, 18, 36, 18, 10, 8, 14, 8, 14, 26],
          rows: [["Fecha", "Proveedor", "N.º factura", "Descripción", "Categoría", "Cantidad", "Unidad", "Precio unit.", "IVA", "Total", "Producto del menú"],
            ...result.items.flatMap((item) => item.items.map((line) => [item.invoiceDate, item.supplierName, item.invoiceNumber, line.description, line.category || "Sin categoría",
              line.quantity, line.unit, line.unitCost, line.taxRate ? `${line.taxRate} %` : "Exenta", line.total, line.productName]))] },
        { name: "Por proveedor", widths: [32, 12, 16], rows: [["Proveedor", "Facturas", "Total"], ...result.bySupplier.map((item) => [item.name, item.count, item.total])] },
        { name: "Por categoría", widths: [26, 12, 16], rows: [["Categoría", "Facturas", "Total"], ...result.byCategory.map((item) => [item.category, item.count, item.total])] },
      ])
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "No se pudo exportar.") } finally { setExporting(false) }
  }
  const exportPrint = async () => {
    setExporting(true)
    try {
      const result = await all()
      printReport({ title: "Reporte de compras", subtitle: label, business: companyConfig?.name ?? "", landscape: true,
        summary: [{ label: "Total compras", value: gs(result.summary.total) }, { label: "Facturas", value: String(result.summary.count) },
          { label: "IVA crédito fiscal", value: gs(result.summary.tax) }, { label: "A crédito", value: gs(result.summary.credit) }],
        tables: [
          { title: "Por proveedor", headers: ["Proveedor", "Facturas", "Total"], align: ["left", "right", "right"], rows: result.bySupplier.map((item) => [item.name, item.count, gs(item.total)]) },
          { title: "Por categoría", headers: ["Categoría", "Facturas", "Total"], align: ["left", "right", "right"], rows: result.byCategory.map((item) => [item.category, item.count, gs(item.total)]) },
          { title: "Facturas", headers: ["Fecha", "Proveedor", "N.º", "Condición", "Ítems", "IVA", "Total"], align: ["left", "left", "left", "left", "left", "right", "right"],
            rows: result.items.map((item) => [day(item.invoiceDate), item.supplierName, item.invoiceNumber || "—", item.condition === "credit" ? "Crédito" : "Contado",
              item.items.map((line) => `${line.quantity} ${line.unit} ${line.description}`).join(", "), gs(item.tax5 + item.tax10), `${gs(item.total)}${item.status === "cancelled" ? " (anulada)" : ""}`]),
            footer: ["", "", "", "", "", "Total", gs(result.summary.total)] },
        ] })
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "No se pudo preparar el reporte.") } finally { setExporting(false) }
  }

  const maxSupplier = Math.max(1, ...(data?.bySupplier ?? []).map((item) => item.total))
  const maxCategory = Math.max(1, ...(data?.byCategory ?? []).map((item) => item.total))

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Compras</h1>
          <p className="text-sm text-muted-foreground">Facturas de proveedores: insumos, mercadería y gastos de compra · {label}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialog("scan")} className="bg-violet-600 text-white hover:bg-violet-700"><Sparkles className="mr-2 h-4 w-4" /> Escanear factura</Button>
          <Button onClick={() => setDialog("manual")} className="bg-indigo-600 text-white hover:bg-indigo-700"><Plus className="mr-2 h-4 w-4" /> Registrar compra</Button>
          <Button variant="outline" onClick={() => void exportExcel()} disabled={exporting || !data?.summary.count} className="border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />} Excel</Button>
          <Button variant="outline" onClick={() => void exportPrint()} disabled={exporting || !data?.summary.count} title="Guardar como PDF desde la impresión"><FileText className="mr-2 h-4 w-4" /> PDF</Button>
          <Button variant="outline" onClick={() => void exportPrint()} disabled={exporting || !data?.summary.count}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
        </div>
      </div>

      <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-1.5">{ranges.map((range) => {
          const active = from === range.from() && to === range.to()
          return <button key={range.label} type="button" onClick={() => { setFrom(range.from()); setTo(range.to()) }}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? "border-indigo-600 bg-indigo-600 text-white" : "hover:bg-muted"}`}>{range.label}</button>
        })}</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <label className="text-xs font-medium text-muted-foreground">Desde<Input type="date" value={from} max={to} onChange={(event) => event.target.value && setFrom(event.target.value)} className="mt-1 rounded-xl" /></label>
          <label className="text-xs font-medium text-muted-foreground">Hasta<Input type="date" value={to} min={from} onChange={(event) => event.target.value && setTo(event.target.value)} className="mt-1 rounded-xl" /></label>
          <label className="text-xs font-medium text-muted-foreground">Proveedor<select value={supplier} onChange={(event) => setSupplier(event.target.value)} className={`mt-1 ${select}`}>
            <option value="">Todos</option>{[...suppliers].sort((a, b) => a.name.localeCompare(b.name, "es")).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-medium text-muted-foreground">Categoría<select value={category} onChange={(event) => setCategory(event.target.value)} className={`mt-1 ${select}`}>
            <option value="">Todas</option>{data?.options.categories.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
          <label className="text-xs font-medium text-muted-foreground">Condición<select value={condition} onChange={(event) => setCondition(event.target.value)} className={`mt-1 ${select}`}>
            <option value="">Todas</option><option value="cash">Contado</option><option value="credit">Crédito</option></select></label>
          <label className="text-xs font-medium text-muted-foreground">Estado<select value={status} onChange={(event) => setStatus(event.target.value)} className={`mt-1 ${select}`}>
            <option value="active">Vigentes</option><option value="cancelled">Anuladas</option><option value="all">Todas</option></select></label>
          <label className="text-xs font-medium text-muted-foreground">Buscar<div className="relative mt-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="N.º, proveedor, ítem…" className="rounded-xl pl-9" /></div></label>
        </div>
        {(supplier || category || condition || status !== "active" || query) && <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Quitar filtros</Button>}
      </section>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ label: "Total compras", value: data ? gs(data.summary.total) : "—" }, { label: "Facturas", value: data ? data.summary.count.toLocaleString("es-PY") : "—" },
          { label: "IVA (crédito fiscal)", value: data ? gs(data.summary.tax) : "—" }, { label: "Compras a crédito", value: data ? gs(data.summary.credit) : "—" }].map((tile, index) =>
          <div key={tile.label} className={`rounded-2xl border p-4 shadow-sm ${index === 0 ? "border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "bg-card"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${index === 0 ? "text-indigo-100" : "text-muted-foreground"}`}>{tile.label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums sm:text-3xl">{loading && !data ? <Loader2 className="h-6 w-6 animate-spin" /> : tile.value}</p>
          </div>)}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {[{ title: "Por proveedor", rows: (data?.bySupplier ?? []).map((item) => ({ key: `${item.supplierId ?? item.name}`, name: item.name, detail: `${item.count} factura(s)`, value: item.total,
            onClick: item.supplierId ? () => setSupplier(String(item.supplierId)) : undefined })), max: maxSupplier },
          { title: "Por categoría", rows: (data?.byCategory ?? []).map((item) => ({ key: item.category, name: item.category, detail: `${item.count} factura(s)`, value: item.total,
            onClick: item.category !== "Sin categoría" ? () => setCategory(item.category) : undefined })), max: maxCategory }].map((card) =>
          <div key={card.title} className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 font-bold">{card.title}</h2>
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {card.rows.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Sin compras en el período.</li>}
              {card.rows.map((row) => <li key={row.key}>
                <button type="button" onClick={row.onClick} disabled={!row.onClick} className="w-full text-left text-sm disabled:cursor-default" title={row.onClick ? "Filtrar" : undefined}>
                  <span className="flex items-baseline justify-between gap-2"><span className="truncate font-semibold">{row.name}</span><span className="shrink-0 font-semibold tabular-nums">{gs(row.value)}</span></span>
                  <span className="mt-1 flex items-center gap-2"><span className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ width: `${(row.value / card.max) * 100}%` }} /></span>
                    <span className="w-20 shrink-0 text-right text-[11px] text-muted-foreground">{row.detail}</span></span>
                </button>
              </li>)}
            </ul>
          </div>)}
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div><h2 className="font-bold">Facturas de compra</h2><p className="text-xs text-muted-foreground">{data ? `${data.total} factura(s) · página ${data.page} de ${data.pages}` : "Cargando…"}</p></div>
          <div className="flex gap-2 text-xs">
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-lg border bg-background px-2"><option value="date_desc">Más recientes</option><option value="date_asc">Más antiguas</option><option value="total_desc">Mayor importe</option></select>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-9 rounded-lg border bg-background px-2">{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} por página</option>)}</select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr>
              <th className="w-8 px-3 py-2.5" /><th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Proveedor</th><th className="px-3 py-2.5">N.º factura</th><th className="px-3 py-2.5">Condición</th>
              <th className="px-3 py-2.5">Ítems</th><th className="px-3 py-2.5 text-right">IVA</th><th className="px-3 py-2.5 text-right">Total</th><th className="w-24 px-3 py-2.5" /></tr></thead>
            <tbody className="divide-y">
              {loading && !data && <tr><td colSpan={9} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>}
              {data?.items.length === 0 && <tr><td colSpan={9} className="py-12 text-center">
                <ScanLine className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">No hay compras en este período</p>
                <p className="text-sm text-muted-foreground">Escaneá una factura o registrala a mano.</p>
                <div className="mt-3 flex justify-center gap-2"><Button size="sm" onClick={() => setDialog("scan")} className="bg-violet-600 text-white hover:bg-violet-700"><Sparkles className="mr-1 h-4 w-4" /> Escanear factura</Button>
                  <Button size="sm" variant="outline" onClick={() => setDialog("manual")}><Plus className="mr-1 h-4 w-4" /> Registrar compra</Button></div>
              </td></tr>}
              {data?.items.map((invoice) => <Fragment key={invoice.id}>
                <tr onClick={() => setOpen(open === invoice.id ? null : invoice.id)} className={`cursor-pointer transition hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 ${invoice.status === "cancelled" ? "opacity-60" : ""} ${open === invoice.id ? "bg-indigo-50/60 dark:bg-indigo-950/30" : ""}`}>
                  <td className="px-3 py-2.5"><ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open === invoice.id ? "rotate-180" : ""}`} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5">{day(invoice.invoiceDate)}</td>
                  <td className="px-3 py-2.5"><span className="font-semibold">{invoice.supplierName}</span>{invoice.supplierRuc && <span className="block text-xs text-muted-foreground">RUC {invoice.supplierRuc}</span>}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{invoice.invoiceNumber || "—"}{invoice.source === "scan" && <span className="ml-1 rounded bg-violet-100 px-1 font-sans text-[10px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">IA</span>}</td>
                  <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${invoice.condition === "credit" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"}`}>{invoice.condition === "credit" ? "Crédito" : "Contado"}</span>
                    {invoice.status === "cancelled" && <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">Anulada</span>}</td>
                  <td className="max-w-72 truncate px-3 py-2.5 text-xs text-muted-foreground">{invoice.items.map((line) => line.description).join(", ")}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-muted-foreground">{gs(invoice.tax5 + invoice.tax10)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums">{gs(invoice.total)}</td>
                  <td className="px-3 py-2.5 text-right" onClick={(event) => event.stopPropagation()}>{invoice.status === "active" && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void cancel(invoice)}><Ban className="mr-1 h-3.5 w-3.5" /> Anular</Button>}</td>
                </tr>
                {open === invoice.id && <tr className="bg-slate-50/80 dark:bg-slate-900/60"><td /><td colSpan={8} className="px-3 pb-3 pt-1">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground"><tr><th className="py-1 text-left font-medium">Descripción</th><th className="py-1 text-left font-medium">Categoría</th><th className="py-1 text-right font-medium">Cantidad</th>
                      <th className="py-1 text-right font-medium">Precio unit.</th><th className="py-1 text-right font-medium">IVA</th><th className="py-1 text-right font-medium">Total</th><th className="py-1 text-left font-medium pl-4">Stock</th></tr></thead>
                    <tbody>{invoice.items.map((line) => <tr key={line.id}>
                      <td className="py-1 font-medium">{line.description}</td><td className="py-1 text-muted-foreground">{line.category || "—"}</td>
                      <td className="py-1 text-right tabular-nums">{line.quantity.toLocaleString("es-PY")} {line.unit}</td><td className="py-1 text-right tabular-nums">{gs(line.unitCost)}</td>
                      <td className="py-1 text-right">{line.taxRate ? `${line.taxRate} %` : "Exenta"}</td><td className="py-1 text-right font-semibold tabular-nums">{gs(line.total)}</td>
                      <td className="py-1 pl-4 text-muted-foreground">{line.productName ? `${line.productName}${line.stockAdded ? ` (+${line.stockAdded})` : ""}` : "—"}</td></tr>)}</tbody>
                  </table>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {invoice.stamp && <span>Timbrado {invoice.stamp}</span>}
                    {invoice.dueDate && <span>Vence {day(invoice.dueDate)}</span>}
                    {invoice.paidFromCash && <span>Pagado con la caja</span>}
                    <span>Cargada por {invoice.createdByName} el {new Date(invoice.createdAt).toLocaleString("es-PY")}</span>
                    {invoice.notes && <span>Notas: {invoice.notes}</span>}
                    {invoice.status === "cancelled" && <span className="text-red-600">Anulada por {invoice.cancelledByName}: {invoice.cancelReason}</span>}
                  </div>
                </td></tr>}
              </Fragment>)}
            </tbody>
          </table>
        </div>
        {data && data.pages > 1 && <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-sm">
          <span className="text-muted-foreground">Mostrando {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} de {data.total}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            {Array.from({ length: data.pages }, (_, i) => i + 1).filter((n) => n === 1 || n === data.pages || Math.abs(n - data.page) <= 1).map((n, i, list) =>
              <Fragment key={n}>{i > 0 && n - list[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
                <Button variant={n === data.page ? "default" : "outline"} size="sm" className="min-w-9" onClick={() => setPage(n)}>{n}</Button></Fragment>)}
            <Button variant="outline" size="sm" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>}
      </section>

      <PurchaseInvoiceDialog open={dialog !== null} startWithScan={dialog === "scan"} onClose={() => setDialog(null)}
        onSaved={(invoice) => { setDialog(null); setRefresh((value) => value + 1); if (invoice.invoiceDate < from || invoice.invoiceDate > to) { setFrom(invoice.invoiceDate < from ? invoice.invoiceDate : from); setTo(invoice.invoiceDate > to ? invoice.invoiceDate : to) } }} />
    </div>
  )
}
