"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Scan, X, Search, ShoppingCart } from "lucide-react"
import { products } from "../data/products"
import { useCart } from "../context/cart-context"
import Image from "next/image"
import toast from "react-hot-toast"

interface BarcodeScannerProps {
  onClose: () => void
}

export default function BarcodeScanner({ onClose }: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [foundProduct, setFoundProduct] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addToCart } = useCart()

  useEffect(() => {
    // Focus on input when component mounts
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const searchByBarcode = (code: string) => {
    if (!code.trim()) {
      setFoundProduct(null)
      return
    }

    const product = products.find(
      (p) => p.barcode === code || p.barcode?.includes(code) || p.name.toLowerCase().includes(code.toLowerCase()),
    )

    if (product) {
      setFoundProduct(product)
      toast.success(`Producto encontrado: ${product.name}`)
    } else {
      setFoundProduct(null)
      toast.error("Producto no encontrado")
    }
  }

  const handleBarcodeChange = (value: string) => {
    setBarcode(value)

    // Auto-search when barcode length is typical (8-13 digits)
    if (value.length >= 8) {
      searchByBarcode(value)
    } else {
      setFoundProduct(null)
    }
  }

  const handleManualSearch = () => {
    searchByBarcode(barcode)
  }

  const handleAddToCart = () => {
    if (foundProduct && foundProduct.stock > 0) {
      addToCart({
        id: foundProduct.id,
        name: foundProduct.name,
        price: foundProduct.price,
        image: foundProduct.image,
        quantity: 1,
      })
      toast.success(`${foundProduct.name} agregado al carrito`)

      // Clear and close after adding
      setBarcode("")
      setFoundProduct(null)
      onClose()
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const startScanning = () => {
    setIsScanning(true)
    // Simulate camera scanning - in a real app, you'd integrate with a camera library
    toast.success("Escáner activado - Enfoca el código de barras")

    // For demo purposes, simulate finding a product after 2 seconds
    setTimeout(() => {
      const randomProduct = products[Math.floor(Math.random() * products.length)]
      setBarcode(randomProduct.barcode || "")
      setFoundProduct(randomProduct)
      setIsScanning(false)
      toast.success("Código escaneado exitosamente")
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Escáner de Códigos</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Manual Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingreso Manual</CardTitle>
          <CardDescription>Ingresa el código de barras o busca por nombre del producto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barcode">Código de Barras / Nombre</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id="barcode"
                placeholder="Ej: 7891234567890 o Hamburguesa"
                value={barcode}
                onChange={(e) => handleBarcodeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualSearch()
                  }
                }}
              />
              <Button onClick={handleManualSearch} size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Camera Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Escáner de Cámara</CardTitle>
          <CardDescription>Usa la cámara para escanear códigos de barras automáticamente</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={startScanning}
            disabled={isScanning}
            className="w-full"
            variant={isScanning ? "secondary" : "default"}
          >
            <Scan className="h-4 w-4 mr-2" />
            {isScanning ? "Escaneando..." : "Activar Escáner"}
          </Button>

          {isScanning && (
            <div className="mt-4 p-4 border-2 border-dashed border-blue-300 rounded-lg text-center">
              <div className="animate-pulse">
                <Scan className="h-12 w-12 mx-auto text-blue-500 mb-2" />
                <p className="text-sm text-muted-foreground">Enfoca el código de barras en el centro de la pantalla</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Result */}
      {foundProduct && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-base text-green-700 dark:text-green-300">Producto Encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-20 h-20 relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                <Image
                  src={foundProduct.image || "/placeholder.svg"}
                  alt={foundProduct.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>

              <div className="flex-1 space-y-2">
                <h3 className="font-semibold">{foundProduct.name}</h3>
                {foundProduct.description && (
                  <p className="text-sm text-muted-foreground">{foundProduct.description}</p>
                )}

                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-green-600">{formatPrice(foundProduct.price)}</span>
                  <Badge variant={foundProduct.stock > 0 ? "secondary" : "destructive"}>
                    Stock: {foundProduct.stock}
                  </Badge>
                </div>

                {foundProduct.barcode && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Código:</span>
                    <Badge variant="outline" className="text-xs">
                      {foundProduct.barcode}
                    </Badge>
                  </div>
                )}

                <Button onClick={handleAddToCart} disabled={foundProduct.stock === 0} className="w-full mt-3">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {foundProduct.stock > 0 ? "Agregar al Carrito" : "Sin Stock"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Access Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos Frecuentes</CardTitle>
          <CardDescription>Acceso rápido a productos más vendidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {products.slice(0, 4).map((product) => (
              <Button
                key={product.id}
                variant="outline"
                size="sm"
                className="h-auto p-2 flex flex-col items-center gap-1 bg-transparent"
                onClick={() => {
                  setBarcode(product.barcode || "")
                  setFoundProduct(product)
                }}
              >
                <div className="w-8 h-8 relative overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
                <span className="text-xs text-center line-clamp-2">{product.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
