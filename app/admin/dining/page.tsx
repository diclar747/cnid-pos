"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import QRCode from "qrcode"
import { Armchair, ArrowLeft, Camera, CirclePlus, Pencil, Printer, QrCode, RefreshCw, ShoppingCart, UsersRound } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiRequest } from "@/lib/api-client"
import type { DiningRoom, DiningTable } from "@/lib/dining-types"
import { useAuth } from "@/app/context/auth-context"
import { useCompany } from "@/app/context/company-context"
import { TableQrDialog } from "./table-qr-dialog"

const emptyRoom = { name: "", description: "", imageData: "", isActive: true }
const emptyTable = { roomId: 0, label: "", seats: 4, shape: "round" as DiningTable["shape"], isActive: true }
type RoomDraft = typeof emptyRoom & { id?: number }
type TableDraft = typeof emptyTable & { id?: number }

function SeatingDiagram({ seats, shape }: { seats: number; shape: DiningTable["shape"] }) {
  const shown = Math.min(seats, 10)
  return <div className="relative mx-auto my-4 h-24 w-40 rounded-2xl bg-white/75 dark:bg-slate-900/70" aria-label={`Mesa ${shape === "round" ? "redonda" : shape === "square" ? "cuadrada" : "rectangular"} con ${seats} sillas`} role="img">
    <div className={`absolute left-1/2 top-1/2 flex h-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-sky-300 bg-gradient-to-br from-sky-100 to-indigo-200 text-[11px] font-black text-indigo-700 shadow-inner ${shape === "round" ? "w-16 rounded-full" : shape === "square" ? "w-11 rounded-xl" : "w-20 rounded-xl"}`}>{seats}</div>
    {Array.from({ length: shown }, (_, index) => { const angle = (index / shown) * Math.PI * 2 - Math.PI / 2
      return <span key={index} className="absolute h-3 w-3 rounded-[4px] border border-indigo-300 bg-indigo-500 shadow-sm" style={{ left: `calc(50% + ${Math.cos(angle) * 62}px - 6px)`, top: `calc(50% + ${Math.sin(angle) * 35}px - 6px)` }} /> })}
    {seats > shown && <span className="absolute bottom-1 right-1 rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700">+{seats - shown}</span>}
  </div>
}

function TableQr({ table, baseUrl, restaurant }: { table: DiningTable; baseUrl: string; restaurant: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (canvas.current && baseUrl) void QRCode.toCanvas(canvas.current, `${baseUrl.replace(/\/$/, "")}/table/${table.code}`,
      { width: 176, margin: 1, errorCorrectionLevel: "M" }).catch(() => undefined)
  }, [table.code, baseUrl])
  return <div className="print-table break-inside-avoid rounded-2xl border border-indigo-100 bg-white p-4 text-center shadow-sm">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">{restaurant} · Mesa</p>
    <h3 className="mt-1 text-xl font-black text-slate-900">{table.label}</h3>
    <p className="text-xs text-slate-500">{table.roomName} · {table.seats} sillas</p>
    <canvas ref={canvas} className="mx-auto my-2 max-w-full" aria-label={`QR de ${table.label}`} />
    <p className="text-xs font-semibold text-slate-700">Escaneá para pedir desde tu teléfono</p>
    <p className="mt-1 font-mono text-[9px] text-slate-400">{table.code}</p>
  </div>
}

export default function DiningPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [rooms, setRooms] = useState<DiningRoom[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [roomDraft, setRoomDraft] = useState<RoomDraft | null>(null)
  const [tableDraft, setTableDraft] = useState<TableDraft | null>(null)
  const [baseUrl, setBaseUrl] = useState("")
  const [qrTable, setQrTable] = useState<DiningTable | null>(null)
  const { companyConfig } = useCompany()
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    try { const data = await apiRequest<{ rooms: DiningRoom[]; tables: DiningTable[] }>("/api/dining"); setRooms(data.rooms); setTables(data.tables) }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se cargaron los salones") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load(); setBaseUrl(window.location.origin)
    apiRequest<{ baseUrl: string | null }>("/api/phone-access").then(({ baseUrl }) => { if (baseUrl) setBaseUrl(baseUrl) }).catch(() => undefined)
  }, [load])
  const saveRoom = async () => {
    if (!roomDraft) return
    setBusy(true)
    try { await apiRequest("/api/dining", { method: roomDraft.id ? "PATCH" : "POST", body: JSON.stringify({ kind: "room", ...roomDraft }) });
      toast.success("Salón guardado"); setRoomDraft(null); await load() }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar el salón") }
    finally { setBusy(false) }
  }
  const saveTable = async () => {
    if (!tableDraft) return
    setBusy(true)
    try { await apiRequest("/api/dining", { method: tableDraft.id ? "PATCH" : "POST", body: JSON.stringify({ kind: "table", ...tableDraft }) });
      toast.success("Mesa guardada"); setTableDraft(null); await load() }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar la mesa") }
    finally { setBusy(false) }
  }
  const uploadImage = (file?: File) => {
    if (!file || !roomDraft) return
    if (!/image\/(png|jpeg|webp)/.test(file.type) || file.size > 1_000_000) { toast.error("Elegí una foto JPG, PNG o WebP de hasta 1 MB."); return }
    const reader = new FileReader()
    reader.onload = () => setRoomDraft((current) => current ? { ...current, imageData: String(reader.result) } : current)
    reader.readAsDataURL(file)
  }
  const activeRooms = rooms.filter((room) => room.isActive)
  const activeTables = tables.filter((table) => table.isActive)
  return <main className="min-h-full bg-gradient-to-br from-slate-50 via-indigo-50/50 to-cyan-50/60 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 sm:p-7">
    <div className="mx-auto max-w-7xl">
      <div className="screen-only mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Configuración del local</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Salones y mesas</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Organizá sillas, cuentas y pedidos por QR en cada mesa.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()} aria-label="Actualizar"><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => window.print()} disabled={!activeTables.length}><Printer className="mr-2 h-4 w-4" /> Imprimir QR</Button>
          <Button onClick={() => setRoomDraft({ ...emptyRoom })}><CirclePlus className="mr-2 h-4 w-4" /> Nuevo salón</Button></div>
      </div>
      <div className="screen-only mb-6 grid gap-3 sm:grid-cols-3">
        {[{ label: "Salones activos", value: activeRooms.length, icon: UsersRound, color: "from-indigo-600 to-violet-600" },
          { label: "Mesas disponibles", value: activeTables.filter((table) => !table.openOrderId).length, icon: Armchair, color: "from-emerald-500 to-teal-600" },
          { label: "Mesas con cuenta", value: activeTables.filter((table) => table.openOrderId).length, icon: QrCode, color: "from-amber-500 to-orange-600" }]
          .map(({ label, value, icon: Icon, color }) => <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-lg`}><Icon className="mb-2 h-5 w-5 opacity-80" /><p className="text-sm opacity-85">{label}</p><strong className="text-3xl">{value}</strong></div>)}
      </div>
      <div className="screen-only mb-5 rounded-2xl border bg-white/85 p-4 shadow-sm dark:bg-slate-900/80"><label htmlFor="dining-base-url" className="text-sm font-bold">Dirección para los QR en teléfonos</label><Input id="dining-base-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="mt-2" /><p className="mt-1 text-xs text-muted-foreground">Usá la dirección segura de la red local. Los QR impresos conservarán esta dirección.</p></div>
      {loading ? <p className="py-10 text-center">Cargando…</p> : activeRooms.length === 0 ? <div className="screen-only rounded-2xl border border-dashed p-12 text-center"><p>Creá el primer salón para agregar mesas.</p></div> :
        <div className="space-y-7">{activeRooms.map((room) => <section key={room.id} className="overflow-hidden rounded-3xl border border-indigo-100 bg-white/90 shadow-lg shadow-indigo-100/40 dark:border-slate-800 dark:bg-slate-900/90">
          <div className="relative min-h-40 bg-gradient-to-br from-indigo-700 via-violet-600 to-sky-500 p-5 text-white sm:p-7" style={room.imageData ? { backgroundImage: `linear-gradient(90deg,rgba(17,24,39,.83),rgba(17,24,39,.2)),url(${room.imageData})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
            <div className="relative flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-white/75">Salón</p><h2 className="text-2xl font-black">{room.name}</h2><p className="mt-1 text-sm text-white/80">{room.description || "Espacio de atención"} · {activeTables.filter((table) => table.roomId === room.id).length} mesas</p></div>
              <div className="screen-only flex gap-2"><Button variant="secondary" size="sm" onClick={() => setRoomDraft({ ...room })}><Pencil className="mr-1 h-4 w-4" /> Editar</Button><Button variant="secondary" size="sm" onClick={() => setTableDraft({ ...emptyTable, roomId: room.id })}><CirclePlus className="mr-1 h-4 w-4" /> Mesa</Button></div></div>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{activeTables.filter((table) => table.roomId === room.id).map((table) => <div key={table.id} className={`screen-only rounded-2xl border p-4 ${table.openOrderId ? "border-amber-200 bg-amber-50/80 dark:bg-amber-950/20" : "border-emerald-100 bg-emerald-50/60 dark:bg-emerald-950/10"}`}>
            <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-slate-900 dark:text-white">{table.label}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Armchair className="h-3.5 w-3.5" /> {table.seats} sillas · {table.shape === "round" ? "Redonda" : table.shape === "square" ? "Cuadrada" : "Rectangular"}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${table.openOrderId ? "bg-amber-200 text-amber-900" : "bg-emerald-200 text-emerald-900"}`}>{table.openOrderId ? `Orden #${table.openOrderId}` : "Libre"}</span></div>
            <SeatingDiagram seats={table.seats} shape={table.shape} />
            <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setTableDraft({ id: table.id, roomId: table.roomId, label: table.label, seats: table.seats, shape: table.shape, isActive: table.isActive })}><Pencil className="mr-1 h-3.5 w-3.5" /> Editar</Button><Button variant="outline" size="sm" onClick={() => router.push(table.openOrderId ? `/pos?order=${table.openOrderId}` : `/pos?table=${table.code}`)}><ShoppingCart className="mr-1 h-3.5 w-3.5" /> {table.openOrderId ? "Abrir" : "Usar"}</Button><Button size="sm" onClick={() => setQrTable(table)} className="bg-indigo-600 text-white hover:bg-indigo-700"><QrCode className="mr-1 h-3.5 w-3.5" /> QR</Button></div>
          </div>)}{activeTables.filter((table) => table.roomId === room.id).length === 0 && <p className="screen-only col-span-full py-5 text-center text-sm text-muted-foreground">Aún no hay mesas. Agregá una con el botón de arriba.</p>}</div>
        </section>)}</div>}
      <div className="qr-print-grid mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{activeTables.map((table) => <TableQr key={table.id} table={table} baseUrl={baseUrl} restaurant={user?.restaurantName ?? "Restaurante"} />)}</div>
    </div>
    <Dialog open={Boolean(roomDraft)} onOpenChange={(open) => { if (!open) setRoomDraft(null) }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{roomDraft?.id ? "Editar salón" : "Nuevo salón"}</DialogTitle><DialogDescription>Podés subir una foto del espacio para reconocerlo rápidamente.</DialogDescription></DialogHeader>{roomDraft && <div className="space-y-3"><label className="block text-sm font-medium">Nombre<Input value={roomDraft.name} onChange={(event) => setRoomDraft({ ...roomDraft, name: event.target.value })} className="mt-1" placeholder="Salón principal, terraza…" /></label><label className="block text-sm font-medium">Descripción<Input value={roomDraft.description} onChange={(event) => setRoomDraft({ ...roomDraft, description: event.target.value })} className="mt-1" /></label><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed p-4 text-sm"><Camera className="h-5 w-5" /> {roomDraft.imageData ? "Cambiar foto" : "Subir foto del salón"}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadImage(event.target.files?.[0])} /></label>{roomDraft.imageData && <img src={roomDraft.imageData} alt="Vista del salón" className="h-36 w-full rounded-xl object-cover" />}{roomDraft.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={roomDraft.isActive} onChange={(event) => setRoomDraft({ ...roomDraft, isActive: event.target.checked })} /> Salón activo</label>}<Button className="w-full" disabled={busy} onClick={() => void saveRoom()}>{busy ? "Guardando…" : "Guardar salón"}</Button></div>}</DialogContent></Dialog>
    <Dialog open={Boolean(tableDraft)} onOpenChange={(open) => { if (!open) setTableDraft(null) }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{tableDraft?.id ? "Editar mesa" : "Nueva mesa"}</DialogTitle><DialogDescription>El QR permitirá abrir esta mesa y pedir desde el teléfono.</DialogDescription></DialogHeader>{tableDraft && <div className="space-y-3"><label className="block text-sm font-medium">Salón<select value={tableDraft.roomId} onChange={(event) => setTableDraft({ ...tableDraft, roomId: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value={0}>Seleccionar…</option>{activeRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><label className="block text-sm font-medium">Nombre de la mesa<Input value={tableDraft.label} onChange={(event) => setTableDraft({ ...tableDraft, label: event.target.value })} className="mt-1" placeholder="Mesa 1" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Sillas<Input type="number" min={1} max={30} value={tableDraft.seats} onChange={(event) => setTableDraft({ ...tableDraft, seats: Number(event.target.value) })} className="mt-1" /></label><label className="block text-sm font-medium">Forma<select value={tableDraft.shape} onChange={(event) => setTableDraft({ ...tableDraft, shape: event.target.value as DiningTable["shape"] })} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="round">Redonda</option><option value="square">Cuadrada</option><option value="rectangular">Rectangular</option></select></label></div>{tableDraft.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tableDraft.isActive} onChange={(event) => setTableDraft({ ...tableDraft, isActive: event.target.checked })} /> Mesa activa</label>}<Button className="w-full" disabled={busy} onClick={() => void saveTable()}>{busy ? "Guardando…" : "Guardar mesa"}</Button></div>}</DialogContent></Dialog>
    <TableQrDialog table={qrTable} baseUrl={baseUrl} restaurant={companyConfig?.name || user?.restaurantName || "Restaurante"} color={/^#[0-9a-f]{6}$/i.test(companyConfig?.colors?.primary ?? "") ? companyConfig.colors.primary : "#4f46e5"} logo={companyConfig?.logo && !companyConfig.logo.includes("placeholder") ? companyConfig.logo : ""} onClose={() => setQrTable(null)} />
    <style jsx global>{`@media screen { .qr-print-grid { display: none !important; } } @media print { body { background: white !important; } .screen-only, .admin-sidebar, .admin-topbar { display: none !important; } .qr-print-grid { display: grid !important; grid-template-columns: repeat(3,1fr) !important; gap: 8mm !important; } .print-table { box-shadow: none !important; } @page { size: A4; margin: 10mm; } }`}</style>
  </main>
}
