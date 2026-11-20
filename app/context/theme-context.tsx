"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { PALETTE_KEY, PALETTES, THEME_KEY, type Palette, type Theme } from "@/lib/themes"

interface ThemeContextType {
  /** Modo elegido: claro, oscuro o el del sistema. */
  theme: Theme
  /** Modo que se ve ahora (resuelve «sistema»). */
  resolved: "light" | "dark"
  setTheme: (theme: Theme) => void
  /** Tema de color (6 paletas). */
  palette: Palette
  setPalette: (palette: Palette) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
const isPalette = (value: unknown): value is Palette => PALETTES.some((item) => item.id === value)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system")
  const [palette, setPaletteState] = useState<Palette>("indigo")
  const [resolved, setResolved] = useState<"light" | "dark">("light")

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY)
      if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") setThemeState(savedTheme)
      const savedPalette = localStorage.getItem(PALETTE_KEY)
      if (isPalette(savedPalette)) setPaletteState(savedPalette)
    } catch { /* sin almacenamiento: valores por defecto */ }
  }, [])

  // Modo claro/oscuro; con «sistema» sigue los cambios del sistema operativo.
  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const mode = theme === "system" ? (media.matches ? "dark" : "light") : theme
      root.classList.remove("light", "dark")
      root.classList.add(mode)
      root.style.colorScheme = mode
      setResolved(mode)
    }
    apply()
    if (theme !== "system") return
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  useEffect(() => { document.documentElement.dataset.palette = palette }, [palette])

  const setTheme = useCallback((value: Theme) => { setThemeState(value); try { localStorage.setItem(THEME_KEY, value) } catch { /* opcional */ } }, [])
  const setPalette = useCallback((value: Palette) => { setPaletteState(value); try { localStorage.setItem(PALETTE_KEY, value) } catch { /* opcional */ } }, [])

  return <ThemeContext.Provider value={{ theme, resolved, setTheme, palette, setPalette }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")
  return context
}
