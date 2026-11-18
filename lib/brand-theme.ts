// Estilo del encabezado según la apariencia elegida por el restaurante (Empresa → Apariencia).
export type HeaderStyle = "light" | "brand" | "dark"

export function headerTheme(style: string | undefined, color: string): { background: string; color: string } | null {
  if (style === "brand") return { background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 68%, #0f172a))`, color: "#fff" }
  if (style === "dark") return { background: "#0f172a", color: "#fff" }
  return null
}
