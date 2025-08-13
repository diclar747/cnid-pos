"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, DollarSign, Smartphone, Receipt, Search, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useCart } from "../context/cart-context"
import { useCompany } from "../context/company-context"
import { useSales } from "../context/sales-context"
import { consultarRuc, formatRuc, type RucResponse } from "@/lib/ruc-service"
import toast from "react-hot-toast"

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, clearCart, getCartTotal } = useCart()
  const { companyConfig } = useCompany()
  const { addSale } = useSales()
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [cashReceived, setCashReceived] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerRuc, setCustomerRuc] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isConsultingRuc, setIsConsultingRuc] = useState(false)
  const [rucData, setRucData] = useState<RucResponse | null>(null)
  const [rucValidated, setRucValidated] = useState(false)

  const total = getCartTotal()
  const cashAmount = Number.parseFloat(cashReceived) || 0
  const change = cashAmount - total

  useEffect(() => {
    if (!cart || cart.length === 0) {
      router.push("/pos")
    }
  }, [cart, router])

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
          toast.warning(`Atención: El RUC está ${result.data.status}`)
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
    if (paymentMethod === "cash" && cashAmount < total) {
      toast.error("El monto recibido es insuficiente")
      return
    }

    setIsProcessing(true)

    try {
      // Create sale record
      const saleData = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        items: cart || [],
        total,
        paymentMethod,
        customerName: customerName || "Cliente General",
        customerRuc: customerRuc || "",
        cashReceived: paymentMethod === "cash" ? cashAmount : total,
        change: paymentMethod === "cash" ? change : 0,
      }

      addSale(saleData)

      // Save sale data for success page
      localStorage.setItem("lastSale", JSON.stringify(saleData))

      // Generate and print receipt
      await generateReceipt(saleData)

      // Clear cart and redirect
      clearCart()
      router.push("/success")

      toast.success("Venta procesada exitosamente")
    } catch (error) {
      toast.error("Error al procesar la venta")
      console.error("Payment error:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const generateReceipt = async (saleData: any, autoClose = false) => {
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
              (item: any) => `
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
            <title>Factura #${saleData.id}</title>
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
                background: #f0f0f0;
                border: 1px solid #ccc;
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
              <h3>Vista Previa del Ticket</h3>
              <button class="print-button" onclick="window.print()">🖨️ Imprimir Ticket</button>
              <button class="close-button" onclick="window.close()">❌ Cerrar</button>
              <p style="font-size: 12px; color: #666;">
                El ticket se imprimirá cuando hagas clic en "Imprimir Ticket"
              </p>
            </div>
            ${receiptContent}
            ${autoClose ? `
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              }
            </script>
            ` : ''}
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  if (!cart || cart.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
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
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="flex items-center cursor-pointer">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Efectivo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center cursor-pointer">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Tarjeta
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="digital" id="digital" />
                    <Label htmlFor="digital" className="flex items-center cursor-pointer">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Pago Digital
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Cash Payment Details */}
              {paymentMethod === "cash" && (
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
                disabled={isProcessing || (paymentMethod === "cash" && cashAmount < total)}
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
