"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Printer, RefreshCw, Ticket } from "lucide-react"
import toast from "react-hot-toast"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ProtectedRoute from "../../components/protected-route"
import { apiRequest } from "@/lib/api-client"
import type { OrderCard } from "@/lib/service-order-types"

function PrintableCard({ card, baseUrl }: { card: OrderCard; baseUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!canvasRef.current || !baseUrl) return
    void QRCode.toCanvas(canvasRef.current, `${baseUrl.replace(/\/$/, "")}/card/${card.code}`, { width: 180, margin: 1, errorCorrectionLevel: "M" })
      .catch(() => toast.error("No se pudo dibujar un código QR"))
  }, [card.code, baseUrl])
  return <article className="print-card break-inside-avoid rounded-2xl border-2 border-indigo-200 bg-white p-4 text-center text-slate-900 shadow-sm">
    <div className="mb-2 flex items-center justify-center gap-2 text-sm font-extrabold tracking-wide text-indigo-700"><Ticket className="h-4 w-4" /> DE LA CASA</div>
    <p className="min-h-6 text-base font-bold">{card.label || `Tarjeta ${card.id}`}</p>
    <canvas ref={canvasRef} className="mx-auto my-2 max-w-full" aria-label={`Código QR de ${card.label || card.code}`} />
    <p className="font-mono text-[10px] tracking-wide">{card.code}</p>
    <p className="mt-2 text-xs text-slate-600">Escaneá para consultar tu cuenta</p>
    <p className="mt-1 text-[10px] text-slate-500">Mostrá esta tarjeta al pedir o pagar</p>
    <span className={`screen-only mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${card.openOrderId ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{card.openOrderId ? `Orden #${card.openOrderId} abierta` : "Disponible"}</span>
  </article>
}

export default function OrderCardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<OrderCard[]>([])
  const [baseUrl, setBaseUrl] = useState("")
  const [label, setLabel] = useState("")
  const [count, setCount] = useState(10)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setBaseUrl(window.location.origin)
    apiRequest<{ baseUrl: string | null }>("/api/phone-access")
      .then(({ baseUrl }) => { if (baseUrl) setBaseUrl(baseUrl) })
      .catch(() => { /* Se mantiene la dirección actual y se puede editar. */ })
  }, [])
  const load = async () => {
    try { setCards((await apiRequest<{ items: OrderCard[] }>("/api/order-cards")).items) }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se cargaron las tarjetas") }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const create = async () => {
    setSaving(true)
    try {
      const result = await apiRequest<{ items: OrderCard[] }>("/api/order-cards", { method: "POST", body: JSON.stringify({ count, label }) })
      setCards((current) => [...result.items.reverse(), ...current])
      toast.success(`${result.items.length} tarjeta${result.items.length === 1 ? "" : "s"} creada${result.items.length === 1 ? "" : "s"}`)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron crear las tarjetas") }
    finally { setSaving(false) }
  }
  return <ProtectedRoute requiredPermissions={["access_pos"]}><main className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 p-4 dark:from-slate-950 dark:to-indigo-950 sm:p-6">
    <div className="mx-auto max-w-6xl">
      <header className="screen-only mb-6 flex flex-wrap items-end justify-between gap-3"><div><Button variant="ghost" size="sm" onClick={() => router.push("/orders")} className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" /> Órdenes</Button><h1 className="text-3xl font-bold">Tarjetas QR reutilizables</h1><p className="text-muted-foreground">Entregá una tarjeta al cliente. El personal la escanea para sumar consumos; el cliente consulta su cuenta desde el teléfono.</p></div><Button onClick={() => window.print()} disabled={!cards.length}><Printer className="mr-2 h-4 w-4" /> Imprimir tarjetas</Button></header>
      <section className="screen-only mb-6 grid gap-4 rounded-2xl border bg-card p-5 shadow-sm md:grid-cols-2"><div><h2 className="mb-3 font-bold">Crear tarjetas</h2><div className="flex flex-wrap gap-2"><Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Nombre, por ejemplo Mesa o Cliente" className="min-w-40 flex-1" /><Input type="number" min={1} max={30} value={count} onChange={(event) => setCount(Number(event.target.value))} aria-label="Cantidad de tarjetas" className="w-24" /><Button onClick={() => void create()} disabled={saving || count < 1 || count > 30}><Plus className="mr-1 h-4 w-4" /> Crear</Button></div><p className="mt-2 text-xs text-muted-foreground">Podés crear de 1 a 30 por lote. Cada tarjeta admite una cuenta abierta a la vez.</p></div><div><label className="mb-3 block font-bold" htmlFor="card-base-url">Dirección para teléfonos</label><Input id="card-base-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://nombre-del-equipo:3001" /><p className="mt-2 text-xs text-muted-foreground">Usá la dirección segura de la red local para que el QR abra la cuenta en el teléfono. Las tarjetas impresas guardan esa dirección.</p></div></section>
      <div className="screen-only mb-4 flex items-center justify-between"><p className="font-semibold">{cards.length} tarjetas · {cards.filter((card) => card.openOrderId).length} en uso</p><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" /> Actualizar</Button></div>
      {loading ? <p className="screen-only py-12 text-center text-muted-foreground">Cargando tarjetas…</p> : cards.length === 0 ? <p className="screen-only rounded-2xl border border-dashed p-12 text-center text-muted-foreground">Creá las primeras tarjetas para imprimir y entregar.</p> : <div className="card-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map((card) => <PrintableCard key={card.id} card={card} baseUrl={baseUrl} />)}</div>}
    </div>
    <style jsx global>{`@media print { body { background: white !important; } .screen-only { display: none !important; } .card-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 8mm !important; } .print-card { width: 100%; box-shadow: none !important; break-inside: avoid; } @page { size: A4; margin: 10mm; } }`}</style>
  </main></ProtectedRoute>
}
