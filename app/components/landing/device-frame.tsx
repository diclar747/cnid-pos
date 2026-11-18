import type { ReactNode } from "react"

// Marcos de dispositivo hechos con CSS para mostrar capturas reales del sistema.
// La pantalla de la laptop es exactamente 16:10, igual que las capturas: se ven completas, sin recortes.

export function LaptopFrame({ children, className = "", url = "restopos.cd.com.py" }: { children: ReactNode; className?: string; url?: string }) {
  return (
    <div className={`relative mx-auto w-full ${className}`}>
      <div className="relative rounded-[clamp(.7rem,1.6vw,1.25rem)] bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 p-[1.4%] pt-[2.2%] shadow-[0_45px_90px_-30px_rgba(30,27,75,.7)] ring-1 ring-inset ring-white/10">
        <span aria-hidden className="absolute left-1/2 top-[0.75%] h-[clamp(.2rem,.45vw,.4rem)] w-[clamp(.2rem,.45vw,.4rem)] -translate-x-1/2 rounded-full bg-slate-950 ring-1 ring-slate-600" />
        <div className="overflow-hidden rounded-[clamp(.35rem,.8vw,.6rem)] bg-white">
          <div aria-hidden className="flex items-center gap-[clamp(.25rem,.6vw,.4rem)] border-b border-slate-200 bg-slate-100 px-[clamp(.4rem,1.2vw,.8rem)] py-[clamp(.2rem,.55vw,.4rem)]">
            <span className="h-[clamp(.3rem,.7vw,.55rem)] w-[clamp(.3rem,.7vw,.55rem)] rounded-full bg-rose-400" />
            <span className="h-[clamp(.3rem,.7vw,.55rem)] w-[clamp(.3rem,.7vw,.55rem)] rounded-full bg-amber-400" />
            <span className="h-[clamp(.3rem,.7vw,.55rem)] w-[clamp(.3rem,.7vw,.55rem)] rounded-full bg-emerald-400" />
            <span className="mx-auto flex min-w-0 max-w-[55%] flex-1 items-center justify-center gap-1 truncate rounded-md bg-white px-2 text-[clamp(.45rem,1vw,.7rem)] leading-[1.7] text-slate-500 ring-1 ring-slate-200">
              <svg viewBox="0 0 16 16" className="h-[1em] w-[1em] shrink-0 fill-emerald-600"><path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" /></svg>
              {url}
            </span>
            <span className="w-[clamp(1rem,3vw,2rem)]" />
          </div>
          <div className="relative aspect-[16/10] overflow-hidden bg-slate-50">{children}</div>
        </div>
      </div>
      <div aria-hidden className="relative mx-auto h-[clamp(.55rem,1.4vw,1rem)] w-[104%] -translate-x-[1.92%] rounded-b-[clamp(.6rem,1.6vw,1.2rem)] rounded-t-[2px] bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 shadow-[0_18px_30px_-12px_rgba(15,23,42,.55)] dark:from-slate-500 dark:via-slate-600 dark:to-slate-700">
        <span className="absolute left-1/2 top-0 h-[45%] w-[14%] -translate-x-1/2 rounded-b-lg bg-slate-400/70 dark:bg-slate-800/70" />
      </div>
    </div>
  )
}

export function PhoneFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[17rem] ${className}`}>
      <div className="rounded-[18%/8.4%] bg-gradient-to-b from-slate-700 to-slate-900 p-[4%] shadow-[0_35px_70px_-25px_rgba(30,27,75,.75)] ring-1 ring-inset ring-white/15">
        <div className="relative aspect-[390/844] overflow-hidden rounded-[14%/6.5%] bg-white">
          <div aria-hidden className="absolute left-1/2 top-[1.6%] z-10 h-[3.2%] w-[32%] -translate-x-1/2 rounded-full bg-slate-950" />
          {children}
        </div>
      </div>
    </div>
  )
}

/** Captura dentro de un marco: siempre completa (contain) y con aparición suave. */
export function Screen({ src, alt, lazy = false }: { src: string; alt: string; lazy?: boolean }) {
  return <img src={src} alt={alt} loading={lazy ? "lazy" : undefined} decoding="async" className="absolute inset-0 h-full w-full object-contain" />
}
