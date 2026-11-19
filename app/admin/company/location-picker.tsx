"use client"

import { useState } from "react"
import { ExternalLink, Loader2, LocateFixed, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { coordinatesFrom } from "@/lib/delivery-pricing"

// Ubicación del local en Google Maps: con la ubicación del teléfono/computadora, pegando el enlace de Google Maps
// (también los cortos maps.app.goo.gl) o las coordenadas. Se usa para el mapa de la ficha y para calcular el delivery por km.

export function LocationPicker({ latitude, longitude, mapsUrl, onChange }: {
  latitude: string; longitude: string; mapsUrl: string
  onChange: (next: { latitude: string; longitude: string; mapsUrl?: string }) => void
}) {
  const [link, setLink] = useState("")
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const lat = Number(latitude.replace(",", ".")), lng = Number(longitude.replace(",", "."))
  const has = latitude.trim() !== "" && longitude.trim() !== "" && Number.isFinite(lat) && Number.isFinite(lng)
  const set = (point: { lat: number; lng: number }, url?: string) => {
    onChange({ latitude: point.lat.toFixed(6), longitude: point.lng.toFixed(6), ...(url ? { mapsUrl: url } : {}) })
    setMessage({ tone: "ok", text: "Ubicación cargada. Revisá el mapa y guardá los cambios." })
  }
  const useDevice = () => {
    if (!navigator.geolocation) { setMessage({ tone: "error", text: "Este navegador no comparte la ubicación." }); return }
    setBusy("device"); setMessage(null)
    navigator.geolocation.getCurrentPosition((position) => { set({ lat: position.coords.latitude, lng: position.coords.longitude }); setBusy("") },
      () => { setBusy(""); setMessage({ tone: "error", text: "No se pudo obtener la ubicación. Permití el acceso o pegá el enlace de Google Maps." }) },
      { enableHighAccuracy: true, timeout: 15000 })
  }
  const fromLink = async () => {
    const text = link.trim()
    if (!text) return
    const direct = coordinatesFrom(text)
    if (direct) { set(direct, /^https?:\/\//.test(text) ? text : undefined); setLink(""); return }
    setBusy("link"); setMessage(null)
    try {
      const response = await fetch("/api/maps/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: text }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || "No se pudo leer el enlace.")
      set({ lat: body.lat, lng: body.lng }, text); setLink("")
    } catch (problem) { setMessage({ tone: "error", text: problem instanceof Error ? problem.message : "No se pudo leer el enlace." }) }
    finally { setBusy("") }
  }

  return <div className="space-y-3 rounded-xl border p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-indigo-600" />Ubicación del local en Google Maps</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={useDevice} disabled={Boolean(busy)}>
          {busy === "device" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-1 h-4 w-4" />}Estoy en el local: usar mi ubicación</Button>
        {has && <Button type="button" size="sm" variant="ghost" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank", "noopener")}><ExternalLink className="mr-1 h-4 w-4" />Abrir en Google Maps</Button>}
      </div>
    </div>
    <div className="flex gap-2">
      <Input value={link} onChange={(event) => setLink(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void fromLink() } }}
        placeholder="Pegá el enlace de Google Maps (maps.app.goo.gl/…) o las coordenadas: -25.7801, -56.4469" />
      <Button type="button" onClick={() => void fromLink()} disabled={Boolean(busy) || !link.trim()}>{busy === "link" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ubicar"}</Button>
    </div>
    {message && <p className={`rounded-lg px-3 py-2 text-xs ${message.tone === "ok" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>{message.text}</p>}
    {has ? <iframe title="Ubicación del local" className="h-64 w-full rounded-lg border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`} />
      : <p className="rounded-lg bg-muted px-3 py-6 text-center text-sm text-muted-foreground">Todavía no cargaste la ubicación. Con ella el cliente ve cómo llegar y se calcula el delivery por kilómetro.</p>}
    {mapsUrl && <p className="truncate text-xs text-muted-foreground">Enlace: {mapsUrl}</p>}
  </div>
}
