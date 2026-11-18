// Logo de RestoPOS: campana de servicio sobre degradé violeta → rosa, con el nombre y la frase de la marca.
// Archivos en /public/brand (nombres propios para que ningún navegador muestre el ícono viejo guardado).

export const BRAND_ICON = "/brand/restopos-icon.svg"

export function BrandIcon({ className = "h-9 w-9" }: { className?: string }) {
  return <img src={BRAND_ICON} alt="" className={`${className} shrink-0 rounded-[28%] shadow-lg shadow-violet-500/30`} />
}

export function BrandLogo({ size = "md", tone = "light", tagline = false, className = "" }: {
  size?: "sm" | "md" | "lg"; tone?: "light" | "dark"; tagline?: boolean | string; className?: string
}) {
  const icon = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10"
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl"
  const dark = tone === "dark"
  return <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <BrandIcon className={icon} />
    <span className="leading-none">
      <span className={`block font-black tracking-tight ${text} ${dark ? "text-white" : "text-slate-900 dark:text-white"}`}>
        Resto<span className={`bg-gradient-to-r bg-clip-text text-transparent ${dark ? "from-violet-300 to-pink-300" : "from-indigo-600 via-violet-600 to-rose-500"}`}>POS</span></span>
      {tagline && <span className={`mt-1 block text-[11px] font-semibold ${dark ? "text-white/70" : "text-slate-500"}`}>{typeof tagline === "string" ? tagline : "Tu restaurante en línea"}</span>}
    </span>
  </span>
}
