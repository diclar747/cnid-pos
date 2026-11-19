"use client"

import { useEffect, useState } from "react"
import { Layers, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Opciones de varios productos a la vez: por ejemplo «Guarniciones» en 100 platos pasa a «elegir varias (se suman)»
// con un solo toque, o se quita un grupo viejo de todos los productos.

type Group = { name: string; products: number; multiple: boolean | "mixed"; required: boolean; options: number; sample: string }

export function OptionGroupsDialog({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const load = async () => {
    try {
      const response = await fetch("/api/product-groups", { cache: "no-store" })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error || "No se pudieron cargar los grupos.")
      setGroups(body.groups); setError("")
    } catch (problem) { setError(problem instanceof Error ? problem.message : "No se pudieron cargar los grupos.") }
  }
  useEffect(() => { if (open) { setGroups(null); void load() } }, [open])

  const change = async (group: Group, payload: Record<string, unknown>) => {
    if (payload.remove && !window.confirm(`¿Quitar el grupo «${group.name}» de ${group.products} productos? No se puede deshacer.`)) return
    setBusy(group.name); setError("")
    try {
      const response = await fetch("/api/product-groups", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: group.name, ...payload }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || "No se pudo cambiar el grupo.")
      await load(); onChanged()
    } catch (problem) { setError(problem instanceof Error ? problem.message : "No se pudo cambiar el grupo.") }
    finally { setBusy("") }
  }

  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl grid-cols-1 overflow-y-auto [&>*]:min-w-0">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Opciones de todos los productos</DialogTitle>
        <DialogDescription>Cambiá un grupo en todos los productos que lo usan. «Elige varias» deja marcar más de una opción y suma sus precios (ej.: arroz + puré + ensalada).</DialogDescription></DialogHeader>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!groups ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        : groups.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Ningún producto tiene opciones todavía.</p>
        : <ul className="divide-y rounded-xl border">{groups.map((group) => <li key={group.name} className="flex flex-wrap items-center gap-3 p-3">
          <div className="min-w-0 flex-1 basis-60">
            <p className="font-semibold">{group.name} <span className="text-xs font-normal text-muted-foreground">· {group.products} {group.products === 1 ? "producto" : "productos"}{group.required ? " · obligatorio" : ""}</span></p>
            <p className="truncate text-xs text-muted-foreground" title={group.sample}>{group.sample}</p>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs font-semibold" role="group" aria-label={`Cómo se elige en ${group.name}`}>
            <button type="button" disabled={Boolean(busy)} onClick={() => void change(group, { multiple: false })}
              className={`rounded-md px-3 py-1.5 ${group.multiple === false ? "bg-background shadow" : "text-muted-foreground"}`}>Elige 1</button>
            <button type="button" disabled={Boolean(busy)} onClick={() => void change(group, { multiple: true })}
              className={`rounded-md px-3 py-1.5 ${group.multiple === true ? "bg-indigo-600 text-white shadow" : "text-muted-foreground"}`}>Elige varias</button>
          </div>
          {group.multiple === "mixed" && <span className="text-[11px] text-amber-700">mezclado</span>}
          <Button type="button" variant="ghost" size="icon" disabled={Boolean(busy)} onClick={() => void change(group, { remove: true })} aria-label={`Quitar ${group.name} de todos los productos`}>
            {busy === group.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
        </li>)}</ul>}
    </DialogContent>
  </Dialog>
}
