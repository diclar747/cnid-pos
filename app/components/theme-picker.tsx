"use client"

import { Check, Laptop, Moon, Palette as PaletteIcon, Sun } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PALETTES, type Theme } from "@/lib/themes"
import { useTheme } from "../context/theme-context"

const modes: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Oscuro", icon: Moon },
  { id: "system", label: "Sistema", icon: Laptop },
]

/** Selector de apariencia: modo claro/oscuro/sistema y 6 temas de color. Se recuerda en este dispositivo. */
export function ThemePicker({ className = "" }: { className?: string }) {
  const { theme, resolved, setTheme, palette, setPalette } = useTheme()
  const current = PALETTES.find((item) => item.id === palette) ?? PALETTES[0]
  const ModeIcon = resolved === "dark" ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Apariencia: tema ${current.name}, modo ${theme === "system" ? "del sistema" : theme === "dark" ? "oscuro" : "claro"}`} title="Apariencia y colores"
          className={`group relative inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 pl-1.5 pr-2.5 text-slate-700 shadow-sm backdrop-blur transition hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 ${className}`}>
          <span className="h-6 w-6 rounded-full shadow-inner ring-2 ring-white dark:ring-slate-900" style={{ background: `linear-gradient(135deg, ${current.from}, ${current.to})` }} />
          <ModeIcon className="h-4 w-4 transition group-hover:rotate-12" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-3 shadow-xl">
        <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><PaletteIcon className="h-3.5 w-3.5" /> Apariencia</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Modo">
          {modes.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="radio" aria-checked={theme === id} onClick={() => setTheme(id)}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium transition ${theme === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
        <p className="mb-2 mt-3 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color del sistema</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Color del sistema">
          {PALETTES.map((item) => {
            const active = item.id === palette
            return (
              <button key={item.id} type="button" role="radio" aria-checked={active} onClick={() => setPalette(item.id)}
                className={`group relative overflow-hidden rounded-xl border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-transparent ring-2 ring-offset-1 ring-offset-background" : "border-border"}`}
                style={active ? { boxShadow: `0 0 0 2px ${item.from}` } : undefined}>
                <span className="mb-1.5 flex h-9 overflow-hidden rounded-lg">
                  <span className="flex-[3]" style={{ background: `linear-gradient(135deg, ${item.from}, ${item.to})` }} />
                  <span className="flex-1" style={{ background: item.to, opacity: 0.35 }} />
                </span>
                <span className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold">{item.name}</span>
                  {active && <span className="flex h-4 w-4 items-center justify-center rounded-full text-white" style={{ background: item.from }}><Check className="h-3 w-3" /></span>}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{item.description}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 px-1 text-[11px] text-muted-foreground">Se guarda en este dispositivo. Cada usuario puede elegir el suyo.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
