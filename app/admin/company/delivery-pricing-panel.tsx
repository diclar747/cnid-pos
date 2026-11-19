"use client"

import Link from "next/link"
import { Bike, MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DEFAULT_PRICING, deliveryPricing, type DeliveryPricing } from "@/lib/delivery-pricing"

// Cómo se cobra el delivery: por zonas (Delivery → Zonas), por kilómetro (con la ubicación que comparte el cliente) o un precio fijo.

const money = (value: number) => `Gs ${value.toLocaleString("es-PY")}`
const digits = (value: string) => value.replace(/\D/g, "").slice(0, 9)

export function DeliveryPricingPanel({ value, hasLocation, onChange }: { value: Partial<DeliveryPricing> | undefined; hasLocation: boolean; onChange: (next: DeliveryPricing) => void }) {
  const pricing = deliveryPricing({ deliveryPricing: { ...DEFAULT_PRICING, ...value } })
  const set = (changes: Partial<DeliveryPricing>) => onChange({ ...pricing, ...changes })
  const num = (key: keyof DeliveryPricing, label: string, hint?: string, nullable = false) => <div className="space-y-1.5">
    <Label htmlFor={`dp-${key}`}>{label}</Label>
    <Input id={`dp-${key}`} inputMode="numeric" value={pricing[key] == null ? "" : String(pricing[key])} placeholder={nullable ? "Sin límite" : "0"}
      onChange={(event) => { const text = key === "maxKm" ? event.target.value.replace(/[^\d.]/g, "").slice(0, 5) : digits(event.target.value); set({ [key]: text === "" ? (nullable ? null : 0) : Number(text) } as Partial<DeliveryPricing>) }} />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
  const example = (km: number) => {
    const raw = Math.max(pricing.minFee, pricing.baseFee + km * pricing.perKm)
    return Math.ceil(raw / pricing.roundTo) * pricing.roundTo
  }
  const modes = [
    { id: "zones", title: "Por zonas", text: "Cada barrio o radio con su precio (Delivery → Zonas)." },
    { id: "km", title: "Por kilómetro", text: "Se calcula con la distancia desde el local hasta la ubicación del cliente." },
    { id: "fixed", title: "Precio fijo", text: "El mismo envío para todos los pedidos." },
  ] as const

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Bike className="h-5 w-5" />Cobro del delivery</CardTitle>
      <CardDescription>Elegí cómo se calcula el envío en los pedidos de la web, del QR y de WhatsApp. Guardá con «Guardar Cambios».</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Cómo se cobra el delivery">
        {modes.map((mode) => <button key={mode.id} type="button" role="radio" aria-checked={pricing.mode === mode.id} onClick={() => set({ mode: mode.id })}
          className={`rounded-xl border-2 p-3 text-left transition ${pricing.mode === mode.id ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"}`}>
          <span className="block font-semibold">{mode.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{mode.text}</span></button>)}
      </div>

      {pricing.mode === "km" && <>
        {!hasLocation && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />Cargá la ubicación del local en la pestaña «Ficha» para poder medir la distancia.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {num("perKm", "Precio por km (Gs)", "Ej.: 1000 = Gs 1.000 por kilómetro")}
          {num("baseFee", "Salida fija (Gs)", "Se suma siempre (puede ser 0)")}
          {num("minFee", "Envío mínimo (Gs)", "Para distancias muy cortas")}
          {num("maxKm", "Distancia máxima (km)", "Más lejos no se hace delivery", true)}
        </div>
        <div className="space-y-1.5"><Label htmlFor="dp-round">Redondeo</Label>
          <select id="dp-round" value={pricing.roundTo} onChange={(event) => set({ roundTo: Number(event.target.value) })} className="h-10 rounded-md border bg-background px-3 text-sm">
            {[[1, "Sin redondeo"], [100, "A Gs 100"], [500, "A Gs 500"], [1000, "A Gs 1.000"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="rounded-xl bg-muted/60 p-3 text-sm"><p className="font-medium">Ejemplos (distancia en línea recta)</p>
          <p className="mt-1 text-muted-foreground">{[1, 3, 5, 10].map((km) => `${km} km → ${pricing.maxKm != null && km > pricing.maxKm ? "fuera de alcance" : money(example(km))}`).join(" · ")}</p></div>
      </>}

      {pricing.mode === "fixed" && <div className="grid gap-4 sm:grid-cols-2">{num("fixedFee", "Precio del envío (Gs)")}</div>}

      {pricing.mode !== "zones" && <div className="grid gap-4 sm:grid-cols-2">{num("freeOver", "Envío gratis desde (Gs)", "Si el pedido supera este monto, el envío es gratis. Vacío = nunca.", true)}</div>}

      {pricing.mode === "zones" && <p className="text-sm text-muted-foreground">Las zonas, sus precios y radios se cargan en <Link href="/admin/delivery" className="font-medium text-indigo-600 underline">Delivery → Zonas</Link>.</p>}
      {pricing.mode === "km" && <p className="text-xs text-muted-foreground">Cuando el cliente comparte su ubicación (web, QR o WhatsApp 📍) el sistema calcula el envío solo. Sin ubicación, se usa la zona elegida o queda «a confirmar».</p>}
    </CardContent>
  </Card>
}
