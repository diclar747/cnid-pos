"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, ArrowLeft, Receipt, Share2 } from "lucide-react"
import toast from "react-hot-toast"

interface OrderData {
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    image: string
  }>
  customer: {
    name: string
    phone?: string
    notes?: string
  }
  totals: {
    subtotal: number
    tax: number
    total: number
  }
  timestamp: string
}

export default function SuccessPage() {
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const router = useRouter()

  useEffect(() => {
    const savedOrder = localStorage.getItem("lastOrder")
    if (savedOrder) {
      setOrderData(JSON.parse(savedOrder))
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

  const handleShare = async () => {
    if (navigator.share && orderData) {
      try {
        await navigator.share({
          title: "Recibo de Venta - HeroUI POS",
          text: `Venta completada por ${formatPrice(orderData.totals.total)}`,
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

  if (!orderData) {
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

        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalles de la Venta
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              <p>Fecha: {formatDate(orderData.timestamp)}</p>
              <p>Cliente: {orderData.customer.name}</p>
              {orderData.customer.phone && <p>Teléfono: {orderData.customer.phone}</p>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items */}
            <div className="space-y-3">
              {orderData.items.map((item) => (
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
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{item.quantity}</Badge>
                    <p className="font-medium text-sm mt-1">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatPrice(orderData.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (10%):</span>
                <span>{formatPrice(orderData.totals.tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-green-600">{formatPrice(orderData.totals.total)}</span>
              </div>
            </div>

            {/* Customer Notes */}
            {orderData.customer.notes && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium text-sm mb-1">Notas:</h4>
                <p className="text-sm text-muted-foreground">{orderData.customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => router.push("/pos")} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
          <Button onClick={handleShare} variant="outline" className="flex-1 bg-transparent">
            <Share2 className="h-4 w-4 mr-2" />
            Compartir
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="flex-1">
            <Receipt className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Gracias por usar HeroUI POS</p>
          <p>¡Esperamos verte pronto!</p>
        </div>
      </div>
    </div>
  )
}
