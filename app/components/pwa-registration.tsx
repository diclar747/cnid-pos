"use client"

import { useEffect } from "react"

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
declare global { interface Window { __restoposInstall?: InstallPrompt | null } }

/** Registra el service worker y guarda el aviso de instalación del navegador para usarlo desde cualquier pantalla. */
export function PwaRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("No se pudo registrar la aplicación instalable", error))
    }
    const capture = (event: Event) => {
      // La carta de cada mesa maneja su propia instalación.
      if (window.location.pathname.startsWith("/table/")) return
      event.preventDefault()
      window.__restoposInstall = event as InstallPrompt
      window.dispatchEvent(new Event("restopos:installable"))
    }
    const installed = () => { window.__restoposInstall = null; window.dispatchEvent(new Event("restopos:installable")) }
    window.addEventListener("beforeinstallprompt", capture)
    window.addEventListener("appinstalled", installed)
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", installed) }
  }, [])
  return null
}
