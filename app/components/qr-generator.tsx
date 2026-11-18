"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Download, Printer, QrCode } from "lucide-react"
import type { Product } from "../context/cart-context"

interface QRGeneratorProps {
  product: Product
  isOpen: boolean
  onClose: () => void
}

export function QRGenerator({ product, isOpen, onClose }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

  useEffect(() => {
    if (isOpen && product) {
      generateQR()
    }
  }, [isOpen, product])

  const generateQR = async () => {
    try {
      // Importar QRCode dinámicamente
      const QRCode = (await import("qrcode")).default

      const canvas = canvasRef.current
      if (!canvas) return

      // Datos del QR: información del producto en formato JSON
      const qrData = JSON.stringify({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        price: product.price,
        category: product.category,
      })

      // Generar QR code
      await QRCode.toCanvas(canvas, qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      // Convertir canvas a data URL para descarga
      const dataUrl = canvas.toDataURL("image/png")
      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error("Error generando QR:", error)
    }
  }

  const downloadQR = () => {
    if (qrDataUrl) {
      const link = document.createElement("a")
      link.download = `qr-${product.name.replace(/\s+/g, "-").toLowerCase()}-${product.barcode}.png`
      link.href = qrDataUrl
      link.click()
    }
  }

  const printQR = () => {
    const printContent = `
      <html>
        <head>
          <title>Código QR - ${product.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              text-align: center;
            }
            .qr-container {
              border: 2px solid #000;
              padding: 20px;
              margin: 20px auto;
              width: fit-content;
              background: white;
            }
            .product-info {
              margin-top: 15px;
              font-size: 14px;
            }
            .product-name {
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 5px;
            }
            .barcode {
              font-family: monospace;
              font-size: 12px;
              margin-top: 5px;
            }
            .price {
              font-weight: bold;
              color: #2563eb;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrDataUrl}" alt="Código QR" />
            <div class="product-info">
              <div class="product-name">${product.name}</div>
              <div class="barcode">Código: ${product.barcode}</div>
              <div class="price">Precio: ${new Intl.NumberFormat("es-PY", {
                style: "currency",
                currency: "PYG",
                minimumFractionDigits: 0,
              }).format(product.price)}</div>
              <div style="font-size: 12px; color: #666; margin-top: 10px;">
                Categoría: ${product.category} | Stock: ${product.stock}
              </div>
            </div>
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Código QR del Producto
          </DialogTitle>
          <DialogDescription>Código QR generado para {product.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {product.category}
                </Badge>
                <span className="text-sm">Stock: {product.stock}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <canvas ref={canvasRef} className="mx-auto border rounded-lg" />
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>
                  <strong>Código:</strong> {product.barcode}
                </p>
                <p>
                  <strong>Precio:</strong>{" "}
                  {new Intl.NumberFormat("es-PY", {
                    style: "currency",
                    currency: "PYG",
                    minimumFractionDigits: 0,
                  }).format(product.price)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-center">
            <Button onClick={downloadQR} variant="outline" className="flex-1 bg-transparent">
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
            <Button onClick={printQR} variant="outline" className="flex-1 bg-transparent">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            El código QR contiene información del producto que puede ser escaneada por la aplicación POS
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
