"use client"

import { useEffect, useState } from "react"
import { Download, Share, X } from "lucide-react"

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** Estado de instalación de RestoPOS como app (Android/escritorio con aviso nativo, iPhone con instrucciones). */
export function useInstallApp() {
  const [available, setAvailable] = useState(false)
  const [ios, setIos] = useState(false)
  const [installed, setInstalled] = useState(true)
  useEffect(() => {
    const sync = () => { setAvailable(Boolean(window.__restoposInstall)); setInstalled(isStandalone()) }
    setIos(isIos()); sync()
    window.addEventListener("restopos:installable", sync)
    return () => window.removeEventListener("restopos:installable", sync)
  }, [])
  const install = async () => {
    const prompt = window.__restoposInstall
    if (!prompt) return false
    await prompt.prompt()
    const choice = await prompt.userChoice.catch(() => ({ outcome: "dismissed" }))
    window.__restoposInstall = null
    setAvailable(false)
    if (choice.outcome === "accepted") setInstalled(true)
    return choice.outcome === "accepted"
  }
  return { canInstall: !installed && (available || ios), nativePrompt: available, ios, installed, install }
}

export function InstallAppButton({ className = "", label = "Instalar app" }: { className?: string; label?: string }) {
  const { canInstall, nativePrompt, install } = useInstallApp()
  const [hint, setHint] = useState(false)
  if (!canInstall) return null
  return <>
    <button type="button" onClick={() => { if (nativePrompt) void install(); else setHint(true) }} className={className}>
      <Download className="h-4 w-4" aria-hidden /> {label}
    </button>
    {hint && <div role="dialog" aria-label="Instalar en iPhone" className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-sm rounded-2xl bg-slate-900 p-4 text-sm text-white shadow-2xl">
      <button type="button" onClick={() => setHint(false)} className="absolute right-3 top-3 text-slate-400" aria-label="Cerrar"><X className="h-4 w-4" /></button>
      <p className="pr-6 font-bold">Instalá RestoPOS en tu iPhone</p>
      <p className="mt-2 flex items-start gap-2 text-slate-300"><Share className="mt-0.5 h-4 w-4 shrink-0" /> En Safari tocá <strong className="mx-1 text-white">Compartir</strong> y después <strong className="mx-1 text-white">Agregar a inicio</strong>.</p>
    </div>}
  </>
}
