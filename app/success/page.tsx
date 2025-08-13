"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Printer, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCart } from "../context/cart-context"
import { useSales } from "../context/sales-context"
import { useCompany } from "../context/company-context"

export default function SuccessPage() {
  const router = useRouter()
  const { clearCart } = useCart()
  const { getLastSale } = useSales()
  const { companyConfig } = useCompany()
  const [sale, setSale] = useState(getLastSale())

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  useEffect(() => {
    const lastSale = getLastSale()
    if (!lastSale) {
      router.push("/")
    } else {
      setSale(lastSale)
    }
  }, [getLastSale, router])

  const handleBackToPOS = () => {
    clearCart()
    router.push("/")
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // En una implementación real, aquí generarías un PDF
    alert("Función de descarga PDF próximamente disponible")
  }

  if (!sale) {
    return null
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="rounded-lg border bg-white shadow-lg print:shadow-none print:border-none">
        {/* Mensaje de éxito - solo en pantalla */}
        <div className="text-center p-6 print:hidden">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-green-600">¡Pago Exitoso!</h1>
          <p className="text-muted-foreground">La transacción se ha completado correctamente</p>
        </div>

        {/* Factura completa */}
        <div className="p-8 print:p-4">
          {/* Header de la empresa */}
          <div className="text-center border-b-2 border-gray-300 pb-6 mb-6">
            <img
              src={companyConfig.logo || "/placeholder.svg"}
              alt="Logo"
              className="mx-auto mb-4 max-h-20 object-contain"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=80&width=200&text=LOGO"
              }}
            />
            <h1 className="text-2xl font-bold text-gray-800">{companyConfig.name}</h1>
            <p className="text-sm text-gray-600 italic">{companyConfig.slogan}</p>
            <div className="mt-3 text-sm text-gray-700 space-y-1">
              <p>
                <strong>RUC:</strong> {companyConfig.ruc}
              </p>
              <p>{companyConfig.address}</p>
              <p>
                <strong>Tel:</strong> {companyConfig.phone}
              </p>
              {companyConfig.email && (
                <p>
                  <strong>Email:</strong> {companyConfig.email}
                </p>
              )}
              {companyConfig.website && (
                <p>
                  <strong>Web:</strong> {companyConfig.website}
                </p>
              )}
            </div>
          </div>

          {/* Información de la factura */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">FACTURA</h2>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Número:</strong> #{sale.receiptNumber}
                </p>
                <p>
                  <strong>Fecha:</strong> {new Date(sale.date).toLocaleString("es-PY")}
                </p>
                <p>
                  <strong>Cajero:</strong> {sale.cashier}
                </p>
                <p>
                  <strong>Método de Pago:</strong>{" "}
                  <span className="capitalize">{sale.paymentMethod === "card" ? "Tarjeta" : "Efectivo"}</span>
                </p>
              </div>
            </div>

            {/* Datos del cliente */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">CLIENTE</h3>
              <div className="text-sm space-y-1">
                {sale.customerName ? (
                  <>
                    <p>
                      <strong>Nombre:</strong> {sale.customerName}
                    </p>
                    {sale.customerRuc && (
                      <p>
                        <strong>RUC/CI:</strong> {sale.customerRuc}
                      </p>
                    )}
                    {sale.customerAddress && (
                      <p>
                        <strong>Dirección:</strong> {sale.customerAddress}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">Consumidor Final</p>
                )}
              </div>
            </div>
          </div>

          {/* Detalle de productos */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">DETALLE DE PRODUCTOS</h3>
            <div className="border border-gray-300">
              <div className="bg-gray-100 grid grid-cols-12 gap-2 p-3 text-sm font-bold">
                <div className="col-span-1">Cant.</div>
                <div className="col-span-6">Descripción</div>
                <div className="col-span-2 text-right">Precio Unit.</div>
                <div className="col-span-3 text-right">Subtotal</div>
              </div>
              {sale.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-3 text-sm border-t border-gray-200">
                  <div className="col-span-1">{item.quantity}</div>
                  <div className="col-span-6">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{item.product.description}</p>
                  </div>
                  <div className="col-span-2 text-right">{formatCurrency(item.product.price)}</div>
                  <div className="col-span-3 text-right font-medium">{formatCurrency(item.subtotal)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (10%):</span>
                  <span>{formatCurrency(sale.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center border-t-2 border-gray-300 pt-4 text-sm text-gray-600">
            <p className="font-semibold">¡Gracias por su compra!</p>
            <p>Conserve este comprobante para cualquier reclamo</p>
            <p className="mt-2 text-xs">
              Esta factura es válida como comprobante de compra según las normativas vigentes
            </p>
          </div>
        </div>

        {/* Botones de acción - solo en pantalla */}
        <div className="p-6 border-t bg-gray-50 print:hidden">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handlePrint} variant="outline" className="flex-1 bg-transparent">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Factura
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" className="flex-1 bg-transparent">
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
            <Button onClick={handleBackToPOS} className="flex-1">
              Volver al POS
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
