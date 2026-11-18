"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { BellRing, Download, PlusSquare, Share, Smartphone, X, Zap } from "lucide-react"
import { useInstallApp } from "./install-app"

// Aviso para instalar RestoPOS en el teléfono: tarjeta inferior moderna. En Android usa el instalador
// del navegador; en iPhone explica los dos toques. Si se descarta, vuelve a aparecer en 5 días.

const KEY = "restopos:install-dismissed"
const HIDDEN = ["/table/", "/card/", "/receipt/", "/kitchen/print", "/cash/report", "/welcome"]
const WAIT_DAYS = 5

export function InstallBanner() {
  const pathname = usePathname() ?? ""
  const { canInstall, nativePrompt, ios, install } = useInstallApp()
  const [visible, setVisible] = useState(false)
  const [steps, setSteps] = useState(false)

  useEffect(() => {
    if (!canInstall || HIDDEN.some((prefix) => pathname.startsWith(prefix))) { setVisible(false); return }
    const phone = window.matchMedia("(max-width: 900px)").matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent)
    let dismissed = 0
    try { dismissed = Number(localStorage.getItem(KEY) ?? 0) } catch { /* sin almacenamiento */ }
    if (!phone || Date.now() - dismissed < WAIT_DAYS * 86_400_000) return
    const timer = window.setTimeout(() => setVisible(true), 1800)
    return () => window.clearTimeout(timer)
  }, [canInstall, pathname])

  const close = () => { setVisible(false); setSteps(false); try { localStorage.setItem(KEY, String(Date.now())) } catch { /* opcional */ } }
  const accept = async () => {
    if (nativePrompt) { const ok = await install(); if (ok) setVisible(false); else close() }
    else setSteps(true)
  }
  if (!visible) return null

  return <div className="fixed inset-x-0 bottom-0 z-[90] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden" role="dialog" aria-label="Instalar RestoPOS">
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl shadow-indigo-950/50 ring-1 ring-white/10 animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-600 p-4">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <button type="button" onClick={close} className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 hover:bg-white/15" aria-label="Ahora no"><X className="h-4 w-4" /></button>
        <div className="relative flex items-center gap-3 pr-8">
          <img src="/brand/restopos-192.png" alt="" className="h-14 w-14 rounded-2xl shadow-lg ring-2 ring-white/30" />
          <div>
            <p className="text-lg font-black leading-tight">Instalá RestoPOS</p>
            <p className="text-sm text-white/85">Tu restaurante en línea, en tu teléfono</p>
          </div>
        </div>
      </div>
      {steps && ios ? <div className="space-y-3 p-4 text-sm">
        <p className="font-semibold">En iPhone son dos toques:</p>
        <p className="flex items-center gap-3 rounded-2xl bg-white/5 p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500"><Share className="h-5 w-5" /></span>
          <span>Tocá <strong>Compartir</strong> en la barra de Safari.</span></p>
        <p className="flex items-center gap-3 rounded-2xl bg-white/5 p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500"><PlusSquare className="h-5 w-5" /></span>
          <span>Elegí <strong>Agregar a inicio</strong> y confirmá.</span></p>
        <button type="button" onClick={close} className="h-11 w-full rounded-2xl bg-white/10 font-semibold hover:bg-white/15">Listo</button>
      </div> : <div className="p-4">
        <ul className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-300">
          <li className="rounded-2xl bg-white/5 px-2 py-2.5"><Zap className="mx-auto mb-1 h-4 w-4 text-amber-300" />Abre al instante</li>
          <li className="rounded-2xl bg-white/5 px-2 py-2.5"><Smartphone className="mx-auto mb-1 h-4 w-4 text-sky-300" />Pantalla completa</li>
          <li className="rounded-2xl bg-white/5 px-2 py-2.5"><BellRing className="mx-auto mb-1 h-4 w-4 text-rose-300" />Avisos de pedidos</li>
        </ul>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={close} className="h-12 flex-1 rounded-2xl text-sm font-semibold text-slate-300 hover:bg-white/5">Ahora no</button>
          <button type="button" onClick={() => void accept()} className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-slate-900 shadow-lg active:scale-[.99]">
            <Download className="h-5 w-5" /> Instalar app</button>
        </div>
      </div>}
    </div>
  </div>
}
