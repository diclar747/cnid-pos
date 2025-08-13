"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, Scan, Search, Package, ShoppingCart, X } from "lucide-react"
import { useCart } from "../context/cart-context"
import { products } from "../data/products"
import toast from "react-hot-toast"

interface BarcodeScannerProps {
  onClose: () => void
}

export default function BarcodeScanner({ onClose }: BarcodeScannerProps) {
  const [manualBarcode, setManualBarcode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [foundProduct, setFoundProduct] = useState<any>(null)
  const [error, setError] = useState("")
  const { addToCart } = useCart()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Frequent products for quick access
  const frequentProducts = products.filter((p) => p.isPopular).slice(0, 6)

  const searchProduct = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode)
    if (product) {
      setFoundProduct(product)
      setError("")
      return product
    } else {
      setFoundProduct(null)
      setError(`No se encontró producto con código: ${barcode}`)
      return null
    }
  }

  const handleManualSearch = () => {
    if (!manualBarcode.trim()) {
      setError("Ingresa un código de barras")
      return
    }
    searchProduct(manualBarcode.trim())
  }

  const handleAddToCart = (product: any) => {
    addToCart(product, 1)
    toast.success(`${product.name} agregado al carrito`)
    onClose()
  }

  const startCamera = async () => {
    try {
      setIsScanning(true)
      setError("")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara. Verifica los permisos.")
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scan className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Escáner de Códigos</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Manual Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Búsqueda Manual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barcode">Código de Barras</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                placeholder="Ej: 7891234567890-801"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleManualSearch()}
                className="font-mono"
              />
              <Button onClick={handleManualSearch} size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sample Barcodes */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Códigos de ejemplo:</Label>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {products.slice(0, 4).map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  size="sm"
                  className="h-auto p-2 text-left justify-start bg-transparent"
                  onClick={() => {
                    setManualBarcode(product.barcode)
                    searchProduct(product.barcode)
                  }}
                >
                  <div>
                    <div className="font-mono text-xs">{product.barcode}</div>
                    <div className="text-xs text-muted-foreground truncate">{product.name}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Camera Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Escáner por Cámara
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isScanning ? (
            <Button onClick={startCamera} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Activar Cámara
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover" />
                <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center">
                  <div className="bg-black/50 text-white px-3 py-1 rounded text-sm">Enfoca el código de barras</div>
                </div>
              </div>
              <Button onClick={stopCamera} variant="outline" className="w-full bg-transparent">
                Detener Cámara
              </Button>
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Nota:</strong> El escaneo automático no está implementado en esta demo. Usa la búsqueda manual
                  con los códigos de ejemplo.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Frequent Products */}
      {frequentProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Productos Frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {frequentProducts.map((product) => (
                <Button
                  key={product.id}
                  variant="outline"
                  className="h-auto p-3 justify-between bg-transparent"
                  onClick={() => handleAddToCart(product)}
                >
                  <div className="text-left">
                    <div className="font-medium text-sm">{product.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{product.barcode}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{formatPrice(product.price)}</div>
                    <Badge variant="secondary" className="text-xs">
                      Stock: {product.stock}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Found Product */}
      {foundProduct && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-base text-green-800 dark:text-green-200 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Producto Encontrado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-green-900 dark:text-green-100">{foundProduct.name}</h3>
              <p className="text-sm text-green-700 dark:text-green-300">{foundProduct.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg text-green-800 dark:text-green-200">
                  {formatPrice(foundProduct.price)}
                </span>
                <Badge variant="outline" className="border-green-300 text-green-700">
                  Stock: {foundProduct.stock}
                </Badge>
              </div>
              <p className="text-xs font-mono text-green-600 dark:text-green-400">Código: {foundProduct.barcode}</p>
            </div>

            <Button
              onClick={() => handleAddToCart(foundProduct)}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={foundProduct.stock === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {foundProduct.stock === 0 ? "Sin Stock" : "Agregar al Carrito"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
