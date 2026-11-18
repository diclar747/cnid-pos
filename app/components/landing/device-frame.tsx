import type { ReactNode } from "react"

// Marcos de dispositivo hechos con CSS para mostrar capturas reales del sistema.

export function LaptopFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto w-full ${className}`}>
      <div className="rounded-t-[1.4rem] border border-slate-700/60 bg-slate-900 p-2 shadow-2xl shadow-indigo-950/40 sm:p-3">
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 hidden h-5 flex-1 rounded-md bg-slate-800 px-3 text-[10px] leading-5 text-slate-400 sm:block">restopos.cd.com.py</span>
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-slate-100">{children}</div>
      </div>
      <div className="mx-auto h-3 w-[104%] -translate-x-[2%] rounded-b-2xl bg-gradient-to-b from-slate-300 to-slate-400 shadow-lg dark:from-slate-600 dark:to-slate-700" />
      <div className="mx-auto h-1.5 w-1/4 rounded-b-xl bg-slate-400/80 dark:bg-slate-700" />
    </div>
  )
}

export function PhoneFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[17rem] ${className}`}>
      <div className="rounded-[2.6rem] border border-slate-700/60 bg-slate-900 p-2.5 shadow-2xl shadow-indigo-950/40">
        <div className="relative aspect-[390/844] overflow-hidden rounded-[2.1rem] bg-white">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900" />
          {children}
        </div>
      </div>
    </div>
  )
}
