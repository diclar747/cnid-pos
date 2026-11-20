// Temas del sistema: modo (claro/oscuro/sistema) y 6 paletas de color. Se guardan por dispositivo.

export type Theme = "light" | "dark" | "system"
export type Palette = "indigo" | "ocean" | "emerald" | "sunset" | "rose" | "graphite"

export const THEME_KEY = "theme"
export const PALETTE_KEY = "restopos:palette"

/** Colores de muestra (tono 600 del principal y del secundario) para el selector. */
export const PALETTES: { id: Palette; name: string; description: string; from: string; to: string }[] = [
  { id: "indigo", name: "Índigo", description: "Clásico, sereno y profesional", from: "#4f46e5", to: "#7c3aed" },
  { id: "ocean", name: "Océano", description: "Azul fresco y luminoso", from: "#2563eb", to: "#0891b2" },
  { id: "emerald", name: "Esmeralda", description: "Natural, calmo y elegante", from: "#059669", to: "#0d9488" },
  { id: "sunset", name: "Atardecer", description: "Cálido, con energía de cocina", from: "#ea580c", to: "#e11d48" },
  { id: "rose", name: "Rosa", description: "Delicado y moderno", from: "#e11d48", to: "#db2777" },
  { id: "graphite", name: "Grafito", description: "Sobrio y minimalista", from: "#52525b", to: "#475569" },
]

/** Script que corre antes de pintar la página: aplica el modo y la paleta guardados sin parpadeo. */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("${THEME_KEY}")||"system",p=localStorage.getItem("${PALETTE_KEY}");var m=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;d.classList.add(m);d.style.colorScheme=m;if(p&&/^(indigo|ocean|emerald|sunset|rose|graphite)$/.test(p))d.dataset.palette=p}catch(e){}})()`
