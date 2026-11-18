"use client"

import { useState, useMemo } from "react"
import { ShoppingCart, DollarSign, Package, Download, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePurchases } from "../../context/purchases-context"
import { useCart } from "../../context/cart-context"
import { businessDateKey } from "@/lib/business-date"

export default function PurchasesPage() {
  const { purchases, getPurchasesByDate, getTotalPurchases } = usePurchases()
  const { products } = useCart()
  const [startDate, setStartDate] = useState(businessDateKey(new Date()))
  const [endDate, setEndDate] = useState(businessDateKey(new Date()))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const reportData = useMemo(() => {
    const filteredPurchases = getPurchasesByDate(startDate, endDate)
    const totalPurchases = filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0)

    // Agrupar compras por producto
    const purchasesByProduct = new Map()
    filteredPurchases.forEach((purchase) => {
      if (purchasesByProduct.has(purchase.productId)) {
        const existing = purchasesByProduct.get(purchase.productId)
        purchasesByProduct.set(purchase.productId, {
          ...existing,
          quantity: existing.quantity + purchase.quantity,
          total: existing.total + purchase.total,
        })
      } else {
        purchasesByProduct.set(purchase.productId, {
          productName: purchase.productName,
          quantity: purchase.quantity,
          total: purchase.total,
          unitPrice: purchase.unitPrice,
        })
      }
    })

    return {
      totalPurchases,
      purchasesCount: filteredPurchases.length,
      purchasesByProduct: Array.from(purchasesByProduct.values()).sort((a, b) => b.total - a.total),
      dailyPurchases: filteredPurchases,
    }
  }, [startDate, endDate, getPurchasesByDate])

  const handleExportReport = () => {
    const reportContent = `
REPORTE DE COMPRAS
Período: ${startDate} al ${endDate}

RESUMEN:
- Total de Compras: ${formatCurrency(reportData.totalPurchases)}
- Número de Compras: ${reportData.purchasesCount}

COMPRAS POR PRODUCTO:
${reportData.purchasesByProduct
  .slice(0, 10)
  .map(
    (product, index) =>
      `${index + 1}. ${product.productName} - ${product.quantity} unidades - ${formatCurrency(product.total)}`,
  )
  .join("\n")}

DETALLE DE COMPRAS:
${reportData.dailyPurchases
  .map(
    (purchase) =>
      `${new Date(purchase.date).toLocaleDateString("es-PY")} - ${purchase.productName} - ${
        purchase.quantity
      } unidades - ${formatCurrency(purchase.total)}`,
  )
  .join("\n")}
    `

    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte-compras-${startDate}-${endDate}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const setQuickDate = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)

    setStartDate(businessDateKey(start))
    setEndDate(businessDateKey(end))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reportes de Compras</h1>
          <p className="text-muted-foreground">Análisis detallado de compras e inventario</p>
        </div>
        <Button onClick={handleExportReport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar Reporte
        </Button>
      </div>

      {/* Filtros de fecha */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end space-x-2">
              <Button variant="outline" onClick={() => setQuickDate(0)}>
                Hoy
              </Button>
              <Button variant="outline" onClick={() => setQuickDate(7)}>
                7 días
              </Button>
              <Button variant="outline" onClick={() => setQuickDate(30)}>
                30 días
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de compras */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.totalPurchases)}</div>
            <p className="text-xs text-muted-foreground">{reportData.purchasesCount} transacciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Comprados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.purchasesByProduct.length}</div>
            <p className="text-xs text-muted-foreground">Diferentes productos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Compra</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                reportData.purchasesCount > 0 ? reportData.totalPurchases / reportData.purchasesCount : 0,
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Productos más comprados */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Comprados</CardTitle>
            <CardDescription>Top 10 productos por monto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.purchasesByProduct.slice(0, 10).map((product, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {index + 1}. {product.productName}
                    </p>
                    <p className="text-sm text-muted-foreground">{product.quantity} unidades compradas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(product.total)}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(product.unitPrice)} c/u</p>
                  </div>
                </div>
              ))}
              {reportData.purchasesByProduct.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No hay datos de compras</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumen por período */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Período</CardTitle>
            <CardDescription>Estadísticas generales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">Total Invertido</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">En compras</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {formatCurrency(reportData.totalPurchases)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Transacciones</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Número de compras</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{reportData.purchasesCount}</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-purple-900 dark:text-purple-100">Productos Únicos</p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Diferentes productos</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {reportData.purchasesByProduct.length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalle de compras */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Compras</CardTitle>
          <CardDescription>Listado completo de transacciones</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio Unitario</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.dailyPurchases
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{new Date(purchase.date).toLocaleDateString("es-PY")}</TableCell>
                    <TableCell className="font-medium">{purchase.productName}</TableCell>
                    <TableCell>{purchase.quantity}</TableCell>
                    <TableCell>{formatCurrency(purchase.unitPrice)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(purchase.total)}</TableCell>
                    <TableCell>{purchase.createdBy}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          {reportData.dailyPurchases.length === 0 && (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground mt-2">No hay compras en el período seleccionado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
