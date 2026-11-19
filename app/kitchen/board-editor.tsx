"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BOARD_DOTS, DEFAULT_COLUMNS, STATUS_LABEL, type BoardColumn, type BoardStatus } from "@/lib/kitchen-board"

// Editor del tablero de cocina: renombrar, colorear, ordenar, ocultar y agregar columnas propias.

export function BoardEditor({ open, columns, onClose, onSave }: { open: boolean; columns: BoardColumn[]; onClose: () => void; onSave: (columns: BoardColumn[]) => Promise<void> }) {
  const [draft, setDraft] = useState<BoardColumn[]>(columns)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setDraft(columns) }, [open, columns])
  const update = (index: number, changes: Partial<BoardColumn>) => setDraft((current) => current.map((column, i) => i === index ? { ...column, ...changes } : column))
  const move = (index: number, delta: number) => setDraft((current) => {
    const next = [...current]; const target = index + delta
    if (target < 0 || target >= next.length) return current
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
  const add = () => setDraft((current) => [...current, { id: `col-${Date.now().toString(36)}`, title: "Nueva columna", subtitle: "", color: "rose", status: "preparing", builtIn: false }])
  const save = async () => { setSaving(true); try { await onSave(draft); onClose() } finally { setSaving(false) } }

  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose() }}>
    <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Editar tablero de cocina</DialogTitle>
        <DialogDescription>Cambiá nombres, colores y el orden. Las columnas nuevas se apoyan en un estado: al soltar una comanda ahí, toma ese estado (por ejemplo «Esperando bebidas» → Preparando).</DialogDescription></DialogHeader>
      <div className="space-y-2">{draft.map((column, index) => <div key={column.id} className={`rounded-2xl border p-3 ${column.hidden ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded p-0.5 disabled:opacity-30" aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === draft.length - 1} className="rounded p-0.5 disabled:opacity-30" aria-label="Bajar"><ArrowDown className="h-3.5 w-3.5" /></button></div>
          <input value={column.title} onChange={(event) => update(index, { title: event.target.value.slice(0, 40) })} className="h-9 min-w-[10rem] flex-1 rounded-lg border bg-background px-2 text-sm font-semibold" aria-label="Nombre" />
          <select value={column.status} disabled={column.builtIn} onChange={(event) => update(index, { status: event.target.value as BoardStatus })} className="h-9 rounded-lg border bg-background px-2 text-sm disabled:opacity-70" aria-label="Estado">
            {(Object.keys(STATUS_LABEL) as BoardStatus[]).map((status) => <option key={status} value={status}>Estado: {STATUS_LABEL[status]}</option>)}</select>
          {column.builtIn
            ? <Button type="button" variant="ghost" size="sm" onClick={() => update(index, { hidden: !column.hidden })} title={column.hidden ? "Mostrar" : "Ocultar"}>{column.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
            : <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => setDraft((current) => current.filter((_, i) => i !== index))} title="Eliminar"><Trash2 className="h-4 w-4" /></Button>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
          <input value={column.subtitle} onChange={(event) => update(index, { subtitle: event.target.value.slice(0, 60) })} placeholder="Descripción corta" className="h-8 min-w-[10rem] flex-1 rounded-lg border bg-background px-2 text-xs" aria-label="Descripción" />
          <div className="flex gap-1">{Object.keys(BOARD_DOTS).map((color) => <button key={color} type="button" onClick={() => update(index, { color })} aria-label={`Color ${color}`}
            className={`h-6 w-6 rounded-full ${BOARD_DOTS[color]} ${column.color === color ? "ring-2 ring-slate-900 ring-offset-2 dark:ring-white" : ""}`} />)}</div>
        </div>
      </div>)}</div>
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={add}><Plus className="mr-1 h-4 w-4" />Agregar columna</Button>
          <Button type="button" variant="ghost" onClick={() => setDraft(DEFAULT_COLUMNS)}>Restablecer</Button></div>
        <Button type="button" onClick={() => void save()} disabled={saving || draft.some((column) => !column.title.trim())}>{saving ? "Guardando…" : "Guardar tablero"}</Button>
      </div>
    </DialogContent>
  </Dialog>
}
