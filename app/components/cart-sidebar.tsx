"use client"

import { useRouter } from "next/navigation"
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCart } from "../context/cart-context"

export default function CartSidebar() {
  const router = useRouter()
  const { cart, removeFromCart, updateQuantity, cartTotal, itemCount } = useCart()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleCheckout = () => {
    router.push("/checkout")
  }

  return (
    <div className="flex w-80 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="flex items-center text-lg font-semibold">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Carrito
        </h2>
        <span className="rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
          {itemCount} artículos
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <ShoppingCart className="mb-2 h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium">Tu carrito está vacío</h3>
            <p className="text-sm text-muted-foreground">Agrega productos para comenzar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
                  <img src={item.image || "/placeholder.svg"} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between">
                    <h3 className="font-medium line-clamp-1">{item.name}</h3>
                    <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.price)} c/u</p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 bg-transparent"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 bg-transparent"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <div className="mb-4 space-y-2">
          <div className="flex justify-between">
            <p>Subtotal</p>
            <p>{formatCurrency(cartTotal)}</p>
          </div>
          <div className="flex justify-between font-medium">
            <p>Total</p>
            <p>{formatCurrency(cartTotal)}</p>
          </div>
        </div>
        <Button className="w-full" size="lg" disabled={cart.length === 0} onClick={handleCheckout}>
          Proceder al Pago
        </Button>
      </div>
    </div>
  )
}
