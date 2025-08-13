"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, ShoppingCart, Trash2, CreditCard, User, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCart } from "../context/cart-context"
import { toast } from "react-hot-toast"

interface CartSidebarProps {
  onClose?: () => void
}

export default function CartSidebar({ onClose }: CartSidebarProps) {
  const router = useRouter()
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart()
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      toast.success("Producto eliminado del carrito")
    } else {
      updateQuantity(productId, newQuantity)
    }
  }

  const handleRemoveItem = (productId: number, productName: string) => {
    removeFromCart(productId)
    toast.success(`${productName} eliminado del carrito`)
  }

  const handleClearCart = () => {
    clearCart()
    setCustomerName("")
    setCustomerPhone("")
    setNotes("")
    toast.success("Carrito vaciado")
  }

  const handleCheckout = async () => {
    if (!cart || cart.length === 0) {
      toast.error("El carrito está vacío")
      return
    }

    if (!customerName.trim()) {
      toast.error("Por favor ingresa el nombre del cliente")
      return
    }

    setIsProcessing(true)

    try {
      // Simular procesamiento de pago
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Crear orden
      const order = {
        id: Date.now().toString(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cart,
        total: cartTotal,
        notes: notes.trim(),
        date: new Date().toISOString(),
        status: "completed",
      }

      // Limpiar carrito y formulario
      clearCart()
      setCustomerName("")
      setCustomerPhone("")
      setNotes("")

      toast.success("¡Venta procesada exitosamente!")

      // Cerrar sidebar móvil si existe
      if (onClose) {
        onClose()
      }

      // Redirigir a página de éxito
      router.push(`/success?orderId=${order.id}&total=${order.total}`)
    } catch (error) {
      toast.error("Error al procesar la venta")
    } finally {
      setIsProcessing(false)
    }
  }

  // Estado vacío del carrito
  if (!cart || cart.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Carrito vacío</h3>
          <p className="text-muted-foreground text-sm">
            Agrega productos desde el catálogo para comenzar una nueva venta
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header del carrito */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold">Carrito</span>
            <Badge variant="secondary">{itemCount} items</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearCart}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lista de productos */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.name}
                className="w-12 h-12 object-cover rounded-md"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = `/placeholder.svg?height=48&width=48&text=${encodeURIComponent(item.name.charAt(0))}`
                }}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.name}</h4>
                <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} c/u</p>
              </div>
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
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-right">
                <p className="font-medium text-sm">{formatCurrency(item.price * item.quantity)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveItem(item.id, item.name)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Información del cliente */}
      <div className="p-4 border-t space-y-4 bg-card">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4" />
          <span className="font-medium text-sm">Información del Cliente</span>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="customerName" className="text-xs">
              Nombre del Cliente *
            </Label>
            <Input
              id="customerName"
              placeholder="Nombre completo"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="customerPhone" className="text-xs">
              Teléfono (opcional)
            </Label>
            <Input
              id="customerPhone"
              placeholder="Número de teléfono"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="text-xs flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Notas adicionales
            </Label>
            <Textarea
              id="notes"
              placeholder="Instrucciones especiales, descuentos, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-16 text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {/* Total y checkout */}
      <div className="p-4 border-t bg-muted/30">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Subtotal:</span>
            <span className="font-medium">{formatCurrency(cartTotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">IVA (10%):</span>
            <span className="font-medium">{formatCurrency(cartTotal * 0.1)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total:</span>
            <span className="font-bold text-lg text-primary">{formatCurrency(cartTotal * 1.1)}</span>
          </div>

          <Button
            className="w-full"
            onClick={handleCheckout}
            disabled={isProcessing || !cart || cart.length === 0 || !customerName.trim()}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {isProcessing ? "Procesando..." : "Procesar Venta"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {cart?.length || 0} productos • Total con IVA incluido
          </p>
        </div>
      </div>
    </div>
  )
}
