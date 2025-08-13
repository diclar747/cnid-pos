"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ShoppingCart, X, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCart } from "../context/cart-context"

interface CartSidebarProps {
  onClose?: () => void
}

export default function CartSidebar({ onClose }: CartSidebarProps) {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart()
  const router = useRouter()
  const [isClearing, setIsClearing] = useState(false)

  const total = getCartTotal()
  const itemCount = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id)
    } else {
      updateQuantity(id, newQuantity)
    }
  }

  const handleClearCart = () => {
    setIsClearing(true)
    setTimeout(() => {
      clearCart()
      setIsClearing(false)
    }, 300)
  }

  const handleCheckout = () => {
    if (cart && cart.length > 0) {
      router.push("/checkout")
      onClose?.()
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Carrito</h2>
            {itemCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {itemCount}
              </Badge>
            )}
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {!cart || cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground mt-2">Agrega productos para comenzar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm leading-tight mb-1">{item.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">Gs {item.price.toLocaleString("es-PY")} c/u</p>

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
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 bg-transparent"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="text-right mt-2">
                        <span className="font-semibold text-sm">
                          Gs {(item.price * item.quantity).toLocaleString("es-PY")}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {cart && cart.length > 0 && (
        <div className="border-t p-4 space-y-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total:</span>
            <span>Gs {total.toLocaleString("es-PY")}</span>
          </div>

          <div className="space-y-2">
            <Button onClick={handleCheckout} className="w-full" size="lg">
              <Receipt className="h-4 w-4 mr-2" />
              Proceder al Pago
            </Button>

            <Button variant="outline" onClick={handleClearCart} disabled={isClearing} className="w-full bg-transparent">
              <Trash2 className="h-4 w-4 mr-2" />
              {isClearing ? "Limpiando..." : "Limpiar Carrito"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
