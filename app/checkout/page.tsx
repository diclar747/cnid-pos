"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CreditCard, User, Phone, FileText } from "lucide-react"
import { useCart } from "../context/cart-context"
import { useSales } from "../context/sales-context"
import toast from "react-hot-toast"

export default function CheckoutPage() {
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { cart, getCartTotal, clearCart } = useCart()
  const { addSale } = useSales()
  const router = useRouter()

  const subtotal = getCartTotal()
  const tax = subtotal * 0.1
  const total = subtotal + tax

  useEffect(() => {
    if (!cart || cart.length === 0) {
      router.push("/pos")
    }
  }, [cart, router])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName.trim()) {
      toast.error("Por favor ingresa el nombre del cliente")
      return
    }

    setIsProcessing(true)

    try {
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create sale record
      addSale({
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        total,
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        date: new Date().toISOString(),
        status: "completed",
      })

      // Store order data for success page
      const orderData = {
        items: cart,
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          notes: notes.trim(),
        },
        totals: {
          subtotal,
          tax,
          total,
        },
        timestamp: new Date().toISOString(),
      }

      localStorage.setItem("lastOrder", JSON.stringify(orderData))

      // Clear cart
      clearCart()

      toast.success("¡Venta procesada exitosamente!")
      router.push("/success")
    } catch (error) {
      toast.error("Error al procesar la venta")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/pos")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Finalizar Venta</h1>
            <p className="text-muted-foreground">Completa los datos para procesar la venta</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">
                    Nombre del Cliente <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    placeholder="Nombre completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customerPhone"
                      placeholder="+595 21 123-456"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="notes"
                      placeholder="Instrucciones especiales, descuentos, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="pl-10 min-h-[100px] resize-none"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Procesando Venta...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Procesar Venta - {formatPrice(total)}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cart.map((item) => (
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
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA (10%):</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Información de Pago</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• Efectivo</p>
                  <p>• Tarjeta de débito/crédito</p>
                  <p>• Transferencia bancaria</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
