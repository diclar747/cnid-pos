"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Copy, Download, ExternalLink, Printer } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { DiningTable } from "@/lib/dining-types"

// QR de una mesa: tarjeta lista para imprimir o descargar. Quien la escanea ve la carta del restaurante,
// pide desde su teléfono (el pedido llega con esta mesa) y puede activar los avisos de su pedido.

const W = 720, H = 1040

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src })

type CardText = { title: string; headline: string; detail: string; footer: string }

/** Dibuja la tarjeta: encabezado con el restaurante, título (mesa o «Pedí desde tu mesa»), QR grande y la instrucción. */
async function drawCard(canvas: HTMLCanvasElement, text: CardText, url: string, restaurant: string, color: string, logo: string) {
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H)
  const band = ctx.createLinearGradient(0, 0, W, 260)
  band.addColorStop(0, color); band.addColorStop(1, "#7c3aed")
  ctx.fillStyle = band; roundRect(ctx, 0, 0, W, 340, 0); ctx.fill()
  const brand = await loadImage(logo || "/brand/restopos-icon.svg")
  if (brand) { ctx.save(); roundRect(ctx, W / 2 - 46, 34, 92, 92, 24); ctx.clip(); ctx.fillStyle = "#fff"; ctx.fillRect(W / 2 - 46, 34, 92, 92); ctx.drawImage(brand, W / 2 - 46, 34, 92, 92); ctx.restore() }
  ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"
  ctx.font = "800 34px 'Segoe UI', system-ui, sans-serif"; ctx.fillText(restaurant.slice(0, 32), W / 2, 170)
  ctx.font = "900 64px 'Segoe UI', system-ui, sans-serif"; ctx.fillText(text.title.slice(0, 20), W / 2, 246)
  ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(15,23,42,.2)"; ctx.shadowBlur = 30; roundRect(ctx, 110, 290, W - 220, W - 220, 36); ctx.fill(); ctx.shadowBlur = 0
  const qr = document.createElement("canvas")
  await QRCode.toCanvas(qr, url, { width: W - 300, margin: 0, errorCorrectionLevel: "H", color: { dark: "#0f172a", light: "#ffffff" } })
  ctx.drawImage(qr, 150, 330, W - 300, W - 300)
  ctx.fillStyle = "#0f172a"; ctx.font = "800 38px 'Segoe UI', system-ui, sans-serif"; ctx.fillText(text.headline, W / 2, 876)
  ctx.fillStyle = "#475569"; ctx.font = "500 26px 'Segoe UI', system-ui, sans-serif"; ctx.fillText(text.detail, W / 2, 918)
  ctx.fillStyle = "#94a3b8"; ctx.font = "600 20px 'Segoe UI', system-ui, sans-serif"; ctx.fillText(text.footer, W / 2, 990)
}

export function TableQrDialog({ table, baseUrl, restaurant, color, logo, onClose }: {
  table: DiningTable | null; baseUrl: string; restaurant: string; color: string; logo: string; onClose: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState("")
  const url = table ? `${(baseUrl || window.location.origin).replace(/\/$/, "")}/table/${table.code}` : ""
  useEffect(() => {
    setImage("")
    if (!table) return
    const target = document.createElement("canvas")
    void drawCard(target, { title: table.label, headline: "Escaneá para ver la carta", detail: "Pedí desde tu teléfono y seguí tu pedido", footer: `${table.roomName} · ${table.seats} sillas · RestoPOS` }, url, restaurant, color, logo).then(() => setImage(target.toDataURL("image/png"))).catch(() => toast.error("No se pudo generar el QR"))
  }, [table, url, restaurant, color, logo])

  const fileName = table ? `qr-${table.label.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}.png` : "qr.png"
  const download = () => { const link = document.createElement("a"); link.href = image; link.download = fileName; link.click() }
  const print = () => {
    const win = window.open("", "_blank", "width=720,height=980")
    if (!win) { toast.error("Permití las ventanas emergentes para imprimir"); return }
    win.document.write(`<!doctype html><title>QR ${table?.label ?? ""}</title><style>@page{size:A5;margin:8mm}body{margin:0;display:flex;justify-content:center}img{width:100%;max-width:130mm}</style><img src="${image}" onload="setTimeout(()=>{print()},150)">`)
    win.document.close()
  }
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success("Enlace copiado") } catch { toast.error("No se pudo copiar") } }

  return <Dialog open={Boolean(table)} onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="max-h-[94dvh] w-[calc(100vw-2rem)] max-w-md grid-cols-1 overflow-y-auto overflow-x-hidden [&>*]:min-w-0">
      <DialogHeader><DialogTitle>QR de {table?.label}</DialogTitle>
        <DialogDescription>Quien lo escanea ve la carta, pide desde su teléfono y el pedido llega a esta mesa. También puede activar los avisos de su pedido.</DialogDescription></DialogHeader>
      <div className="overflow-hidden rounded-2xl border bg-slate-50">
        {image ? <img src={image} alt={`QR de ${table?.label}`} className="w-full" /> : <div className="flex aspect-[72/100] items-center justify-center text-sm text-muted-foreground">Generando…</div>}
      </div>
      <canvas ref={canvas} className="hidden" />
      <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2"><span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{url}</span>
        <Button variant="ghost" size="sm" onClick={() => void copy()} aria-label="Copiar enlace"><Copy className="h-4 w-4" /></Button></div>
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={print} disabled={!image}><Printer className="mr-1 h-4 w-4" />Imprimir</Button>
        <Button variant="outline" onClick={download} disabled={!image}><Download className="mr-1 h-4 w-4" />Descargar</Button>
        <Button variant="outline" onClick={() => window.open(url, "_blank", "noopener")}><ExternalLink className="mr-1 h-4 w-4" />Ver carta</Button>
      </div>
    </DialogContent>
  </Dialog>
}

/** QR del restaurante: uno solo para todo el local. Quien lo escanea entra sin registrarse, elige su mesa y pide. */
export function RestaurantQrDialog({ open, url, restaurant, color, logo, onClose }: {
  open: boolean; url: string; restaurant: string; color: string; logo: string; onClose: () => void
}) {
  const [image, setImage] = useState("")
  useEffect(() => {
    setImage("")
    if (!open || !url) return
    const target = document.createElement("canvas")
    void drawCard(target, { title: "Pedí aquí", headline: "Escaneá y elegí tu mesa", detail: "Entrás directo, sin registrarte, y pedís", footer: `${restaurant} · RestoPOS` }, url, restaurant, color, logo)
      .then(() => setImage(target.toDataURL("image/png"))).catch(() => toast.error("No se pudo generar el QR"))
  }, [open, url, restaurant, color, logo])
  const download = () => { const link = document.createElement("a"); link.href = image; link.download = "qr-restaurante.png"; link.click() }
  const print = () => {
    const win = window.open("", "_blank", "width=720,height=980")
    if (!win) { toast.error("Permití las ventanas emergentes para imprimir"); return }
    win.document.write(`<!doctype html><title>QR del restaurante</title><style>@page{size:A5;margin:8mm}body{margin:0;display:flex;justify-content:center}img{width:100%;max-width:130mm}</style><img src="${image}" onload="setTimeout(()=>{print()},150)">`)
    win.document.close()
  }
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success("Enlace copiado") } catch { toast.error("No se pudo copiar") } }
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
    <DialogContent className="max-h-[94dvh] w-[calc(100vw-2rem)] max-w-md grid-cols-1 overflow-y-auto overflow-x-hidden [&>*]:min-w-0">
      <DialogHeader><DialogTitle>QR del restaurante</DialogTitle>
        <DialogDescription>Un solo QR para todo el local (entrada, mostrador, mesas). Al escanearlo, el cliente queda con su sesión abierta en el teléfono, elige su mesa y pide: el pedido llega a Mesas y a la cocina.</DialogDescription></DialogHeader>
      <div className="overflow-hidden rounded-2xl border bg-slate-50">
        {image ? <img src={image} alt="QR del restaurante" className="w-full" /> : <div className="flex aspect-[72/100] items-center justify-center text-sm text-muted-foreground">{url ? "Generando…" : "Sin dirección pública"}</div>}
      </div>
      <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2"><span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{url}</span>
        <Button variant="ghost" size="sm" onClick={() => void copy()} aria-label="Copiar enlace"><Copy className="h-4 w-4" /></Button></div>
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={print} disabled={!image}><Printer className="mr-1 h-4 w-4" />Imprimir</Button>
        <Button variant="outline" onClick={download} disabled={!image}><Download className="mr-1 h-4 w-4" />Descargar</Button>
        <Button variant="outline" onClick={() => window.open(url, "_blank", "noopener")} disabled={!url}><ExternalLink className="mr-1 h-4 w-4" />Abrir</Button>
      </div>
    </DialogContent>
  </Dialog>
}
