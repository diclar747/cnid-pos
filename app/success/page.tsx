"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, ArrowLeft, Receipt, Share2, Printer } from "lucide-react"
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
  paymentMethodName?: string
  customerName: string
  customerRuc: string
  cashReceived: number
  change: number
}

export default function SuccessPage() {
  const [saleData, setSaleData] = useState<SaleData | null>(null)
  const router = useRouter()

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

  // Reimpresión con la página de ticket de 75 mm (mismo formato que en caja).
  const reprintTicket = () => {
    if (!saleData) return
    window.open(`/receipt/sale/${saleData.id}`, "_blank")
  }

  const handleShare = async () => {
    if (navigator.share && saleData) {
      try {
        await navigator.share({
          title: "Recibo de Venta - RestoPOS",
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
              <p>Método de Pago: {saleData.paymentMethodName || (saleData.paymentMethod === "cash" ? "Efectivo" : saleData.paymentMethod === "card" ? "Tarjeta" : "Digital")}</p>
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
          <p>Gracias por usar RestoPOS</p>
          <p>¡Esperamos verte pronto!</p>
        </div>
      </div>
    </div>
  )
}
