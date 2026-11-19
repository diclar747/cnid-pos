"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import QRCode from "qrcode"
import { Armchair, Download, QrCode } from "lucide-react"

/** QR propio del restaurante: al escanearlo, el cliente entra directo (sin registrarse), elige su mesa y pide. */
export default function RestaurantQr({ slug, name }: { slug: string; name: string }) {
  const [image, setImage] = useState("")
  const [url, setUrl] = useState("")
  useEffect(() => {
    const target = `${window.location.origin}/r/${slug}`
    setUrl(target)
    const canvas = document.createElement("canvas")
    void QRCode.toCanvas(canvas, target, { width: 480, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } })
      .then(() => setImage(canvas.toDataURL("image/png"))).catch(() => setImage(""))
  }, [slug])
  const fileName = `qr-${slug}.png`
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="flex items-center gap-2 font-bold"><QrCode className="h-4 w-4 text-indigo-500" /> QR de {name}</h2>
    <div className="mt-3 flex items-center gap-4">
      <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border bg-white p-1.5">
        {image ? <img src={image} alt={`QR de ${name}`} className="h-full w-full" /> : <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />}</div>
      <div className="min-w-0 space-y-2 text-sm">
        <p className="text-slate-600 dark:text-slate-300">Escanealo con la cámara: entrás directo, sin registrarte, elegís tu mesa y pedís.</p>
        {image && <a href={image} download={fileName} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"><Download className="h-3.5 w-3.5" />Descargar QR</a>}
      </div>
    </div>
    {url && <Link href={`/r/${slug}`} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
      <Armchair className="h-4 w-4" /> Estoy en el local: elegir mi mesa</Link>}
  </div>
}
