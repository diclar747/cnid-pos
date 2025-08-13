"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, ArrowLeft, Receipt, Share2, Printer } from "lucide-react"
import { useCompany } from "../context/company-context"
import toast from "react-hot-toast"

interface SaleData {
  id: string
  date: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    image?: string
  }>
  total: number
  paymentMethod: string
  customerName: string
  customerRuc: string
  cashReceived: number
  change: number
}

export default function SuccessPage() {
  const [saleData, setSaleData] = useState<SaleData | null>(null)
  const router = useRouter()
  const { companyConfig } = useCompany()

  useEffect(() => {
    const savedSale = localStorage.getItem("lastSale")
    if (savedSale) {
      setSaleData(JSON.parse(savedSale))
    } else {
      router.push("/pos")
    }
  }, [router])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-PY", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const reprintTicket = () => {
    if (!saleData) return

    // Función igual a la del checkout
    const receiptContent = `
      <div style="width: 300px; font-family: monospace; font-size: 12px; line-height: 1.4;">
        <!-- Header -->
        <div style="text-center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
          <img src="${companyConfig.logo || "/placeholder.svg?height=60&width=150&text=LOGO"}" 
               alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 5px;" />
          <div style="font-weight: bold; font-size: 14px;">${companyConfig.name}</div>
          <div style="font-size: 10px; color: #666;">${companyConfig.slogan}</div>
          <div style="font-size: 10px; margin-top: 5px;">
            <div>RUC: ${companyConfig.ruc}</div>
            <div>${companyConfig.address}</div>
            <div>Tel: ${companyConfig.phone}</div>
            ${companyConfig.email ? `<div>Email: ${companyConfig.email}</div>` : ""}
            ${companyConfig.website ? `<div>Web: ${companyConfig.website}</div>` : ""}
          </div>
        </div>

        <!-- Sale Info -->
        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span>FACTURA #${saleData.id}</span>
            <span>${new Date(saleData.date).toLocaleDateString("es-PY")}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Hora:</span>
            <span>${new Date(saleData.date).toLocaleTimeString("es-PY")}</span>
          </div>
          ${
            saleData.customerName !== "Cliente General"
              ? `
            <div style="margin-top: 5px;">
              <div>Cliente: ${saleData.customerName}</div>
              ${saleData.customerRuc ? `<div>RUC: ${saleData.customerRuc}</div>` : ""}
            </div>
          `
              : ""
          }
        </div>

        <!-- Items -->
        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0;">
          ${saleData.items
            .map(
              (item) => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <div style="flex: 1;">
                <div style="font-weight: bold;">${item.name}</div>
                <div style="font-size: 10px; color: #666;">
                  ${item.quantity} x Gs ${item.price.toLocaleString("es-PY")}
                </div>
              </div>
              <div style="text-align: right; font-weight: bold;">
                Gs ${(item.price * item.quantity).toLocaleString("es-PY")}
              </div>
            </div>
          `,
            )
            .join("")}
        </div>

        <!-- Totals -->
        <div style="margin: 10px 0;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
            <span>TOTAL:</span>
            <span>Gs ${saleData.total.toLocaleString("es-PY")}</span>
          </div>
          ${
            saleData.paymentMethod === "cash"
              ? `
            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
              <span>Efectivo:</span>
              <span>Gs ${saleData.cashReceived.toLocaleString("es-PY")}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Cambio:</span>
              <span>Gs ${saleData.change.toLocaleString("es-PY")}</span>
            </div>
          `
              : `
            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
              <span>Método:</span>
              <span>${saleData.paymentMethod === "card" ? "Tarjeta" : "Digital"}</span>
            </div>
          `
          }
        </div>

        <!-- Footer -->
        <div style="text-center; font-size: 10px; color: #666; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px;">
          <div>¡Gracias por su compra!</div>
          <div>Conserve este comprobante</div>
          <div style="margin-top: 5px;">
            <strong>*** REIMPRESIÓN ***</strong>
          </div>
          <div style="margin-top: 5px;">
            Sistema HeroUI POS
          </div>
        </div>
      </div>
    `

    // Create a new window for printing
    const printWindow = window.open("", "_blank", "width=450,height=700")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Reimpresión Factura #${saleData.id}</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px;
                font-family: monospace;
              }
              .no-print {
                display: block;
                text-align: center;
                margin: 20px 0;
                padding: 10px;
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
              }
              .print-button {
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                margin: 5px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
              }
              .print-button:hover {
                background: #0056b3;
              }
              .close-button {
                background: #6c757d;
                color: white;
                border: none;
                padding: 10px 20px;
                margin: 5px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
              }
              .close-button:hover {
                background: #545b62;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="no-print">
              <h3>🔄 Reimpresión de Ticket</h3>
              <p style="font-size: 14px; color: #856404; margin: 10px 0;">
                Esta es una reimpresión del ticket original
              </p>
              <button class="print-button" onclick="window.print()">🖨️ Reimprimir Ticket</button>
              <button class="close-button" onclick="window.close()">❌ Cerrar</button>
            </div>
            ${receiptContent}
          </body>
        </html>
      `)
      printWindow.document.close()
      toast.success("Ticket abierto para reimpresión")
    }
  }

  const handleShare = async () => {
    if (navigator.share && saleData) {
      try {
        await navigator.share({
          title: "Recibo de Venta - CNID POS",
          text: `Venta #${saleData.id} completada por Gs ${saleData.total.toLocaleString("es-PY")}`,
          url: window.location.href,
        })
      } catch (error) {
        toast.error("Error al compartir")
      }
    } else {
      toast.success("Enlace copiado al portapapeles")
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (!saleData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-green-600">¡Venta Completada!</h1>
            <p className="text-muted-foreground">La transacción se ha procesado exitosamente</p>
          </div>
        </div>

        {/* Sale Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalles de la Venta
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              <p>Factura: #{saleData.id}</p>
              <p>Fecha: {formatDate(saleData.date)}</p>
              <p>Cliente: {saleData.customerName}</p>
              {saleData.customerRuc && <p>RUC: {saleData.customerRuc}</p>}
              <p>Método de Pago: {saleData.paymentMethod === "cash" ? "Efectivo" : saleData.paymentMethod === "card" ? "Tarjeta" : "Digital"}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            <div className="space-y-3">
              {saleData.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `/placeholder.svg?height=48&width=48&text=${encodeURIComponent(item.name)}`
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Gs {item.price.toLocaleString("es-PY")} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{item.quantity}</Badge>
                    <p className="font-medium text-sm mt-1">Gs {(item.price * item.quantity).toLocaleString("es-PY")}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Payment Details */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-green-600">Gs {saleData.total.toLocaleString("es-PY")}</span>
              </div>
              
              {saleData.paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Efectivo Recibido:</span>
                    <span>Gs {saleData.cashReceived.toLocaleString("es-PY")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cambio:</span>
                    <span>Gs {saleData.change.toLocaleString("es-PY")}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button onClick={() => router.push("/pos")} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
          <Button onClick={reprintTicket} variant="outline" className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Reimprimir Ticket
          </Button>
          <Button onClick={handleShare} variant="outline" className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="flex-1">
            <Receipt className="h-4 w-4 mr-2" />
            Imprimir Página
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Gracias por usar CNID POS</p>
          <p>¡Esperamos verte pronto!</p>
        </div>
      </div>
    </div>
  )
}
