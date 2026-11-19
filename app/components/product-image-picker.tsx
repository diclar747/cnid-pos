"use client"

import { useRef, useState } from "react"
import { ImagePlus, Link2, Loader2, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

// Foto del producto: subir desde la computadora (PNG, JPG, WEBP, GIF), arrastrar, pegar una imagen copiada,
// pegar una imagen en base64 o la dirección de una imagen (también enlaces largos de Google Imágenes).
// La imagen se achica en el navegador (máx. 1000 px) y se guarda aparte, así la lista de productos no se pone pesada.

const MAX_SIDE = 1000

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/product-images", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result?.error || "No se pudo guardar la imagen.")
  return result as { id: string; url: string; bytes: number; mime: string }
}

const readFile = (file: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("No se pudo leer el archivo.")); reader.readAsDataURL(file) })

/** Achica la imagen (si hace falta) y la devuelve como WEBP o JPG en base64. Los GIF se dejan como están. */
async function shrink(src: string): Promise<string> {
  if (src.startsWith("data:image/gif")) return src
  const img = await new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("No se pudo abrir la imagen.")); image.src = src })
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
  const webp = canvas.toDataURL("image/webp", 0.85)
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.86)
}

export function ProductImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [linkFallback, setLinkFallback] = useState("")
  const [dragging, setDragging] = useState(false)
  const shown = value && !value.includes("placeholder") ? value : ""

  const run = async (label: string, task: () => Promise<string>) => {
    setBusy(label); setError(""); setLinkFallback("")
    try { onChange(await task()); setText("") }
    catch (problem) { setError(problem instanceof Error ? problem.message : "No se pudo cargar la imagen.") }
    finally { setBusy("") }
  }
  const fromDataUrl = (dataUrl: string) => run("Guardando la imagen…", async () => (await post({ dataUrl: await shrink(dataUrl) })).url)
  const fromFile = (file: File | undefined | null) => {
    if (!file) return
    if (!/^image\/(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.type)) { setError("Elegí una imagen PNG, JPG, WEBP o GIF."); return }
    if (file.size > 15_000_000) { setError("La imagen es demasiado pesada (máximo 15 MB antes de achicarla)."); return }
    void run("Achicando y guardando…", async () => (await post({ dataUrl: await shrink(await readFile(file)) })).url)
  }
  const fromText = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    if (/^data:image\//i.test(value)) { void fromDataUrl(value.replace(/\s+/g, "")); return }
    if (!/^https?:\/\//i.test(value)) { setError("Pegá una dirección que empiece con http(s):// o una imagen en base64 (data:image/…)."); return }
    void run("Descargando la imagen…", async () => {
      try {
        const saved = await post({ url: value })
        // Ya está en el sistema (mismo sitio): se achica y reemplaza si conviene.
        if (saved.mime !== "image/gif" && saved.bytes > 250_000) {
          const small = await shrink(saved.url).catch(() => "")
          if (small && small.length * 0.75 < saved.bytes * 0.9) return (await post({ dataUrl: small, replace: saved.id })).url
        }
        return saved.url
      } catch (problem) {
        // El sitio no deja descargar: se puede usar el enlace tal cual (si es https).
        if (/^https:\/\//i.test(value)) setLinkFallback(value)
        throw problem
      }
    })
  }

  return <div className="space-y-2">
    <div onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files?.[0]; if (file) fromFile(file); else fromText(event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData("text/plain")) }}
      className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-3 transition ${dragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-200 dark:border-slate-700"}`}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        {shown ? <img src={shown} alt="Foto del producto" className="absolute inset-0 h-full w-full object-cover" onError={() => setError("No se pudo mostrar esa imagen.")} />
          : <ImagePlus className="absolute inset-0 m-auto h-8 w-8 text-slate-400" />}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></span>}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => fileInput.current?.click()} disabled={Boolean(busy)}><Upload className="mr-1 h-4 w-4" />Subir desde la computadora</Button>
          {shown && <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")} disabled={Boolean(busy)}><Trash2 className="mr-1 h-4 w-4" />Quitar</Button>}
        </div>
        <p className="text-xs text-muted-foreground">{busy || "PNG, JPG, WEBP o GIF. También podés arrastrar la imagen acá o pegarla (Ctrl+V)."}</p>
      </div>
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={(event) => { fromFile(event.target.files?.[0]); event.target.value = "" }} />
    </div>
    <div className="flex gap-2">
      <label className="relative min-w-0 flex-1">
        <Link2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <textarea value={text} rows={1} onChange={(event) => setText(event.target.value)} disabled={Boolean(busy)}
          onPaste={(event) => { const file = [...event.clipboardData.files].find((item) => item.type.startsWith("image/")); if (file) { event.preventDefault(); fromFile(file) } }}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); fromText(text) } }}
          placeholder="Pegá la dirección de una imagen o una imagen en base64 (data:image/…)"
          className="block max-h-24 min-h-10 w-full resize-y rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400" />
      </label>
      <Button type="button" variant="outline" onClick={() => fromText(text)} disabled={Boolean(busy) || !text.trim()}>Usar</Button>
    </div>
    {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}
      {linkFallback && <button type="button" className="ml-2 font-semibold underline" onClick={() => { onChange(linkFallback); setLinkFallback(""); setError(""); setText("") }}>Usar el enlace igual</button>}</div>}
  </div>
}
