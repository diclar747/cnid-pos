"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Building2, CirclePause, CirclePlay, Edit3, Megaphone, Plus, Search, ShieldCheck, Trash2, Users, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ProtectedRoute from "@/app/components/protected-route"
import { HeaderActions } from "@/app/components/header-actions"
import { useAuth } from "@/app/context/auth-context"
import { apiRequest } from "@/lib/api-client"
import toast from "react-hot-toast"

type Restaurant = { id: number; name: string; slug: string; status: "active" | "suspended" | "deleted"; legal_name: string; tax_id: string; email: string; phone: string; address: string; notes: string; user_count: number; admin_name: string | null; admin_email: string | null; last_login: string | null }
type Announcement = { id: number; title: string; message: string; restaurant_id: number | null; restaurant_name: string | null; created_at: string }
const blank = { name: "", slug: "", legalName: "", taxId: "", email: "", phone: "", address: "", notes: "", adminName: "", adminEmail: "", adminUsername: "", adminPassword: "" }
type FormState = typeof blank

export default function SuperadminPage() {
  const { user } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Restaurant | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(blank)
  const [saving, setSaving] = useState(false)
  const [campaignTitle, setCampaignTitle] = useState("")
  const [campaignMessage, setCampaignMessage] = useState("")
  const [campaignTarget, setCampaignTarget] = useState("all")

  const load = useCallback(async () => {
    try {
      const [r, a] = await Promise.all([
        apiRequest<{ restaurants: Restaurant[] }>("/api/restaurants"),
        apiRequest<{ announcements: Announcement[] }>("/api/announcements"),
      ])
      setRestaurants(r.restaurants); setAnnouncements(a.announcements)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cargar la administración.") }
  }, [])
  useEffect(() => { if (user?.role === "superadmin") void load() }, [user?.role, load])
  const visible = useMemo(() => restaurants.filter((r) => [r.name, r.slug, r.admin_name, r.admin_email].some((value) => value?.toLowerCase().includes(query.toLowerCase()))), [restaurants, query])
  const active = restaurants.filter((r) => r.status === "active").length
  const suspended = restaurants.filter((r) => r.status === "suspended").length
  const totalUsers = restaurants.reduce((sum, r) => sum + Number(r.user_count), 0)
  const setField = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const openCreate = () => { setEditing(null); setForm(blank); setShowForm(true) }
  const openEdit = (item: Restaurant) => {
    setEditing(item)
    setForm({ ...blank, name: item.name, slug: item.slug, legalName: item.legal_name,
      taxId: item.tax_id, email: item.email, phone: item.phone, address: item.address, notes: item.notes })
    setShowForm(true)
  }
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true)
    try {
      await apiRequest(editing ? `/api/restaurants/${editing.id}` : "/api/restaurants", {
        method: editing ? "PATCH" : "POST", body: JSON.stringify(form),
      })
      toast.success(editing ? "Restaurante actualizado." : "Restaurante y administrador creados.")
      setShowForm(false); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar.") }
    finally { setSaving(false) }
  }
  const changeStatus = async (item: Restaurant, status: Restaurant["status"]) => {
    if (status === "deleted" && !window.confirm(`¿Eliminar ${item.name}? Se bloquearán sus cuentas y se conservarán los datos para recuperación.`)) return
    try {
      if (status === "deleted") await apiRequest(`/api/restaurants/${item.id}`, { method: "DELETE", headers: { "x-confirm-restaurant": String(item.id) } })
      else await apiRequest(`/api/restaurants/${item.id}`, { method: "PATCH", body: JSON.stringify({ status }) })
      toast.success(status === "active" ? "Restaurante habilitado." : status === "suspended" ? "Restaurante suspendido." : "Restaurante eliminado de la operación.")
      await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cambiar el estado.") }
  }
  const publish = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await apiRequest("/api/announcements", { method: "POST", body: JSON.stringify({ title: campaignTitle, message: campaignMessage, restaurantId: campaignTarget === "all" ? null : Number(campaignTarget) }) })
      setCampaignTitle(""); setCampaignMessage(""); setCampaignTarget("all")
      toast.success("Aviso publicado."); await load()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo publicar.") }
  }
  const removeAnnouncement = async (id: number) => {
    try { await apiRequest(`/api/announcements/${id}`, { method: "DELETE" }); await load(); toast.success("Aviso retirado.") }
    catch { toast.error("No se pudo retirar el aviso.") }
  }

  return <ProtectedRoute requiredPermissions={["manage_restaurants"]}><main className="min-h-screen bg-[#f4f6fc] p-4 dark:bg-slate-950 sm:p-7">
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white"><ShieldCheck className="h-6 w-6" /></span><div><h1 className="text-xl font-bold">CNID · Superadministración</h1><p className="text-sm text-muted-foreground">Restaurantes, accesos y comunicaciones</p></div></div><HeaderActions /></div>
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-800 via-violet-700 to-blue-600 p-7 text-white shadow-xl sm:p-9"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Panel central</p><h2 className="mt-2 text-3xl font-bold sm:text-4xl">Gestioná todos tus restaurantes</h2><p className="mt-2 max-w-2xl text-sm text-indigo-100">Cada restaurante nuevo tiene sus propios productos, ventas, órdenes, tarjetas y configuración. Los usuarios acceden con su cuenta asignada.</p><Button onClick={openCreate} className="mt-6 gap-2 bg-white text-indigo-800 hover:bg-indigo-50"><Plus className="h-4 w-4" />Crear restaurante</Button></div>
      <div className="grid gap-4 sm:grid-cols-3"><Metric icon={Building2} label="Restaurantes activos" value={active} color="from-emerald-500 to-teal-600" /><Metric icon={CirclePause} label="Suspendidos" value={suspended} color="from-amber-500 to-orange-600" /><Metric icon={Users} label="Usuarios registrados" value={totalUsers} color="from-indigo-500 to-violet-600" /></div>
      <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Restaurantes</h2><p className="text-sm text-muted-foreground">Crear, editar, suspender, reactivar o eliminar de la operación.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar restaurante..." className="pl-9" /></div></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <Card key={item.id} className="overflow-hidden rounded-2xl border-slate-200 shadow-sm"><div className={`h-1.5 ${item.status === "active" ? "bg-emerald-500" : item.status === "suspended" ? "bg-amber-500" : "bg-slate-400"}`} /><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><UtensilsCrossed className="h-5 w-5" /></div><Badge variant={item.status === "active" ? "default" : "secondary"} className={item.status === "active" ? "bg-emerald-600" : ""}>{item.status === "active" ? "Activo" : item.status === "suspended" ? "Suspendido" : "Eliminado"}</Badge></div><div><h3 className="text-lg font-bold">{item.name}</h3><p className="text-xs text-muted-foreground">/{item.slug} · #{item.id}</p></div><div className="space-y-1 text-sm"><p><span className="text-muted-foreground">Administrador:</span> {item.admin_name ?? "Sin asignar"}</p><p className="truncate text-muted-foreground">{(item.admin_email || item.email || "Sin email")}</p><p className="text-muted-foreground">{item.user_count} usuario{item.user_count === 1 ? "" : "s"}</p></div><div className="flex flex-wrap gap-2 border-t pt-4"><Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(item)}><Edit3 className="h-3.5 w-3.5" />Editar</Button>{item.status === "active" ? <Button size="sm" variant="outline" className="gap-1 text-amber-700" onClick={() => changeStatus(item, "suspended")}><CirclePause className="h-3.5 w-3.5" />Suspender</Button> : <Button size="sm" variant="outline" className="gap-1 text-emerald-700" onClick={() => changeStatus(item, "active")}><CirclePlay className="h-3.5 w-3.5" />Reactivar</Button>}{item.status !== "deleted" && item.id !== 1 && <Button size="sm" variant="ghost" className="gap-1 text-rose-600" onClick={() => changeStatus(item, "deleted")}><Trash2 className="h-3.5 w-3.5" />Eliminar</Button>}</div></CardContent></Card>)}</div>
      </section>
      <section id="campaigns" className="grid gap-5 lg:grid-cols-[1fr_1.2fr]"><Card className="rounded-2xl"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><Megaphone className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-bold">Nueva campaña o aviso</h2></div><form onSubmit={publish} className="space-y-3"><div><Label htmlFor="campaign-title">Título</Label><Input id="campaign-title" value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} required /></div><div><Label htmlFor="campaign-target">Destinatarios</Label><Select value={campaignTarget} onValueChange={setCampaignTarget}><SelectTrigger id="campaign-target"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los restaurantes</SelectItem>{restaurants.filter((r) => r.status === "active").map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="campaign-message">Mensaje</Label><Textarea id="campaign-message" value={campaignMessage} onChange={(e) => setCampaignMessage(e.target.value)} required rows={4} /></div><Button type="submit" className="gap-2"><Megaphone className="h-4 w-4" />Publicar aviso</Button></form></CardContent></Card><Card className="rounded-2xl"><CardContent className="p-5"><h2 className="mb-4 text-lg font-bold">Avisos activos</h2><div className="max-h-96 space-y-3 overflow-y-auto">{announcements.length ? announcements.map((item) => <div key={item.id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.restaurant_name ?? "Todos los restaurantes"}</p></div><Button size="icon" variant="ghost" aria-label={`Retirar aviso ${item.title}`} onClick={() => removeAnnouncement(item.id)}><Trash2 className="h-4 w-4" /></Button></div><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p></div>) : <p className="text-sm text-muted-foreground">No hay avisos activos.</p>}</div></CardContent></Card></section>
      <Dialog open={showForm} onOpenChange={setShowForm}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{editing ? `Editar ${editing.name}` : "Crear restaurante"}</DialogTitle><DialogDescription>{editing ? "Actualizá los datos del restaurante." : "Se creará un espacio de datos independiente y una cuenta administradora."}</DialogDescription></DialogHeader><form onSubmit={save} className="grid gap-4 sm:grid-cols-2"><Field label="Nombre del restaurante *" value={form.name} onChange={(v) => { setField("name", v); if (!editing && !form.slug) setField("slug", v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) }} required /><Field label="Código URL *" value={form.slug} onChange={(v) => setField("slug", v)} required /><Field label="Razón social" value={form.legalName} onChange={(v) => setField("legalName", v)} /><Field label="RUC / identificación fiscal" value={form.taxId} onChange={(v) => setField("taxId", v)} /><Field label="Email del negocio" value={form.email} onChange={(v) => setField("email", v)} type="email" /><Field label="Teléfono" value={form.phone} onChange={(v) => setField("phone", v)} /><div className="sm:col-span-2"><Field label="Dirección" value={form.address} onChange={(v) => setField("address", v)} /></div><div className="sm:col-span-2"><Label>Notas internas</Label><Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></div>{!editing && <><div className="border-t pt-3 sm:col-span-2"><h3 className="font-semibold">Administrador inicial</h3><p className="text-xs text-muted-foreground">Esta cuenta podrá configurar el restaurante y crear su equipo.</p></div><Field label="Nombre *" value={form.adminName} onChange={(v) => setField("adminName", v)} required /><Field label="Email de acceso *" value={form.adminEmail} onChange={(v) => setField("adminEmail", v)} type="email" required /><Field label="Usuario *" value={form.adminUsername} onChange={(v) => setField("adminUsername", v)} required /><Field label="Contraseña inicial *" value={form.adminPassword} onChange={(v) => setField("adminPassword", v)} type="password" required /></>}<div className="flex justify-end gap-2 border-t pt-4 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button disabled={saving} type="submit">{saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear restaurante"}</Button></div></form></DialogContent></Dialog>
    </div>
  </main></ProtectedRoute>
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return <div><Label htmlFor={id}>{label}</Label><Input id={id} className="mt-1" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></div>
}

function Metric({ icon: Icon, label, value, color }: { icon: typeof Building2; label: string; value: number; color: string }) {
  return <div className={`rounded-2xl bg-gradient-to-r ${color} p-5 text-white shadow-sm`}><Icon className="mb-3 h-5 w-5 opacity-90" /><p className="text-sm opacity-90">{label}</p><p className="text-3xl font-bold">{value}</p></div>
}
