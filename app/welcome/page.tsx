"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Banknote, BellRing, ChefHat, LogIn, MessageCircle, QrCode, Sparkles } from "lucide-react"
import { LaptopFrame, PhoneFrame, Screen } from "../components/landing/device-frame"
import { InstallAppButton } from "../components/install-app"
import { BrandLogo } from "../components/brand-logo"

const SEEN_KEY = "restopos-welcome-seen"

type Slide = { title: string; text: string; badge: string; icon: typeof ChefHat; tone: string; visual: "hero" | "laptop" | "phone" | "both"; src: string; phoneSrc?: string; chips: string[]; photo: string }

// Fotos reales de platos (licencias Creative Commons, ver /photo-credits).
const COLLAGE = ["/menu-web/asado.jpg", "/menu-web/pizza.jpg", "/menu-web/burger.webp", "/menu-web/empanadas.jpg", "/menu-web/lasagna.jpg", "/menu-web/wings.jpg", "/menu-web/tres-leches.jpg", "/menu-web/jugo.jpg", "/menu-web/milanesa.jpg"]

const SLIDES: Slide[] = [
  { title: "Bienvenido a RestoPOS", text: "Mesas con QR, pedidos por WhatsApp, cocina en vivo, caja y delivery. Todo tu restaurante en el teléfono, la tablet o la PC.", badge: "Tu restaurante en línea",
    icon: Sparkles, tone: "from-orange-500 via-rose-500 to-violet-600", visual: "hero", src: "", chips: ["Pedidos en vivo", "Menú digital", "Delivery"], photo: "/menu-web/asado.jpg" },
  { title: "Todo tu negocio, en un panel", text: "Ventas del día, ticket promedio, platos más pedidos y caja abierta, desde cualquier dispositivo.", badge: "Tu restaurante en un solo lugar",
    icon: Sparkles, tone: "from-indigo-500 to-violet-600", visual: "both", src: "/landing/panel.webp", phoneSrc: "/landing/mesa-qr.webp", chips: ["Ventas del día", "Ticket promedio"], photo: "/menu-web/lasagna.jpg" },
  { title: "Vendé en segundos", text: "Elegí la categoría, tocá el plato y cobrá con efectivo, tarjeta, transferencia o QR. El ticket sale al instante.", badge: "Punto de venta",
    icon: Banknote, tone: "from-emerald-500 to-teal-600", visual: "laptop", src: "/landing/pos.webp", chips: ["Agregados y opciones", "Precuenta 75 mm"], photo: "/menu-web/burger.webp" },
  { title: "La cocina, en tiempo real", text: "Cada comanda llega sola al tablero y avanza de Pendiente a Listo. El mozo y el cliente se enteran al momento.", badge: "Cocina y pedidos",
    icon: ChefHat, tone: "from-orange-500 to-rose-500", visual: "laptop", src: "/landing/cocina.webp", chips: ["Pendiente", "Preparando", "Listo"], photo: "/menu-web/pizza.jpg" },
  { title: "Tus clientes piden desde la mesa", text: "Escanean el QR, arman su pedido, llaman al mozo y reciben avisos en el teléfono cuando su plato está listo.", badge: "QR de mesa",
    icon: QrCode, tone: "from-sky-500 to-indigo-600", visual: "phone", src: "/landing/mesa-qr.webp", chips: ["Llamar al mozo", "Avisos push"], photo: "/menu-web/empanadas.jpg" },
  { title: "Pedidos por WhatsApp con IA", text: "El asistente toma pedidos con los precios reales de tu carta y avisa cada cambio de estado. Vos seguís todo en el tablero.", badge: "WhatsApp + Niro IA",
    icon: MessageCircle, tone: "from-green-500 to-emerald-600", visual: "laptop", src: "/landing/ordenes.webp", chips: ["Confirmado", "En camino", "Entregado"], photo: "/menu-web/delivery.jpg" },
]

export default function WelcomePage() {
  const router = useRouter()
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let seen = false
    try { seen = window.localStorage.getItem(SEEN_KEY) === "1" } catch { /* sin almacenamiento */ }
    if (seen && new URLSearchParams(window.location.search).get("again") !== "1") router.replace("/login")
    else setReady(true)
  }, [router])

  const finish = useCallback(() => {
    try { window.localStorage.setItem(SEEN_KEY, "1") } catch { /* sin almacenamiento */ }
    router.push("/login")
  }, [router])

  const goTo = (next: number) => {
    const node = track.current
    if (!node) return
    node.scrollTo({ left: next * node.clientWidth, behavior: "smooth" })
  }
  const onScroll = () => {
    const node = track.current
    if (node) setIndex(Math.round(node.scrollLeft / Math.max(1, node.clientWidth)))
  }
  const last = index === SLIDES.length - 1

  if (!ready) return <main className="min-h-dvh bg-slate-950" />
  return <main className="relative flex h-dvh flex-col overflow-hidden bg-slate-950 text-white">
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {SLIDES.map((slide, i) => <img key={slide.photo} src={slide.photo} alt="" className={`absolute inset-0 h-full w-full scale-105 object-cover transition-opacity duration-1000 ${i === index ? "opacity-30" : "opacity-0"}`} />)}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/80 to-slate-950" />
      <div className={`absolute -left-1/4 -top-1/4 h-[70%] w-[90%] rounded-full bg-gradient-to-br ${SLIDES[index].tone} opacity-30 blur-3xl transition-all duration-700`} />
      <div className="absolute -bottom-1/3 right-[-20%] h-[60%] w-[80%] rounded-full bg-violet-600/20 blur-3xl" />
    </div>

    <header className="relative z-10 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
      <BrandLogo size="sm" tone="dark" />
      {!last && <button type="button" onClick={finish} className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-white/10">Saltar</button>}
    </header>

    <div ref={track} onScroll={onScroll} className="relative z-10 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-roledescription="carrusel" aria-label="Presentación de RestoPOS">
      {SLIDES.map((slide, i) => {
        const Icon = slide.icon
        return <section key={slide.title} aria-roledescription="diapositiva" aria-label={`${i + 1} de ${SLIDES.length}`} aria-hidden={i !== index}
          className="flex w-full shrink-0 snap-center flex-col items-center justify-center gap-6 px-6 pb-4 sm:flex-row sm:gap-12 sm:px-12">
          <div className={`relative flex w-full max-w-md items-end justify-center transition duration-700 sm:max-w-xl ${i === index ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
            {slide.visual === "hero" && <Collage active={i === index} />}
            {slide.visual !== "phone" && slide.visual !== "hero" && <div className={slide.visual === "both" ? "w-[86%]" : "w-full"}><LaptopFrame><Screen src={slide.src} alt="" lazy={i > 0} /></LaptopFrame></div>}
            {(slide.visual === "phone" || slide.visual === "both") && <div className={slide.visual === "both" ? "relative z-10 -mb-2 -ml-[8%] w-[24%]" : "w-[52%] max-w-[15rem]"}>
              <PhoneFrame><Screen src={slide.phoneSrc ?? slide.src} alt="" lazy={i > 0} /></PhoneFrame></div>}
            <div className="pointer-events-none absolute -top-3 left-0 flex flex-wrap gap-2">
              {slide.chips.map((chip, chipIndex) => <span key={chip} style={{ animationDelay: `${chipIndex * 0.6}s` }}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur motion-safe:animate-[float_6s_ease-in-out_infinite]">{chip}</span>)}
            </div>
          </div>
          <div className={`w-full max-w-md text-center transition delay-150 duration-700 sm:text-left ${i === index ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${slide.tone} px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-lg`}><Icon className="h-3.5 w-3.5" /> {slide.badge}</span>
            <h1 className={`mt-4 font-black leading-tight tracking-tight ${slide.visual === "hero" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>{slide.title}</h1>
            {slide.visual === "hero" && <p className="mt-1 bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-2xl font-black text-transparent sm:text-3xl">Tu restaurante en línea</p>}
            <p className="mt-3 text-base leading-relaxed text-slate-300">{slide.text}</p>
          </div>
        </section>
      })}
    </div>

    <footer className="relative z-10 space-y-4 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
      <div className="flex justify-center gap-2" role="tablist" aria-label="Diapositivas">
        {SLIDES.map((slide, i) => <button key={slide.title} type="button" role="tab" aria-selected={i === index} aria-label={`Ir a ${slide.title}`} onClick={() => goTo(i)}
          className={`h-2 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-white" : "w-2 bg-white/30"}`} />)}
      </div>
      <div className="mx-auto flex max-w-md flex-col gap-2">
        {last ? <>
          <button type="button" onClick={finish} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-slate-900 shadow-xl shadow-indigo-500/20 active:scale-[.99]"><LogIn className="h-5 w-5" /> Iniciar sesión</button>
          <InstallAppButton className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 text-sm font-semibold text-white hover:bg-white/10" label="Instalar RestoPOS en este dispositivo" />
          <p className="text-center text-xs text-slate-400"><BellRing className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Instalada, abre a pantalla completa y recibe avisos de pedidos.</p>
        </> : <button type="button" onClick={() => goTo(index + 1)} className={`flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${SLIDES[index].tone} text-base font-bold shadow-xl active:scale-[.99]`}>
          Siguiente <ArrowRight className="h-5 w-5" /></button>}
      </div>
    </footer>
  </main>
}

/** Collage de platos para la bienvenida: mosaico con leve inclinación y brillo. */
function Collage({ active }: { active: boolean }) {
  return <div className="relative grid w-full max-w-md grid-cols-3 gap-2.5 sm:max-w-lg" style={{ transform: "rotate(-4deg)" }}>
    {COLLAGE.map((src, i) => <div key={src} style={{ transitionDelay: `${i * 70}ms` }}
      className={`relative aspect-square overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/15 transition duration-700 ${i % 2 ? "translate-y-3" : ""} ${active ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}>
      <img src={src} alt="" className="h-full w-full object-cover" loading={i < 3 ? "eager" : "lazy"} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
    </div>)}
    <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 rotate-[4deg] items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-2xl">
      <span className="flex h-2 w-2 rounded-full bg-emerald-500" /> Pedido #128 listo para entregar</div>
  </div>
}
