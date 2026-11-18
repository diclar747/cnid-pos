"use client"

import { useEffect, useState } from "react"

// Pantallas reales que rotan dentro de la laptop de la portada, siempre completas.
const SCREENS = [
  { src: "/landing/panel.webp", alt: "Panel de control de RestoPOS con ventas del día, ingresos y ticket promedio", label: "Panel" },
  { src: "/landing/pos.webp", alt: "Punto de venta de RestoPOS con la carta y el carrito", label: "Punto de venta" },
  { src: "/landing/cocina.webp", alt: "Tablero de cocina con las comandas por estado", label: "Cocina" },
  { src: "/landing/ordenes.webp", alt: "Órdenes abiertas por mesa con su cuenta", label: "Órdenes y mesas" },
]

export default function HeroScreens() {
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(1)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => {
      setLoaded(SCREENS.length)
      setIndex((current) => (current + 1) % SCREENS.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [])
  return <>
    {SCREENS.slice(0, loaded).map((screen, i) => (
      <img key={screen.src} src={screen.src} alt={i === index ? screen.alt : ""} aria-hidden={i !== index} decoding="async" fetchPriority={i === 0 ? "high" : "low"}
        className="absolute inset-0 h-full w-full object-contain transition-opacity duration-1000 ease-out" style={{ opacity: i === index ? 1 : 0 }} />
    ))}
    <div className="absolute bottom-[3%] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 text-[clamp(.5rem,1.1vw,.72rem)] font-semibold text-white shadow-lg backdrop-blur" aria-hidden>
      {SCREENS.map((screen, i) => <span key={screen.src} className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/40"}`} />)}
      <span className="ml-1">{SCREENS[index].label}</span>
    </div>
  </>
}
