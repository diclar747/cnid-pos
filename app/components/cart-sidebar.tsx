"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Plus, Minus, Trash2, X, User } from "lucide-react"
import { useCart } from "../context/cart-context"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface CartSidebarProps {
  onClose?: () => void
}

export default function CartSidebar({ onClose }: CartSidebarProps) {
  const { cart, updateQuantity, removeFromCart, clearCart, getCartTotal } = useCart()
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const subtotal = getCartTotal()
  const tax = subtotal * 0.1 // 10% IVA
  const total = subtotal + tax

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      toast.success("Producto eliminado del carrito")
    } else {
      updateQuantity(productId, newQuantity)
    }
  }

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      toast.error("Por favor ingresa el nombre del cliente")
      return
    }

    if (!cart || cart.length === 0) {
      toast.error("El carrito está vacío")
      return
    }

    setIsProcessing(true)

    try {
      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Store order data for success page
      const orderData = {
        items: cart,
        customer: {
          name: customerName,
          phone: customerPhone,
          notes,
        },
        totals: {
          subtotal,
          tax,
          total,
        },
        timestamp: new Date().toISOString(),
      }

      localStorage.setItem("lastOrder", JSON.stringify(orderData))

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
      <div className="h-full flex flex-col">
        {onClose && (
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Carrito</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">Carrito vacío</h3>
              <p className="text-sm text-muted-foreground">Agrega productos para comenzar una venta</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Carrito</h2>
          <Badge variant="secondary">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</Badge>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = `/placeholder.svg?height=64&width=64&text=${encodeURIComponent(item.name)}`
                }}
              />

              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <p className="text-xs text-muted-foreground">{formatPrice(item.price)} c/u</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-transparent"
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-transparent"
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{formatPrice(item.price * item.quantity)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        removeFromCart(item.id)
                        toast.success("Producto eliminado")
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Customer Info */}
      <div className="border-t p-4 space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Información del Cliente
        </h3>

        <div className="space-y-3">
          <div>
            <Label htmlFor="customerName" className="text-xs">
              Nombre (requerido)
            </Label>
            <Input
              id="customerName"
              placeholder="Nombre del cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <Label htmlFor="customerPhone" className="text-xs">
              Teléfono
            </Label>
            <Input
              id="customerPhone"
              placeholder="Número de teléfono"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-xs">
              Notas
            </Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="border-t p-4 space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (10%):</span>
            <span>{formatPrice(tax)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <Button onClick={handleCheckout} disabled={isProcessing || !customerName.trim()} className="w-full" size="lg">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Procesando...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Procesar Venta
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
