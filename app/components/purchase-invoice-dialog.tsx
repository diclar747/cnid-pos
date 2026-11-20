"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Building2, FileUp, Loader2, Plus, ScanLine, Sparkles, Trash2, X } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiRequest } from "@/lib/api-client"
import { businessDateKey } from "@/lib/business-date"
import { invoiceTotals, PURCHASE_CATEGORIES, PURCHASE_UNITS, type PurchaseInvoice, type PurchaseItemDraft, type ScannedInvoice, type TaxRate } from "@/lib/purchase-invoice-types"
import { useSuppliers } from "../context/suppliers-context"
import { useCart } from "../context/cart-context"

const gs = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const emptyItem = (): PurchaseItemDraft => ({ description: "", category: "", unit: "u", quantity: 1, unitCost: 0, taxRate: 10, productId: null, addStock: false })
const field = "h-9 w-full rounded-lg border bg-background px-2 text-sm"

/** Reduce fotos grandes antes de subirlas (más rápido y dentro del límite de 12 MB). */
async function prepareFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 1_500_000) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88))
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file
  } catch { return file }
}

interface Props { open: boolean; onClose: () => void; onSaved: (invoice: PurchaseInvoice) => void; startWithScan?: boolean }

export default function PurchaseInvoiceDialog({ open, onClose, onSaved, startWithScan = false }: Props) {
  const { suppliers, addSupplier } = useSuppliers()
  const { products } = useCart()
  const [supplierId, setSupplierId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [stamp, setStamp] = useState("")
  const [invoiceDate, setInvoiceDate] = useState(businessDateKey(new Date()))
  const [condition, setCondition] = useState<"cash" | "credit">("cash")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [paidFromCash, setPaidFromCash] = useState(false)
  const [items, setItems] = useState<PurchaseItemDraft[]>([emptyItem()])
  const [source, setSource] = useState<"manual" | "scan">("manual")
  const [scanning, setScanning] = useState(false)
  const [scanInfo, setScanInfo] = useState<{ warnings: string[]; read: ScannedInvoice["totals"]; preview: string | null; name: string } | null>(null)
  const [newSupplier, setNewSupplier] = useState<{ name: string; ruc: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setSupplierId(""); setInvoiceNumber(""); setStamp(""); setInvoiceDate(businessDateKey(new Date())); setCondition("cash"); setDueDate(""); setNotes("")
    setPaidFromCash(false); setItems([emptyItem()]); setSource("manual"); setScanInfo(null); setNewSupplier(null); setScanning(false)
    if (startWithScan) setTimeout(() => fileRef.current?.click(), 150)
  }, [open, startWithScan])
  useEffect(() => () => { if (scanInfo?.preview) URL.revokeObjectURL(scanInfo.preview) }, [scanInfo?.preview])

  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.isActive !== false).sort((a, b) => a.name.localeCompare(b.name, "es")), [suppliers])
  const productOptions = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name, "es")), [products])
  const totals = invoiceTotals(items.filter((item) => item.quantity > 0))
  const update = (index: number, change: Partial<PurchaseItemDraft>) => setItems((current) => current.map((item, i) => i === index ? { ...item, ...change } : item))

  const scan = async (picked: File | undefined) => {
    if (!picked) return
    if (!/^(image\/(png|jpeg|webp|gif)|application\/pdf)$/.test(picked.type)) { toast.error("Subí una foto (JPG, PNG, WEBP) o un PDF de la factura."); return }
    setScanning(true)
    try {
      const file = await prepareFile(picked)
      const form = new FormData()
      form.append("file", file)
      const response = await fetch("/api/purchase-invoices/scan", { method: "POST", body: form, credentials: "same-origin" })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || `Error ${response.status}`)
      const draft = result.draft as ScannedInvoice
      setSource("scan")
      if (draft.invoiceNumber) setInvoiceNumber(draft.invoiceNumber)
      if (draft.supplier.stamp) setStamp(draft.supplier.stamp)
      if (draft.invoiceDate) setInvoiceDate(draft.invoiceDate)
      setCondition(draft.condition)
      if (draft.items.length) setItems(draft.items)
      if (draft.supplier.matchId) { setSupplierId(String(draft.supplier.matchId)); setNewSupplier(null) }
      else if (draft.supplier.name || draft.supplier.ruc) { setSupplierId(""); setNewSupplier({ name: draft.supplier.name, ruc: draft.supplier.ruc }) }
      setScanInfo({ warnings: draft.warnings, read: draft.totals, preview: picked.type.startsWith("image/") ? URL.createObjectURL(picked) : null, name: picked.name })
      toast.success(`Factura leída: ${draft.items.length} ítem(s). Revisá y guardá.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo leer la factura.")
    } finally { setScanning(false); if (fileRef.current) fileRef.current.value = "" }
  }

  const createSupplier = async () => {
    if (!newSupplier?.name.trim()) { toast.error("Escribí el nombre del proveedor."); return }
    try {
      const created = await addSupplier({ name: newSupplier.name.trim(), ruc: newSupplier.ruc.trim(), contact: "", email: "", phone: "", address: "", notes: "",
        category: "", rating: 0, isActive: true, creditLimit: 0, paymentTerms: "", contacts: [] })
      setSupplierId(String(created.id)); setNewSupplier(null)
      toast.success(`Proveedor «${created.name}» creado`)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo crear el proveedor.") }
  }

  const save = async () => {
    if (!supplierId) { toast.error(newSupplier ? "Creá el proveedor leído o elegí uno de la lista." : "Elegí el proveedor."); return }
    const rows = items.filter((item) => item.description.trim() || item.unitCost > 0)
    if (!rows.length) { toast.error("Agregá al menos un ítem."); return }
    setSaving(true)
    try {
      const { invoice } = await apiRequest<{ invoice: PurchaseInvoice }>("/api/purchase-invoices", { method: "POST", body: JSON.stringify({
        supplierId: Number(supplierId), invoiceNumber, stamp, invoiceDate, condition, dueDate: condition === "credit" ? dueDate : null, notes, paidFromCash, source, items: rows }) })
      toast.success(`Compra registrada · ${gs(invoice.total)}`)
      window.dispatchEvent(new Event("purchases:changed"))
      window.dispatchEvent(new Event("products:changed"))
      onSaved(invoice)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo registrar la compra.") } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && !saving && !scanning) onClose() }}>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 pb-3 pt-5 pr-12 text-left">
          <DialogTitle>Registrar compra</DialogTitle>
          <DialogDescription>Escaneá la factura con IA o cargala a mano. Revisá los datos, elegí el proveedor y guardá.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Escanear */}
          <div onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); void scan(event.dataTransfer.files?.[0]) }}
            className={`flex flex-wrap items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition ${dragging ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30" : "border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 dark:border-violet-900 dark:from-violet-950/30 dark:to-indigo-950/30"}`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">{scanning ? <Loader2 className="h-6 w-6 animate-spin" /> : <ScanLine className="h-6 w-6" />}</div>
            <div className="min-w-48 flex-1">
              <p className="font-bold">{scanning ? "Leyendo la factura con Niro IA…" : "Escanear factura con IA"}</p>
              <p className="text-xs text-muted-foreground">{scanning ? "Puede tardar unos segundos." : "Subí o arrastrá una foto (JPG, PNG) o un PDF. Se completan proveedor, número, fecha, ítems e IVA."}</p>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="hidden" onChange={(event) => void scan(event.target.files?.[0])} />
            <Button type="button" onClick={() => fileRef.current?.click()} disabled={scanning} className="bg-violet-600 text-white hover:bg-violet-700"><Sparkles className="mr-2 h-4 w-4" /> {scanInfo ? "Escanear otra" : "Subir factura"}</Button>
          </div>
          {scanInfo && <div className="flex flex-wrap gap-3 rounded-xl border bg-muted/40 p-3 text-xs">
            {scanInfo.preview ? <a href={scanInfo.preview} target="_blank" rel="noreferrer"><img src={scanInfo.preview} alt="Factura escaneada" className="h-24 w-20 rounded-md border object-cover" /></a>
              : <span className="flex h-24 w-20 items-center justify-center rounded-md border bg-background"><FileUp className="h-6 w-6 text-muted-foreground" /></span>}
            <div className="min-w-48 flex-1 space-y-1">
              <p className="font-semibold">Leído de «{scanInfo.name}»</p>
              {scanInfo.read.total > 0 && <p>Total en la factura: <b>{gs(scanInfo.read.total)}</b>{scanInfo.read.tax10 > 0 && ` · IVA 10 %: ${gs(scanInfo.read.tax10)}`}{scanInfo.read.tax5 > 0 && ` · IVA 5 %: ${gs(scanInfo.read.tax5)}`}</p>}
              {scanInfo.warnings.map((warning) => <p key={warning} className="flex items-start gap-1 text-amber-700 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{warning}</p>)}
              {!scanInfo.warnings.length && <p className="text-emerald-700 dark:text-emerald-300">Los ítems coinciden con el total. Revisá y guardá.</p>}
            </div>
          </div>}

          {/* Cabecera */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-xs font-medium text-muted-foreground lg:col-span-2">Proveedor *
              <select value={supplierId} onChange={(event) => { setSupplierId(event.target.value); if (event.target.value) setNewSupplier(null) }} className={`mt-1 ${field} h-10`}>
                <option value="">Elegí el proveedor…</option>
                {activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}{supplier.ruc ? ` · RUC ${supplier.ruc}` : ""}</option>)}
              </select>
              {!newSupplier && <button type="button" onClick={() => setNewSupplier({ name: "", ruc: "" })} className="mt-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300">+ Nuevo proveedor</button>}
            </label>
            <label className="text-xs font-medium text-muted-foreground">N.º de factura<Input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="001-001-0001234" className="mt-1" /></label>
            <label className="text-xs font-medium text-muted-foreground">Timbrado<Input value={stamp} onChange={(event) => setStamp(event.target.value)} placeholder="12345678" className="mt-1" /></label>
            <label className="text-xs font-medium text-muted-foreground">Fecha *<Input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} className="mt-1" /></label>
            <label className="text-xs font-medium text-muted-foreground">Condición<select value={condition} onChange={(event) => setCondition(event.target.value as "cash" | "credit")} className={`mt-1 ${field} h-10`}>
              <option value="cash">Contado</option><option value="credit">Crédito</option></select></label>
          </div>
          {newSupplier && <div className="flex flex-wrap items-end gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
            <Building2 className="mb-2 h-5 w-5 text-indigo-600" />
            <label className="min-w-48 flex-1 text-xs font-medium text-muted-foreground">Nombre o razón social<Input value={newSupplier.name} onChange={(event) => setNewSupplier({ ...newSupplier, name: event.target.value })} className="mt-1 bg-background" /></label>
            <label className="w-40 text-xs font-medium text-muted-foreground">RUC<Input value={newSupplier.ruc} onChange={(event) => setNewSupplier({ ...newSupplier, ruc: event.target.value })} className="mt-1 bg-background" /></label>
            <Button type="button" onClick={() => void createSupplier()}>Crear proveedor</Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => setNewSupplier(null)} aria-label="Cancelar"><X className="h-4 w-4" /></Button>
            {source === "scan" && <p className="w-full text-xs text-indigo-800 dark:text-indigo-200">Este proveedor no está en tu lista: revisá el nombre y el RUC leídos y crealo.</p>}
          </div>}
          {condition === "credit" && <label className="block max-w-48 text-xs font-medium text-muted-foreground">Vencimiento<Input type="date" value={dueDate} min={invoiceDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1" /></label>}

          {/* Ítems */}
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-2 py-2">Descripción</th><th className="px-2 py-2 w-36">Categoría</th><th className="px-2 py-2 w-24">Cantidad</th><th className="px-2 py-2 w-24">Unidad</th>
                  <th className="px-2 py-2 w-32">Precio unit.</th><th className="px-2 py-2 w-24">IVA</th><th className="px-2 py-2 w-44">Producto del menú (stock)</th><th className="px-2 py-2 w-28 text-right">Total</th><th className="w-10" /></tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, index) => <tr key={index} className="align-top">
                  <td className="px-2 py-1.5"><Input value={item.description} onChange={(event) => update(index, { description: event.target.value })} placeholder="Harina 000 x 50 kg" className="h-9" /></td>
                  <td className="px-2 py-1.5"><Input list="purchase-categories" value={item.category} onChange={(event) => update(index, { category: event.target.value })} placeholder="Insumos" className="h-9" /></td>
                  <td className="px-2 py-1.5"><Input type="number" min="0" step="0.001" value={item.quantity || ""} onChange={(event) => update(index, { quantity: Number(event.target.value) })} className="h-9 text-right" /></td>
                  <td className="px-2 py-1.5"><select value={item.unit} onChange={(event) => update(index, { unit: event.target.value })} className={field}>
                    {[...new Set([item.unit, ...PURCHASE_UNITS])].map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></td>
                  <td className="px-2 py-1.5"><Input type="number" min="0" step="1" value={item.unitCost || ""} onChange={(event) => update(index, { unitCost: Number(event.target.value) })} className="h-9 text-right" /></td>
                  <td className="px-2 py-1.5"><select value={item.taxRate} onChange={(event) => update(index, { taxRate: Number(event.target.value) as TaxRate })} className={field}>
                    <option value={10}>10 %</option><option value={5}>5 %</option><option value={0}>Exenta</option></select></td>
                  <td className="px-2 py-1.5">
                    <select value={item.productId ?? ""} onChange={(event) => update(index, { productId: event.target.value ? Number(event.target.value) : null, addStock: Boolean(event.target.value) })} className={field}>
                      <option value="">— Insumo (sin stock) —</option>
                      {productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
                    {item.productId && <label className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><input type="checkbox" checked={item.addStock} onChange={(event) => update(index, { addStock: event.target.checked })} className="accent-indigo-600" /> Sumar {Math.round(item.quantity)} al stock</label>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums">{gs(item.quantity * item.unitCost)}</td>
                  <td className="px-1 py-1.5"><Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setItems((current) => current.length > 1 ? current.filter((_, i) => i !== index) : [emptyItem()])} aria-label="Quitar ítem"><Trash2 className="h-4 w-4" /></Button></td>
                </tr>)}
              </tbody>
            </table>
            <datalist id="purchase-categories">{PURCHASE_CATEGORIES.map((category) => <option key={category} value={category} />)}</datalist>
            <div className="border-t p-2"><Button type="button" variant="outline" size="sm" onClick={() => setItems((current) => [...current, emptyItem()])}><Plus className="mr-1 h-4 w-4" /> Agregar ítem</Button></div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-xs font-medium text-muted-foreground">Notas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border bg-background p-2 text-sm" placeholder="Opcional" /></label>
              {condition === "cash" && <label className="flex items-start gap-2 rounded-xl border p-3 text-sm"><input type="checkbox" checked={paidFromCash} onChange={(event) => setPaidFromCash(event.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
                <span><b>Pagado con la caja abierta</b><span className="block text-xs text-muted-foreground">Registra un egreso en efectivo por el total en la caja de hoy.</span></span></label>}
            </div>
            <dl className="space-y-1 rounded-xl bg-muted/50 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Exentas</dt><dd className="tabular-nums">{gs(totals.exempt)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Gravadas 5 % (IVA {gs(totals.tax5)})</dt><dd className="tabular-nums">{gs(totals.taxed5)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Gravadas 10 % (IVA {gs(totals.tax10)})</dt><dd className="tabular-nums">{gs(totals.taxed10)}</dd></div>
              <div className="flex justify-between border-t pt-2 text-lg font-black"><dt>Total</dt><dd className="tabular-nums">{gs(totals.total)}</dd></div>
              {scanInfo && scanInfo.read.total > 0 && Math.abs(scanInfo.read.total - totals.total) > 5 && <p className="text-xs text-amber-700 dark:text-amber-300">La factura dice {gs(scanInfo.read.total)}.</p>}
            </dl>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t bg-muted/30 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={saving || scanning} className="min-w-40 bg-indigo-600 text-white hover:bg-indigo-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Guardar compra · {gs(totals.total)}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
