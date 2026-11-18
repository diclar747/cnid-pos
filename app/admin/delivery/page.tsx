"use client"

import { useCallback, useEffect, useState } from "react"
import { Bike, MapPinned, Pencil, Plus, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiRequest } from "@/lib/api-client"
import type { Courier, DeliveryZone } from "@/lib/service-order-types"

const money = (value: number) => `Gs ${Math.round(value).toLocaleString("es-PY")}`
const emptyZone = { name: "", areas: "", fee: "", freeOver: "", etaMinutes: "", isActive: true, sortOrder: "0" }
const emptyCourier = { name: "", phone: "", vehicle: "", isActive: true }
const digits = (value: string) => value.replace(/\D/g, "")

export default function DeliveryPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [zoneForm, setZoneForm] = useState<{ id: number | null; form: typeof emptyZone } | null>(null)
  const [courierForm, setCourierForm] = useState<{ id: number | null; form: typeof emptyCourier } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [z, c] = await Promise.all([
        apiRequest<{ items: DeliveryZone[] }>("/api/delivery/zones"),
        apiRequest<{ items: Courier[] }>("/api/delivery/couriers"),
      ])
      setZones(z.items)
      setCouriers(c.items)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cargar delivery") }
  }, [])
  useEffect(() => { void load() }, [load])

  const saveZone = async () => {
    if (!zoneForm) return
    setSaving(true)
    try {
      const f = zoneForm.form
      const body = { name: f.name, areas: f.areas, fee: Number(digits(f.fee) || 0), freeOver: f.freeOver ? Number(digits(f.freeOver)) : null,
        etaMinutes: f.etaMinutes ? Number(digits(f.etaMinutes)) : null, isActive: f.isActive, sortOrder: Number(f.sortOrder) || 0 }
      await apiRequest(zoneForm.id ? `/api/delivery/zones/${zoneForm.id}` : "/api/delivery/zones", { method: zoneForm.id ? "PUT" : "POST", body: JSON.stringify(body) })
      toast.success("Zona guardada")
      setZoneForm(null)
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar") }
    finally { setSaving(false) }
  }

  const saveCourier = async () => {
    if (!courierForm) return
    setSaving(true)
    try {
      await apiRequest(courierForm.id ? `/api/delivery/couriers/${courierForm.id}` : "/api/delivery/couriers", { method: courierForm.id ? "PUT" : "POST", body: JSON.stringify(courierForm.form) })
      toast.success("Repartidor guardado")
      setCourierForm(null)
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar") }
    finally { setSaving(false) }
  }

  const remove = async (kind: "zones" | "couriers", id: number, name: string) => {
    if (!window.confirm(`¿Eliminar «${name}»? Las órdenes que lo usaron conservan el nombre.`)) return
    try {
      await apiRequest(`/api/delivery/${kind}/${id}`, { method: "DELETE" })
      toast.success("Eliminado")
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo eliminar") }
  }

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delivery</h1>
        <p className="text-muted-foreground">Zonas con su tarifa y los repartidores del restaurante. El costo de envío se suma solo al pedido según la zona.</p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><MapPinned className="h-5 w-5 text-indigo-600" /> Zonas ({zones.length})</h2>
          <Button onClick={() => setZoneForm({ id: null, form: { ...emptyZone } })}><Plus className="mr-2 h-4 w-4" /> Nueva zona</Button>
        </div>
        {zones.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">Sin zonas. Creá una para calcular el envío de los pedidos delivery.</div> :
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {zones.map((zone) => (
              <article key={zone.id} className={`rounded-2xl border bg-white p-5 dark:bg-slate-900 ${zone.isActive ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div><h3 className="font-bold">{zone.name}</h3>{zone.areas && <p className="mt-1 text-sm text-muted-foreground">{zone.areas}</p>}</div>
                  {!zone.isActive && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-700">Inactiva</span>}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Envío</dt><dd className="font-semibold">{zone.fee ? money(zone.fee) : "Gratis"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Gratis desde</dt><dd className="font-semibold">{zone.freeOver != null ? money(zone.freeOver) : "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Demora</dt><dd className="font-semibold">{zone.etaMinutes ? `${zone.etaMinutes} min` : "—"}</dd></div>
                </dl>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setZoneForm({ id: zone.id, form: { name: zone.name, areas: zone.areas, fee: String(zone.fee), freeOver: zone.freeOver == null ? "" : String(zone.freeOver), etaMinutes: zone.etaMinutes == null ? "" : String(zone.etaMinutes), isActive: zone.isActive, sortOrder: String(zone.sortOrder) } })}><Pencil className="mr-1 h-3 w-3" /> Editar</Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => void remove("zones", zone.id, zone.name)}><Trash2 className="mr-1 h-3 w-3" /> Eliminar</Button>
                </div>
              </article>
            ))}
          </div>}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Bike className="h-5 w-5 text-indigo-600" /> Repartidores ({couriers.length})</h2>
          <Button onClick={() => setCourierForm({ id: null, form: { ...emptyCourier } })}><Plus className="mr-2 h-4 w-4" /> Nuevo repartidor</Button>
        </div>
        {couriers.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">Sin repartidores. Se asignan a cada pedido desde Órdenes → Datos.</div> :
          <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-slate-900">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-950"><tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Teléfono</th><th className="px-4 py-3">Vehículo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3" /></tr></thead>
              <tbody>{couriers.map((courier) => (
                <tr key={courier.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{courier.name}</td><td className="px-4 py-3">{courier.phone || "—"}</td><td className="px-4 py-3">{courier.vehicle || "—"}</td>
                  <td className="px-4 py-3">{courier.isActive ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Activo</span> : <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">Inactivo</span>}</td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => setCourierForm({ id: courier.id, form: { name: courier.name, phone: courier.phone, vehicle: courier.vehicle, isActive: courier.isActive } })}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="sm" className="text-red-600" onClick={() => void remove("couriers", courier.id, courier.name)}><Trash2 className="h-3 w-3" /></Button></td>
                </tr>))}</tbody>
            </table>
          </div>}
      </section>

      <Dialog open={Boolean(zoneForm)} onOpenChange={(value) => { if (!value) setZoneForm(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{zoneForm?.id ? "Editar zona" : "Nueva zona"}</DialogTitle><DialogDescription>El envío se calcula con estos valores al cargar un pedido delivery.</DialogDescription></DialogHeader>
          {zoneForm && <div className="space-y-3">
            <label className="block text-sm font-medium">Nombre<Input value={zoneForm.form.name} onChange={(e) => setZoneForm({ ...zoneForm, form: { ...zoneForm.form, name: e.target.value } })} placeholder="Centro" className="mt-1" /></label>
            <label className="block text-sm font-medium">Barrios o ciudades<Input value={zoneForm.form.areas} onChange={(e) => setZoneForm({ ...zoneForm, form: { ...zoneForm.form, areas: e.target.value } })} placeholder="Centro, Barrio Obrero, San Miguel" className="mt-1" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Costo de envío (Gs)<Input inputMode="numeric" value={zoneForm.form.fee} onChange={(e) => setZoneForm({ ...zoneForm, form: { ...zoneForm.form, fee: digits(e.target.value) } })} className="mt-1" /></label>
              <label className="block text-sm font-medium">Gratis desde (Gs)<Input inputMode="numeric" value={zoneForm.form.freeOver} onChange={(e) => setZoneForm({ ...zoneForm, form: { ...zoneForm.form, freeOver: digits(e.target.value) } })} placeholder="Opcional" className="mt-1" /></label>
              <label className="block text-sm font-medium">Demora (min)<Input inputMode="numeric" value={zoneForm.form.etaMinutes} onChange={(e) => setZoneForm({ ...zoneForm, form: { ...zoneForm.form, etaMinutes: digits(e.target.value) } })} placeholder="Opcional" className="mt-1" /></label>
              <label className="block text-sm font-medium">Orden<Input inputMode="numeric" value={zoneForm.form.sortOrder} onChange={(e) => setZoneForm({ ...zoneForm, form: { ...zoneForm.form, sortOrder: digits(e.target.value) } })} className="mt-1" /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={zoneForm.form.isActive} onChange={(e) => setZoneForm({ ...zoneForm, form: { ...zoneForm.form, isActive: e.target.checked } })} /> Zona activa</label>
            <Button className="w-full" onClick={() => void saveZone()} disabled={saving}>{saving ? "Guardando…" : "Guardar zona"}</Button>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(courierForm)} onOpenChange={(value) => { if (!value) setCourierForm(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{courierForm?.id ? "Editar repartidor" : "Nuevo repartidor"}</DialogTitle><DialogDescription>Se asigna a cada pedido delivery y aparece en la comanda y el ticket.</DialogDescription></DialogHeader>
          {courierForm && <div className="space-y-3">
            {(["name", "phone", "vehicle"] as const).map((key) => <label key={key} className="block text-sm font-medium">{{ name: "Nombre", phone: "Teléfono", vehicle: "Vehículo" }[key]}<Input value={courierForm.form[key]} onChange={(e) => setCourierForm({ ...courierForm, form: { ...courierForm.form, [key]: e.target.value } })} className="mt-1" /></label>)}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={courierForm.form.isActive} onChange={(e) => setCourierForm({ ...courierForm, form: { ...courierForm.form, isActive: e.target.checked } })} /> Activo</label>
            <Button className="w-full" onClick={() => void saveCourier()} disabled={saving}>{saving ? "Guardando…" : "Guardar repartidor"}</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
