"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CodeCameraProps {
  open: boolean
  onClose: () => void
  onResult: (value: string) => void
}

export function CodeCamera({ open, onClose, onResult }: CodeCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onResultRef = useRef(onResult)
  const onCloseRef = useRef(onClose)
  const [error, setError] = useState("")
  onResultRef.current = onResult
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let completed = false
    let stop: (() => void) | undefined
    setError("")
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("La cámara requiere HTTPS o abrir el sistema en este mismo equipo mediante localhost.")
        return
      }
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        if (cancelled || !videoRef.current) return
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result) => {
            if (!cancelled && !completed && result) {
              completed = true
              onResultRef.current(result.getText())
              onCloseRef.current()
            }
          },
        )
        stop = () => controls.stop()
        if (cancelled) stop()
      } catch {
        if (!cancelled) setError("No se pudo abrir la cámara. Revisá el permiso del navegador y la conexión segura.")
      }
    }
    void start()
    return () => { cancelled = true; stop?.() }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label="Escanear código">
      <div className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold"><Camera className="h-5 w-5 text-primary" /> Apuntá al código QR o de barras</div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Cerrar cámara"><X className="h-5 w-5" /></Button>
        </div>
        <video ref={videoRef} className="aspect-video w-full rounded-xl bg-slate-950 object-cover" muted playsInline />
        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
        <p className="mt-3 text-sm text-muted-foreground">El código se lee automáticamente al enfocarlo.</p>
      </div>
    </div>
  )
}
