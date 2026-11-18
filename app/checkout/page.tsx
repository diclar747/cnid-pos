"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, DollarSign, Smartphone, Receipt, Search, CheckCircle, AlertCircle, QrCode, Wallet, Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useCart } from "../context/cart-context"
import { useAuth } from "../context/auth-context"
import { useSales } from "../context/sales-context"
import { consultarRuc, formatRuc, type RucResponse } from "@/lib/ruc-service"
import toast from "react-hot-toast"
import { apiRequest } from "@/lib/api-client"
import type { ServiceOrder } from "@/lib/service-order-types"

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, clearCart, getCartTotal, orderType } = useCart()
  const { user } = useAuth()
  const { addSale } = useSales()
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [cashReceived, setCashReceived] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerRuc, setCustomerRuc] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isConsultingRuc, setIsConsultingRuc] = useState(false)
  const [rucData, setRucData] = useState<RucResponse | null>(null)
  const [rucValidated, setRucValidated] = useState(false)
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null)
  const [orderLoading, setOrderLoading] = useState(true)
  const [methods, setMethods] = useState<{ code: string; name: string; kind: string; needsVerification: boolean }[]>([])
  const [cashOpen, setCashOpen] = useState(true)
  const [paymentReference, setPaymentReference] = useState("")
  const selectedMethod = methods.find((method) => method.code === paymentMethod)
  const isCash = (selectedMethod?.kind ?? paymentMethod) === "cash"
  useEffect(() => {
    apiRequest<{ items: typeof methods; cashOpen: boolean }>("/api/payment-methods")
      .then((result) => { setMethods(result.items); setCashOpen(result.cashOpen) })
      .catch(() => setMethods([{ code: "cash", name: "Efectivo", kind: "cash", needsVerification: false }]))
  }, [])

  const total = serviceOrder ? serviceOrder.grandTotal : getCartTotal()
  const cashAmount = Number.parseFloat(cashReceived) || 0
  const change = cashAmount - total

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("order")
    if (value) {
      const id = Number(value)
      if (!Number.isSafeInteger(id) || id <= 0) { router.replace("/orders"); return }
      apiRequest<{ order: ServiceOrder }>(`/api/service-orders/${id}`)
        .then(({ order }) => {
          if (order.status !== "open" || order.items.length === 0) { router.replace("/orders"); return }
          setServiceOrder(order)
          setCustomerName(order.customerName)
        })
        .catch((error) => { toast.error(error.message); router.replace("/orders") })
        .finally(() => setOrderLoading(false))
    } else {
      setOrderLoading(false)
      if (!cart?.length) router.replace("/pos")
    }
  }, [router])

  const handleRucConsultation = async () => {
    if (!customerRuc.trim()) {
      toast.error("Ingrese un RUC válido")
      return
    }

    setIsConsultingRuc(true)
    setRucValidated(false)
    setRucData(null)

    try {
      const result = await consultarRuc(customerRuc)
      
      if (result.isValid && result.data) {
        setRucData(result.data)
        setCustomerName(result.data.name)
        setRucValidated(true)
        setCustomerRuc(formatRuc(customerRuc)) // Formatear el RUC
        
        toast.success(`RUC válido: ${result.data.name}`)
        
        if (result.data.status !== "ACTIVO") {
          toast(`Atención: El RUC está ${result.data.status}`)
        }
      } else {
        toast.error(result.error || "RUC no encontrado")
        setRucValidated(false)
      }
    } catch (error) {
      toast.error("Error al consultar el RUC")
      setRucValidated(false)
    } finally {
      setIsConsultingRuc(false)
    }
  }

  const handleRucChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomerRuc(value)
    
    // Reset validation cuando se cambia el RUC
    if (rucValidated) {
      setRucValidated(false)
      setRucData(null)
      if (!value.trim()) {
        setCustomerName("")
      }
    }
  }

  const handleRucKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRucConsultation()
    }
  }

  const handlePayment = async () => {
    if (isCash && cashAmount < total) {
      toast.error("El monto recibido es insuficiente")
      return
    }

    setIsProcessing(true)
    // Se abre antes de esperar al servidor para que el navegador no bloquee la ventana.
    const printWindow = window.open("", "_blank")

    try {
      // Create sale record
      const saleData = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        items: serviceOrder ? [] : cart || [],
        ...(serviceOrder ? { serviceOrderId: serviceOrder.id } : {}),
        total,
        paymentMethod,
        paymentReference,
        orderType: serviceOrder?.orderType ?? orderType,
        customerName: customerName || "Cliente General",
        customerRuc: customerRuc || "",
        cashReceived: isCash ? cashAmount : total,
        change: isCash ? change : 0,
      }

      const savedSale = await addSale(saleData)
      const receiptSale = {
        ...saleData,
        id: String(savedSale.id),
        date: savedSale.date,
        total: savedSale.total,
        cashReceived: savedSale.cashReceived,
        change: savedSale.change,
        paymentMethodName: selectedMethod?.name, paymentStatus: selectedMethod?.needsVerification ? "pending" : "confirmed",
        items: savedSale.items.map((item: any) => ({
          name: item.productName, quantity: item.quantity, price: item.price,
          selectedModifiers: item.modifiers ?? [],
        })),
      }

      // Save sale data for success page
      localStorage.setItem("lastSale", JSON.stringify(receiptSale))

      // Generate and print receipt
      try {
        openReceipt(printWindow, savedSale.id)
      } catch (printError) {
        console.error("Receipt print failed", printError)
        toast.error("Venta guardada; no se pudo imprimir el comprobante")
      }

      // Clear cart and redirect
      if (!serviceOrder) clearCart()
      else {
        if (user) sessionStorage.removeItem(`pos:activeOrder:${user.id}`)
        window.dispatchEvent(new Event("orders:changed"))
      }
      router.push("/success")

      toast.success("Venta procesada exitosamente")
    } catch (error) {
      printWindow?.close()
      toast.error("Error al procesar la venta")
      console.error("Payment error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  // El comprobante usa la página de impresión de 75 mm (mismo formato que la precuenta).
  const openReceipt = (printWindow: Window | null, saleId: number | string) => {
    const url = `/receipt/sale/${saleId}?auto=1`
    if (printWindow) printWindow.location.href = url
    else window.open(url, "_blank")
  }

  if (orderLoading || (!serviceOrder && (!cart || cart.length === 0))) {
    return null
  }

  const checkoutItems = serviceOrder
    ? serviceOrder.items.map((item) => ({ cartKey: item.lineId, name: item.productName, quantity: item.quantity,
      price: item.price, selectedModifiers: item.modifiers }))
    : cart

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">{serviceOrder ? `Cobrar orden #${serviceOrder.id}` : "Checkout"}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkoutItems.map((item) => (
                <div key={item.cartKey} className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    {item.selectedModifiers?.length > 0 && <p className="text-xs text-muted-foreground">{item.selectedModifiers.map((modifier) => modifier.name).join(", ")}</p>}
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x Gs {item.price.toLocaleString("es-PY")}
                    </p>
                  </div>
                  <div className="font-medium">Gs {(item.price * item.quantity).toLocaleString("es-PY")}</div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span>Gs {total.toLocaleString("es-PY")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Información de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerRuc">RUC del Cliente (Opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="customerRuc"
                      value={customerRuc}
                      onChange={handleRucChange}
                      onKeyDown={handleRucKeyDown}
                      placeholder="80000000-0"
                      className={rucValidated ? "border-green-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRucConsultation}
                      disabled={isConsultingRuc || !customerRuc.trim()}
                      className="px-3"
                    >
                      {isConsultingRuc ? (
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {rucValidated && rucData && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>RUC verificado - Estado: {rucData.status}</span>
                    </div>
                  )}
                  {customerRuc && !rucValidated && !isConsultingRuc && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Presiona Enter o haz clic en buscar para verificar el RUC</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="customerName">Nombre del Cliente</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={rucValidated ? "Nombre obtenido del RUC" : "Cliente General"}
                    disabled={rucValidated}
                    className={rucValidated ? "bg-muted" : ""}
                  />
                  {rucValidated && rucData && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">
                        Nombre obtenido automáticamente del RUC
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Payment Method */}
              <div>
                <Label className="text-base font-medium">Método de Pago</Label>
                {!cashOpen && <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" /><span>La caja está cerrada: la venta se registra igual, pero no entra en ningún arqueo. <Link href="/cash" className="font-semibold underline">Abrir caja</Link></span></div>}
                <RadioGroup value={paymentMethod} onValueChange={(value) => { setPaymentMethod(value); setPaymentReference("") }} className="mt-2 grid gap-2 sm:grid-cols-2">
                  {methods.map((method) => {
                    const Icon = method.kind === "cash" ? DollarSign : method.kind === "card" ? CreditCard : method.kind === "qr" ? QrCode : method.kind === "transfer" ? Smartphone : Wallet
                    return <Label key={method.code} htmlFor={`pay-${method.code}`} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition ${paymentMethod === method.code ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "hover:bg-muted"}`}>
                      <RadioGroupItem value={method.code} id={`pay-${method.code}`} />
                      <Icon className="h-4 w-4" /> <span className="flex-1">{method.name}</span>
                      {method.needsVerification && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">verificar</span>}
                    </Label>
                  })}
                </RadioGroup>
                {selectedMethod?.needsVerification && <div className="mt-3 space-y-1">
                  <Label htmlFor="paymentReference">Referencia o comprobante (opcional)</Label>
                  <Input id="paymentReference" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="N.º de operación, últimos dígitos…" maxLength={80} />
                  <p className="text-xs text-muted-foreground">El pago queda pendiente hasta que caja lo verifique en el banco o la billetera.</p>
                </div>}
              </div>

              {/* Cash Payment Details */}
              {isCash && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cashReceived">Monto Recibido</Label>
                    <Input
                      id="cashReceived"
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  {cashAmount > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span>Total:</span>
                        <span className="font-medium">Gs {total.toLocaleString("es-PY")}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Recibido:</span>
                        <span className="font-medium">Gs {cashAmount.toLocaleString("es-PY")}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Cambio:</span>
                        <span className={change >= 0 ? "text-green-600" : "text-red-600"}>
                          Gs {change.toLocaleString("es-PY")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Process Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={isProcessing || !selectedMethod || (isCash && cashAmount < total)}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  "Procesando..."
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Procesar Pago e Imprimir
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
