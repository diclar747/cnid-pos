"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, Wallet, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCart } from "../context/cart-context"
import { useSales } from "../context/sales-context"
import { useAuth } from "../context/auth-context"

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, cartTotal, clearCart, updateStock } = useCart()
  const { addSale } = useSales()
  const { user } = useAuth()
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card")
  const [customerData, setCustomerData] = useState({
    name: "",
    ruc: "",
    address: "",
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const tax = cartTotal * 0.1
  const grandTotal = cartTotal + tax

  const handlePayment = () => {
    // Registrar la venta
    const receiptNumber = Math.floor(100000 + Math.random() * 900000).toString()

    const saleData = {
      items: cart.map((item) => ({
        product: item,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      })),
      subtotal: cartTotal,
      tax: tax,
      total: grandTotal,
      paymentMethod: paymentMethod,
      cashier: user?.name || "Usuario",
      date: new Date().toISOString(),
      receiptNumber: receiptNumber,
      customerName: customerData.name || undefined,
      customerRuc: customerData.ruc || undefined,
      customerAddress: customerData.address || undefined,
    }

    addSale(saleData)

    // Actualizar stock de productos
    cart.forEach((item) => {
      updateStock(item.id, item.stock - item.quantity)
    })

    // Ir a la página de éxito
    router.push("/success")
  }

  if (cart.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
          <p className="mt-2 text-muted-foreground">Agrega algunos productos antes de proceder al pago</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Volver al POS
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al POS
      </Button>

      <h1 className="mb-6 text-3xl font-bold">Procesar Pago</h1>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Datos del cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Datos del Cliente
            </CardTitle>
            <CardDescription>Información para la factura (opcional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customerName">Nombre/Razón Social</Label>
              <Input
                id="customerName"
                value={customerData.name}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <Label htmlFor="customerRuc">RUC/CI</Label>
              <Input
                id="customerRuc"
                value={customerData.ruc}
                onChange={(e) => setCustomerData({ ...customerData, ruc: e.target.value })}
                placeholder="12345678-9"
              />
            </div>
            <div>
              <Label htmlFor="customerAddress">Dirección</Label>
              <Input
                id="customerAddress"
                value={customerData.address}
                onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                placeholder="Av. España 123"
              />
            </div>
          </CardContent>
        </Card>

        {/* Resumen del pedido */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between">
                <p>Subtotal</p>
                <p>{formatCurrency(cartTotal)}</p>
              </div>
              <div className="flex justify-between">
                <p>IVA (10%)</p>
                <p>{formatCurrency(tax)}</p>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <p>Total</p>
                <p>{formatCurrency(grandTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Método de pago */}
        <Card>
          <CardHeader>
            <CardTitle>Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={(value: "card" | "cash") => setPaymentMethod(value)}>
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Tarjeta de Crédito/Débito
                </Label>
              </div>

              <div className="mt-3 flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center">
                  <Wallet className="mr-2 h-4 w-4" />
                  Efectivo
                </Label>
              </div>
            </RadioGroup>

            <Button className="mt-6 w-full" size="lg" onClick={handlePayment}>
              Completar Pago - {formatCurrency(grandTotal)}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
