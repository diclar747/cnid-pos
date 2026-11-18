"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Banknote, BellRing, ChefHat, LogIn, MessageCircle, QrCode, Sparkles } from "lucide-react"
import { LaptopFrame, PhoneFrame, Screen } from "../components/landing/device-frame"
import { InstallAppButton } from "../components/install-app"

const SEEN_KEY = "restopos-welcome-seen"

type Slide = { title: string; text: string; badge: string; icon: typeof ChefHat; tone: string; visual: "laptop" | "phone" | "both"; src: string; phoneSrc?: string; chips: string[] }

const SLIDES: Slide[] = [
  { title: "Bienvenido a RestoPOS", text: "Punto de venta, mesas, cocina, caja y delivery de tu restaurante, en el teléfono, la tablet o la PC.", badge: "Tu restaurante en un solo lugar",
    icon: Sparkles, tone: "from-indigo-500 to-violet-600", visual: "both", src: "/landing/panel.webp", phoneSrc: "/landing/mesa-qr.webp", chips: ["Ventas del día", "Ticket promedio"] },
  { title: "Vendé en segundos", text: "Elegí la categoría, tocá el plato y cobrá con efectivo, tarjeta, transferencia o QR. El ticket sale al instante.", badge: "Punto de venta",
    icon: Banknote, tone: "from-emerald-500 to-teal-600", visual: "laptop", src: "/landing/pos.webp", chips: ["Agregados y opciones", "Precuenta 75 mm"] },
  { title: "La cocina, en tiempo real", text: "Cada comanda llega sola al tablero y avanza de Pendiente a Listo. El mozo y el cliente se enteran al momento.", badge: "Cocina y pedidos",
    icon: ChefHat, tone: "from-orange-500 to-rose-500", visual: "laptop", src: "/landing/cocina.webp", chips: ["Pendiente", "Preparando", "Listo"] },
  { title: "Tus clientes piden desde la mesa", text: "Escanean el QR, arman su pedido, llaman al mozo y reciben avisos en el teléfono cuando su plato está listo.", badge: "QR de mesa",
    icon: QrCode, tone: "from-sky-500 to-indigo-600", visual: "phone", src: "/landing/mesa-qr.webp", chips: ["Llamar al mozo", "Avisos push"] },
  { title: "Pedidos por WhatsApp con IA", text: "El asistente toma pedidos con los precios reales de tu carta y avisa cada cambio de estado. Vos seguís todo en el tablero.", badge: "WhatsApp + Niro IA",
    icon: MessageCircle, tone: "from-green-500 to-emerald-600", visual: "laptop", src: "/landing/ordenes.webp", chips: ["Confirmado", "En camino", "Entregado"] },
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
      <div className={`absolute -left-1/4 -top-1/4 h-[70%] w-[90%] rounded-full bg-gradient-to-br ${SLIDES[index].tone} opacity-30 blur-3xl transition-all duration-700`} />
      <div className="absolute -bottom-1/3 right-[-20%] h-[60%] w-[80%] rounded-full bg-violet-600/20 blur-3xl" />
    </div>

    <header className="relative z-10 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30"><Sparkles className="h-5 w-5" /></span>
        <span className="text-lg font-black">Resto<span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">POS</span></span></div>
      {!last && <button type="button" onClick={finish} className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-white/10">Saltar</button>}
    </header>

    <div ref={track} onScroll={onScroll} className="relative z-10 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-roledescription="carrusel" aria-label="Presentación de RestoPOS">
      {SLIDES.map((slide, i) => {
        const Icon = slide.icon
        return <section key={slide.title} aria-roledescription="diapositiva" aria-label={`${i + 1} de ${SLIDES.length}`} aria-hidden={i !== index}
          className="flex w-full shrink-0 snap-center flex-col items-center justify-center gap-6 px-6 pb-4 sm:flex-row sm:gap-12 sm:px-12">
          <div className={`relative flex w-full max-w-md items-end justify-center transition duration-700 sm:max-w-xl ${i === index ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
            {slide.visual !== "phone" && <div className={slide.visual === "both" ? "w-[86%]" : "w-full"}><LaptopFrame><Screen src={slide.src} alt="" lazy={i > 0} /></LaptopFrame></div>}
            {slide.visual !== "laptop" && <div className={slide.visual === "both" ? "relative z-10 -mb-2 -ml-[8%] w-[24%]" : "w-[52%] max-w-[15rem]"}>
              <PhoneFrame><Screen src={slide.phoneSrc ?? slide.src} alt="" lazy={i > 0} /></PhoneFrame></div>}
            <div className="pointer-events-none absolute -top-3 left-0 flex flex-wrap gap-2">
              {slide.chips.map((chip, chipIndex) => <span key={chip} style={{ animationDelay: `${chipIndex * 0.6}s` }}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur motion-safe:animate-[float_6s_ease-in-out_infinite]">{chip}</span>)}
            </div>
          </div>
          <div className={`w-full max-w-md text-center transition delay-150 duration-700 sm:text-left ${i === index ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${slide.tone} px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-lg`}><Icon className="h-3.5 w-3.5" /> {slide.badge}</span>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{slide.title}</h1>
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
