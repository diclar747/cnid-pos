"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ClipboardList, PackageCheck, Plus, Truck, XCircle } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiRequest } from "@/lib/api-client"
import { useCart } from "../../context/cart-context"
import { useSuppliers } from "../../context/suppliers-context"
import { useAuth } from "../../context/auth-context"

interface PurchaseOrder {
  id: number
  productId: number
  supplierId: number
  productName: string
  supplierName: string
  quantity: number
  unitCost: number
  status: "pending" | "received" | "cancelled"
  notes: string
  createdAt: string
  receivedAt: string | null
}

const money = (value: number) => new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(value)

export default function PurchaseOrdersPage() {
  const { hasPermission } = useAuth()
  const { products } = useCart()
  const { suppliers } = useSuppliers()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ productId: "", supplierId: "", quantity: "", unitCost: "", notes: "" })

  const refresh = async () => {
    const result = await apiRequest<{ items: PurchaseOrder[] }>("/api/purchase-orders")
    setOrders(result.items)
  }
  useEffect(() => { if (hasPermission("manage_purchases")) refresh().catch(() => toast.error("No se pudieron cargar las órdenes.")) }, [hasPermission])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await apiRequest("/api/purchase-orders", { method: "POST", body: JSON.stringify({
        productId: Number(form.productId), supplierId: Number(form.supplierId),
        quantity: Number(form.quantity), unitCost: Number(form.unitCost), notes: form.notes,
      }) })
      await refresh()
      setOpen(false)
      setForm({ productId: "", supplierId: "", quantity: "", unitCost: "", notes: "" })
      toast.success("Orden creada. El stock cambiará cuando recibas la mercadería.")
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo crear la orden.") }
    finally { setBusy(false) }
  }

  const changeStatus = async (id: number, status: "received" | "cancelled") => {
    setBusy(true)
    try {
      await apiRequest(`/api/purchase-orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) })
      await refresh()
      if (status === "received") {
        window.dispatchEvent(new Event("products:changed"))
        window.dispatchEvent(new Event("purchases:changed"))
      }
      toast.success(status === "received" ? "Mercadería recibida y stock actualizado." : "Orden cancelada.")
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo actualizar la orden.") }
    finally { setBusy(false) }
  }

  if (!hasPermission("manage_purchases")) return <div className="p-6">No tenés permiso para ver las órdenes de compra.</div>
  const pending = orders.filter((order) => order.status === "pending")
  const received = orders.filter((order) => order.status === "received")
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><ClipboardList className="h-4 w-4" /> Abastecimiento</div><h1 className="text-3xl font-bold tracking-tight">Órdenes de compra</h1><p className="mt-1 text-muted-foreground">Pedí a un proveedor y recibí la mercadería para sumar stock.</p></div>
        <Button onClick={() => setOpen(true)} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> Nueva orden</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Pendientes</p><p className="text-3xl font-semibold">{pending.length}</p></div><Truck className="h-7 w-7 text-amber-500" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Recibidas</p><p className="text-3xl font-semibold">{received.length}</p></div><PackageCheck className="h-7 w-7 text-emerald-500" /></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Valor pendiente</p><p className="text-2xl font-semibold">{money(pending.reduce((sum, order) => sum + order.quantity * order.unitCost, 0))}</p></CardContent></Card>
      </div>
      <Card className="overflow-hidden"><CardHeader><CardTitle className="text-lg">Historial de pedidos</CardTitle></CardHeader><CardContent className="space-y-3">
        {orders.length === 0 && <p className="py-8 text-center text-muted-foreground">Todavía no hay órdenes de compra.</p>}
        {orders.map((order) => <div key={order.id} className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><div className="flex items-center gap-2"><span className="font-semibold">#{order.id} · {order.productName}</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${order.status === "received" ? "bg-emerald-100 text-emerald-800" : order.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{order.status === "received" ? "Recibida" : order.status === "pending" ? "Pendiente" : "Cancelada"}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{order.supplierName} · {order.quantity} unidades × {money(order.unitCost)} · {new Date(order.createdAt).toLocaleDateString("es-PY")}</p>
            {order.notes && <p className="mt-1 text-sm text-muted-foreground">{order.notes}</p>}
          </div><div className="flex shrink-0 items-center gap-2"><strong className="mr-2">{money(order.quantity * order.unitCost)}</strong>{order.status === "pending" && <><Button size="sm" disabled={busy} onClick={() => changeStatus(order.id, "received")}><PackageCheck className="mr-1 h-4 w-4" /> Recibir</Button><Button size="icon" variant="outline" disabled={busy} onClick={() => changeStatus(order.id, "cancelled")} title="Cancelar orden" aria-label="Cancelar orden"><XCircle className="h-4 w-4" /></Button></>}</div>
        </div>)}
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Nueva orden de compra</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {suppliers.filter((supplier) => supplier.isActive).length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Primero registrá un proveedor activo en <Link href="/admin/suppliers" className="font-semibold underline">Proveedores</Link>.</p>}
          <div><Label>Producto</Label><Select value={form.productId} onValueChange={(value) => { const product = products.find((item) => item.id === Number(value)); setForm((current) => ({ ...current, productId: value, supplierId: product?.supplierId ? String(product.supplierId) : current.supplierId })) }}><SelectTrigger><SelectValue placeholder="Seleccioná un producto" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={String(product.id)}>{product.name} · stock {product.stock}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Proveedor</Label><Select value={form.supplierId} onValueChange={(value) => setForm((current) => ({ ...current, supplierId: value }))}><SelectTrigger><SelectValue placeholder="Seleccioná un proveedor" /></SelectTrigger><SelectContent>{suppliers.filter((supplier) => supplier.isActive).map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name} · {supplier.ruc}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="order-quantity">Cantidad</Label><Input id="order-quantity" type="number" min="1" required value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></div><div><Label htmlFor="order-cost">Costo unitario (₲)</Label><Input id="order-cost" type="number" min="0" required value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} /></div></div>
          <div><Label htmlFor="order-notes">Notas</Label><Textarea id="order-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
          <div className="flex items-center justify-between border-t pt-4"><span className="font-semibold">Total: {money(Number(form.quantity || 0) * Number(form.unitCost || 0))}</span><Button type="submit" disabled={busy || !form.productId || !form.supplierId}>Crear orden</Button></div>
        </form>
      </DialogContent></Dialog>
    </div>
  )
}
