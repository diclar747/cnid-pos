"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X, Camera, Scan, Keyboard, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onProductScanned: (productName: string) => void
}

// Simulación de productos con códigos de barras
const mockProducts = [
  { barcode: "7891234567890", name: "Hamburguesa Clásica", price: 12500 },
  { barcode: "7891234567891", name: "Pizza Margherita", price: 18000 },
  { barcode: "7891234567892", name: "Coca Cola", price: 3500 },
  { barcode: "7891234567893", name: "Café Latte", price: 4500 },
  { barcode: "7891234567894", name: "Torta de Chocolate", price: 7500 },
  { barcode: "1234567890123", name: "Ensalada Mixta", price: 8500 },
  { barcode: "9876543210987", name: "Alitas de Pollo", price: 15000 },
  { barcode: "5555555555555", name: "Jugo de Naranja", price: 5500 },
]

export default function BarcodeScanner({ isOpen, onClose, onProductScanned }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [foundProduct, setFoundProduct] = useState<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsScanning(true)
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast.error("No se pudo acceder a la cámara")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      processBarcode(manualCode.trim())
    }
  }

  const processBarcode = (barcode: string) => {
    const product = mockProducts.find((p) => p.barcode === barcode)

    if (product) {
      setFoundProduct(product)
      setScanResult(barcode)
      toast.success(`Producto encontrado: ${product.name}`)
    } else {
      setScanResult(barcode)
      setFoundProduct(null)
      toast.error("Producto no encontrado en el sistema")
    }
  }

  const handleAddProduct = () => {
    if (foundProduct) {
      onProductScanned(foundProduct.name)
      toast.success(`${foundProduct.name} agregado al carrito`)
      handleClose()
    }
  }

  const handleClose = () => {
    stopCamera()
    setManualCode("")
    setScanResult(null)
    setFoundProduct(null)
    onClose()
  }

  const simulateSuccessfulScan = () => {
    const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)]
    processBarcode(randomProduct.barcode)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              <CardTitle>Escáner de Códigos</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Escanea o ingresa manualmente el código de barras del producto</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Área de la cámara */}
          <div className="relative">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {isScanning ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      videoRef.current.play()
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Cámara no disponible</p>
                  </div>
                </div>
              )}
            </div>

            {/* Overlay de escaneo */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-primary w-48 h-32 rounded-lg">
                  <div className="w-full h-full border-2 border-dashed border-primary/50 rounded-lg animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Botón de simulación para demo */}
          <Button variant="outline" onClick={simulateSuccessfulScan} className="w-full bg-transparent">
            <Scan className="h-4 w-4 mr-2" />
            Simular Escaneo Exitoso (Demo)
          </Button>

          {/* Entrada manual */}
          <div className="space-y-2">
            <Label htmlFor="manualCode" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Ingreso Manual
            </Label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                id="manualCode"
                placeholder="Código de barras"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm">
                Buscar
              </Button>
            </form>
          </div>

          {/* Resultado del escaneo */}
          {scanResult && (
            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {foundProduct ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {foundProduct ? "Producto encontrado" : "Producto no encontrado"}
                </span>
              </div>

              <div className="text-xs text-muted-foreground">
                Código: <code className="bg-background px-1 py-0.5 rounded">{scanResult}</code>
              </div>

              {foundProduct && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{foundProduct.name}</span>
                    <Badge variant="secondary">{formatPrice(foundProduct.price)}</Badge>
                  </div>
                  <Button onClick={handleAddProduct} className="w-full" size="sm">
                    Agregar al Carrito
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Códigos de ejemplo */}
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Códigos de ejemplo para probar:</p>
            <div className="grid grid-cols-2 gap-1">
              <code className="bg-muted px-1 py-0.5 rounded">7891234567890</code>
              <code className="bg-muted px-1 py-0.5 rounded">7891234567891</code>
              <code className="bg-muted px-1 py-0.5 rounded">1234567890123</code>
              <code className="bg-muted px-1 py-0.5 rounded">9876543210987</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
