"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Download, Printer, QrCode, CheckCircle } from "lucide-react"
import type { Product } from "../context/cart-context"

interface BulkQRGeneratorProps {
  products: Product[]
  isOpen: boolean
  onClose: () => void
}

export function BulkQRGenerator({ products, isOpen, onClose }: BulkQRGeneratorProps) {
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedQRs, setGeneratedQRs] = useState<{ product: Product; dataUrl: string }[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const toggleProduct = (productId: number) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const selectAll = () => {
    setSelectedProducts(products.map((p) => p.id))
  }

  const clearSelection = () => {
    setSelectedProducts([])
  }

  const generateBulkQRs = async () => {
    if (selectedProducts.length === 0) return

    setIsGenerating(true)
    setProgress(0)
    setGeneratedQRs([])

    try {
      const QRCode = (await import("qrcode")).default
      const canvas = canvasRef.current
      if (!canvas) return

      const selectedProductsData = products.filter((p) => selectedProducts.includes(p.id))
      const qrResults: { product: Product; dataUrl: string }[] = []

      for (let i = 0; i < selectedProductsData.length; i++) {
        const product = selectedProductsData[i]

        const qrData = JSON.stringify({
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          price: product.price,
          category: product.category,
        })

        await QRCode.toCanvas(canvas, qrData, {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        })

        const dataUrl = canvas.toDataURL("image/png")
        qrResults.push({ product, dataUrl })

        setProgress(((i + 1) / selectedProductsData.length) * 100)
      }

      setGeneratedQRs(qrResults)
    } catch (error) {
      console.error("Error generando QRs:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadAllQRs = () => {
    generatedQRs.forEach(({ product, dataUrl }) => {
      const link = document.createElement("a")
      link.download = `qr-${product.name.replace(/\s+/g, "-").toLowerCase()}-${product.barcode}.png`
      link.href = dataUrl
      link.click()
    })
  }

  const printAllQRs = () => {
    const qrGrid = generatedQRs
      .map(
        ({ product, dataUrl }) => `
        <div class="qr-item">
          <img src="${dataUrl}" alt="QR ${product.name}" />
          <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="barcode">Código: ${product.barcode}</div>
            <div class="price">${formatCurrency(product.price)}</div>
            <div class="category">${product.category} | Stock: ${product.stock}</div>
          </div>
        </div>
      `,
      )
      .join("")

    const printContent = `
      <html>
        <head>
          <title>Códigos QR - Productos</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 10px;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              page-break-inside: avoid;
            }
            .qr-item {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: center;
              background: white;
              page-break-inside: avoid;
            }
            .qr-item img {
              width: 120px;
              height: 120px;
            }
            .product-info {
              margin-top: 8px;
              font-size: 11px;
            }
            .product-name {
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 3px;
            }
            .barcode {
              font-family: monospace;
              font-size: 10px;
            }
            .price {
              font-weight: bold;
              color: #2563eb;
              font-size: 11px;
            }
            .category {
              color: #666;
              font-size: 9px;
              margin-top: 2px;
            }
            @media print {
              .qr-grid {
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
              }
              .qr-item {
                padding: 8px;
              }
            }
          </style>
        </head>
        <body>
          <h2 style="text-align: center; margin-bottom: 20px;">Códigos QR de Productos</h2>
          <div class="qr-grid">
            ${qrGrid}
          </div>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Generar QR Codes en Lote
          </DialogTitle>
          <DialogDescription>Selecciona los productos para generar códigos QR</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isGenerating && generatedQRs.length === 0 && (
            <>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button onClick={selectAll} variant="outline" size="sm">
                    Seleccionar Todos
                  </Button>
                  <Button onClick={clearSelection} variant="outline" size="sm">
                    Limpiar Selección
                  </Button>
                </div>
                <Badge variant="secondary">{selectedProducts.length} productos seleccionados</Badge>
              </div>

              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center space-x-3 p-2 border rounded-lg">
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.barcode} • {formatCurrency(product.price)} • Stock: {product.stock}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {product.category}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={generateBulkQRs} disabled={selectedProducts.length === 0}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Generar QR Codes ({selectedProducts.length})
                </Button>
              </div>
            </>
          )}

          {isGenerating && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-lg font-medium">Generando códigos QR...</div>
                <div className="text-sm text-muted-foreground">Procesando {selectedProducts.length} productos</div>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-center text-sm text-muted-foreground">{Math.round(progress)}% completado</div>
            </div>
          )}

          {generatedQRs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">¡QR Codes generados exitosamente!</span>
                </div>
                <Badge variant="secondary">{generatedQRs.length} códigos generados</Badge>
              </div>

              <div className="flex gap-2 justify-center">
                <Button onClick={downloadAllQRs} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Todos
                </Button>
                <Button onClick={printAllQRs} variant="outline">
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Todos
                </Button>
                <Button
                  onClick={() => {
                    setGeneratedQRs([])
                    setSelectedProducts([])
                    setProgress(0)
                  }}
                  variant="outline"
                >
                  Generar Nuevos
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                {generatedQRs.map(({ product, dataUrl }) => (
                  <Card key={product.id} className="text-center">
                    <CardContent className="p-3">
                      <img
                        src={dataUrl || "/placeholder.svg"}
                        alt={`QR ${product.name}`}
                        className="w-20 h-20 mx-auto mb-2"
                      />
                      <div className="text-xs font-medium truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.barcode}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Canvas oculto para generar QRs */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </DialogContent>
    </Dialog>
  )
}
