"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Editor de opciones y adicionales de un producto (tamaños, variantes, punto de cocción, extras…).

export type ModifierOption = { legacyId: number; name: string; price: number }
export type ModifierGroup = { legacyId: number; name: string; required: boolean; multiple: boolean; options: ModifierOption[] }

// Ids nuevos: grandes y aleatorios para no chocar con los importados del sistema anterior.
const newId = () => 900_000_000 + Math.floor(Math.random() * 99_000_000)

export function ModifierEditor({ groups, onChange }: { groups: ModifierGroup[]; onChange: (groups: ModifierGroup[]) => void }) {
  const update = (index: number, changes: Partial<ModifierGroup>) => onChange(groups.map((group, i) => i === index ? { ...group, ...changes } : group))
  const updateOption = (groupIndex: number, optionIndex: number, changes: Partial<ModifierOption>) =>
    update(groupIndex, { options: groups[groupIndex].options.map((option, i) => i === optionIndex ? { ...option, ...changes } : option) })
  return <div className="space-y-3">
    {groups.map((group, groupIndex) => <fieldset key={group.legacyId} className="rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={group.name} onChange={(event) => update(groupIndex, { name: event.target.value })} placeholder="Grupo (ej.: Tamaño, Punto, Extras)" className="h-9 min-w-0 flex-1" maxLength={60} />
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={group.required} onChange={(event) => update(groupIndex, { required: event.target.checked })} />Obligatorio</label>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={group.multiple} onChange={(event) => update(groupIndex, { multiple: event.target.checked })} />Varias</label>
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(groups.filter((_, i) => i !== groupIndex))} aria-label={`Quitar grupo ${group.name}`}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="mt-2 space-y-1.5">
        {group.options.map((option, optionIndex) => <div key={option.legacyId} className="flex items-center gap-2">
          <Input value={option.name} onChange={(event) => updateOption(groupIndex, optionIndex, { name: event.target.value })} placeholder="Opción (ej.: Grande, Queso extra)" className="h-8 min-w-0 flex-1 text-sm" maxLength={60} />
          <Input inputMode="numeric" value={option.price ? String(option.price) : ""} onChange={(event) => updateOption(groupIndex, optionIndex, { price: Number(event.target.value.replace(/\D/g, "").slice(0, 9)) || 0 })}
            placeholder="+ Gs 0" className="h-8 w-28 text-sm" aria-label="Precio adicional" />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => update(groupIndex, { options: group.options.filter((_, i) => i !== optionIndex) })} aria-label={`Quitar ${option.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>)}
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => update(groupIndex, { options: [...group.options, { legacyId: newId(), name: "", price: 0 }] })}><Plus className="mr-1 h-3 w-3" />Opción</Button>
      </div>
    </fieldset>)}
    <Button type="button" variant="outline" size="sm" onClick={() => onChange([...groups, { legacyId: newId(), name: "", required: false, multiple: false, options: [{ legacyId: newId(), name: "", price: 0 }] }])}>
      <Plus className="mr-1 h-4 w-4" />Agregar grupo de opciones</Button>
  </div>
}

/** Quita grupos y opciones vacíos antes de guardar. */
export const cleanGroups = (groups: ModifierGroup[]) => groups
  .map((group) => ({ ...group, name: group.name.trim(), options: group.options.map((option) => ({ ...option, name: option.name.trim() })).filter((option) => option.name) }))
  .filter((group) => group.name && group.options.length)
