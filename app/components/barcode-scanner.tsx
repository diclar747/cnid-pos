"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Scan, X, Check } from "lucide-react"
import { useCart } from "../context/cart-context"
import toast from "react-hot-toast"

interface BarcodeScannerProps {
  onClose: () => void
}

export default function BarcodeScanner({ onClose }: BarcodeScannerProps) {
  const [manualBarcode, setManualBarcode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const { addToCart, products } = useCart()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleBarcodeSubmit = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode)

    if (product) {
      addToCart(product)
      toast.success(`${product.name} agregado al carrito`)
      onClose()
    } else {
      toast.error("Producto no encontrado")
    }
  }

  const startCamera = async () => {
    try {
      setIsScanning(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      toast.error("No se pudo acceder a la cámara")
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Escáner de Códigos
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual Input */}
        <div className="space-y-2">
          <Label htmlFor="barcode">Código de Barras Manual</Label>
          <div className="flex gap-2">
            <Input
              id="barcode"
              placeholder="Ingresa el código..."
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && manualBarcode.trim()) {
                  handleBarcodeSubmit(manualBarcode.trim())
                }
              }}
            />
            <Button
              onClick={() => handleBarcodeSubmit(manualBarcode.trim())}
              disabled={!manualBarcode.trim()}
              size="sm"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Camera Scanner */}
        <div className="space-y-2">
          <Label>Escáner con Cámara</Label>
          {!isScanning ? (
            <Button onClick={startCamera} className="w-full bg-transparent" variant="outline">
              <Scan className="h-4 w-4 mr-2" />
              Activar Cámara
            </Button>
          ) : (
            <div className="space-y-2">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-48 bg-black rounded-lg"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play()
                  }
                }}
              />
              <Button onClick={stopCamera} className="w-full" variant="destructive">
                Detener Cámara
              </Button>
            </div>
          )}
        </div>

        {/* Quick Access Barcodes */}
        <div className="space-y-2">
          <Label>Códigos de Prueba</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBarcodeSubmit("7891234567890")}
              className="text-xs"
            >
              Hamburguesa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBarcodeSubmit("7891234567891")}
              className="text-xs"
            >
              Pizza
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBarcodeSubmit("7891234567895")}
              className="text-xs"
            >
              Coca Cola
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBarcodeSubmit("7891234567800")}
              className="text-xs"
            >
              Torta
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
