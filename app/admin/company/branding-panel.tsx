"use client"

import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Check, ImagePlus, Loader2, Moon, Palette, Sparkles, Sun, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/api-client"
import type { CompanyConfig } from "../../context/company-context"
import { headerTheme } from "@/lib/brand-theme"

// Apariencia del restaurante: logo, portada, color y estilo del encabezado.
// Se ven en el encabezado del sistema, en el marketplace y en la página pública del restaurante.

const PRESETS = ["#4f46e5", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#d97706", "#16a34a", "#0d9488", "#0284c7", "#0f172a"]
const STYLES: { value: CompanyConfig["appearance"]["headerStyle"]; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun }, { value: "brand", label: "Con mi color", icon: Palette }, { value: "dark", label: "Oscuro", icon: Moon },
]

/** Reduce la imagen en el navegador antes de subirla (logo hasta 512 px, portada hasta 1600 px). */
async function shrink(file: File, max: number, quality = 0.86) {
  if (!/^image\/(png|jpeg|webp|gif|avif|heic|heif)$/.test(file.type)) throw new Error("Elegí una imagen (PNG, JPG o WEBP).")
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("No se pudo leer la imagen.")); img.src = url })
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height)
    const webp = canvas.toDataURL("image/webp", quality)
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality)
  } finally { URL.revokeObjectURL(url) }
}

export default function BrandingPanel({ formData, setFormData }: { formData: CompanyConfig; setFormData: Dispatch<SetStateAction<CompanyConfig>> }) {
  const color = /^#[0-9a-f]{6}$/i.test(formData.colors?.primary ?? "") ? formData.colors.primary : "#4f46e5"
  const style = formData.appearance?.headerStyle ?? "light"
  const setColor = (value: string) => setFormData((prev) => ({ ...prev, colors: { ...prev.colors, primary: value } }))
  const setStyle = (value: CompanyConfig["appearance"]["headerStyle"]) => setFormData((prev) => ({ ...prev, appearance: { ...prev.appearance, headerStyle: value } }))

  return <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Logo y portada</CardTitle>
        <CardDescription>El logo aparece en el encabezado del sistema, en los tickets y en el marketplace. La portada es la foto grande de tu página pública.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[14rem_1fr]">
        <ImageField kind="logo" label="Logo" hint="Cuadrado, fondo claro o transparente." value={formData.logo} max={512}
          onChange={(url) => setFormData((prev) => ({ ...prev, logo: url }))} />
        <ImageField kind="cover" label="Foto de portada" hint="Horizontal, de tu local o tus platos (1600 × 900 ideal)." value={formData.coverImage} max={1600} wide
          onChange={(url) => setFormData((prev) => ({ ...prev, coverImage: url }))} />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Color y encabezado</CardTitle>
        <CardDescription>Elegí el color de tu marca y cómo se ve la barra superior del sistema. Se aplica al guardar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium">Color principal</p>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((preset) => <button key={preset} type="button" onClick={() => setColor(preset)} aria-label={`Color ${preset}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 transition ${color.toLowerCase() === preset ? "ring-2 ring-slate-900 dark:ring-white" : "hover:scale-110"}`} style={{ background: preset }}>
              {color.toLowerCase() === preset && <Check className="h-4 w-4 text-white" />}</button>)}
            <label className="flex items-center gap-2 rounded-full border px-2 py-1 text-sm">
              <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label="Otro color" />
              <Input value={formData.colors?.primary ?? ""} onChange={(event) => setColor(event.target.value)} className="h-7 w-24 border-0 p-0 font-mono text-xs shadow-none focus-visible:ring-0" placeholder="#4f46e5" />
            </label>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Estilo del encabezado</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {STYLES.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => setStyle(value)}
              className={`overflow-hidden rounded-2xl border text-left transition ${style === value ? "border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900" : "hover:border-slate-300"}`}>
              <HeaderPreview style={value} color={color} logo={formData.logo} name={formData.name} slogan={formData.slogan} />
              <span className="flex items-center gap-2 px-3 py-2 text-sm font-medium"><Icon className="h-4 w-4" />{label}{style === value && <Check className="ml-auto h-4 w-4 text-indigo-600" />}</span>
            </button>)}
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Así te ven tus clientes</CardTitle><CardDescription>Vista previa de tu página en el marketplace.</CardDescription></CardHeader>
      <CardContent>
        <div className="relative h-44 overflow-hidden rounded-2xl text-white">
          {formData.coverImage ? <img src={formData.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}${formData.coverImage ? "cc" : ""}, #0f172a${formData.coverImage ? "dd" : ""} 75%)` }} />
          <div className="absolute bottom-4 left-4 flex items-end gap-3">
            <Logo logo={formData.logo} name={formData.name} color={color} size="h-16 w-16 text-2xl" />
            <div><p className="text-2xl font-black">{formData.name || "Tu restaurante"}</p><p className="text-sm text-white/85">{formData.slogan || "Tu frase o eslogan"}</p></div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
}

function Logo({ logo, name, color, size }: { logo: string; name: string; color: string; size: string }) {
  return logo
    ? <img src={logo} alt="" className={`${size} shrink-0 rounded-2xl border-2 border-white bg-white object-cover shadow-lg`} />
    : <span className={`${size} flex shrink-0 items-center justify-center rounded-2xl border-2 border-white font-black text-white shadow-lg`} style={{ background: color }}>{(name || "R").slice(0, 1).toUpperCase()}</span>
}

function HeaderPreview({ style, color, logo, name, slogan }: { style: string; color: string; logo: string; name: string; slogan: string }) {
  const theme = headerTheme(style, color)
  return <div className="flex items-center gap-2 border-b px-3 py-3" style={theme ?? { background: "#fff", color: "#0f172a" }}>
    {logo ? <img src={logo} alt="" className="h-7 w-7 rounded-lg bg-white object-cover" />
      : <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: theme ? "rgba(255,255,255,.2)" : color }}><Sparkles className="h-4 w-4" /></span>}
    <span className="min-w-0"><span className="block truncate text-xs font-black">{name || "Tu restaurante"}</span><span className="block truncate text-[10px] opacity-70">{slogan || "Caja · Administrador"}</span></span>
  </div>
}

function ImageField({ kind, label, hint, value, max, wide, onChange }: { kind: "logo" | "cover"; label: string; hint: string; value: string; max: number; wide?: boolean; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const shown = value && !value.includes("placeholder") ? value : ""
  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await shrink(file, max)
      const result = await apiRequest<{ url: string }>(`/api/brand/${kind}`, { method: "POST", body: JSON.stringify({ dataUrl }) })
      onChange(result.url)
      toast.success(`${label} actualizado`)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo subir la imagen.") }
    finally { setBusy(false); if (input.current) input.current.value = "" }
  }
  const remove = async () => {
    setBusy(true)
    try { await apiRequest(`/api/brand/${kind}`, { method: "DELETE" }); onChange(""); toast.success(`${label} quitado`) }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo quitar.") } finally { setBusy(false) }
  }
  return <div>
    <p className="mb-2 text-sm font-medium">{label}</p>
    <button type="button" onClick={() => input.current?.click()} disabled={busy}
      onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void upload(event.dataTransfer.files[0]) }}
      className={`group relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-muted/40 transition hover:border-indigo-400 ${wide ? "aspect-[16/7]" : "aspect-square"}`}>
      {shown ? <img src={shown} alt="" className={`h-full w-full ${wide ? "object-cover" : "object-contain p-3"}`} />
        : <span className="flex flex-col items-center gap-1 text-sm text-muted-foreground"><ImagePlus className="h-8 w-8" />Subir o arrastrar</span>}
      {busy && <span className="absolute inset-0 flex items-center justify-center bg-background/70"><Loader2 className="h-6 w-6 animate-spin" /></span>}
      {shown && !busy && <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1.5 text-center text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">Cambiar</span>}
    </button>
    <input ref={input} type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
    <div className="mt-2 flex items-start justify-between gap-2">
      <p className="text-xs text-muted-foreground">{hint}</p>
      {shown && <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-red-600" onClick={() => void remove()} disabled={busy}><Trash2 className="mr-1 h-3.5 w-3.5" />Quitar</Button>}
    </div>
  </div>
}
