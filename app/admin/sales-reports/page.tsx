"use client"

import { useState, useMemo } from "react"
import { TrendingUp, DollarSign, ShoppingCart, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSales } from "../../context/sales-context"
import { businessDateKey } from "@/lib/business-date"

export default function SalesReportsPage() {
  const { sales, expenses, getTotalSales, getTotalExpenses, getSalesByDate, getExpensesByDate } = useSales()
  const [startDate, setStartDate] = useState(businessDateKey(new Date()))
  const [endDate, setEndDate] = useState(businessDateKey(new Date()))
  const [reportType, setReportType] = useState("daily")
  const [visibleSales, setVisibleSales] = useState(100)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const reportData = useMemo(() => {
    const filteredSales = getSalesByDate(startDate, endDate)
    const filteredExpenses = getExpensesByDate(startDate, endDate)

    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0)
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const profit = totalSales - totalExpenses

    // Agrupar ventas por producto
    const productSales = new Map()
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const productName = item.product.name
        if (productSales.has(productName)) {
          const existing = productSales.get(productName)
          productSales.set(productName, {
            ...existing,
            quantity: existing.quantity + item.quantity,
            total: existing.total + item.subtotal,
          })
        } else {
          productSales.set(productName, {
            name: productName,
            quantity: item.quantity,
            total: item.subtotal,
            price: item.product.price,
          })
        }
      })
    })

    // Agrupar gastos por categoría
    const expensesByCategory = new Map()
    filteredExpenses.forEach((expense) => {
      if (expensesByCategory.has(expense.category)) {
        expensesByCategory.set(expense.category, expensesByCategory.get(expense.category) + expense.amount)
      } else {
        expensesByCategory.set(expense.category, expense.amount)
      }
    })

    return {
      totalSales,
      totalExpenses,
      profit,
      salesCount: filteredSales.length,
      productSales: Array.from(productSales.values()).sort((a, b) => b.total - a.total),
      expensesByCategory: Array.from(expensesByCategory.entries()).sort((a, b) => b[1] - a[1]),
      dailySales: filteredSales,
    }
  }, [startDate, endDate, getSalesByDate, getExpensesByDate])

  const handleExportReport = () => {
    const reportContent = `
REPORTE DE VENTAS
Período: ${startDate} al ${endDate}

RESUMEN FINANCIERO:
- Ventas Totales: ${formatCurrency(reportData.totalSales)}
- Gastos Totales: ${formatCurrency(reportData.totalExpenses)}
- Ventas menos gastos registrados: ${formatCurrency(reportData.profit)}
- Número de Ventas: ${reportData.salesCount}

PRODUCTOS MÁS VENDIDOS:
${reportData.productSales
  .slice(0, 10)
  .map(
    (product, index) =>
      `${index + 1}. ${product.name} - ${product.quantity} unidades - ${formatCurrency(product.total)}`,
  )
  .join("\n")}

GASTOS POR CATEGORÍA:
${reportData.expensesByCategory.map(([category, amount]) => `- ${category}: ${formatCurrency(amount)}`).join("\n")}
    `

    const blob = new Blob([reportContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte-ventas-${startDate}-${endDate}.txt`
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
          <h1 className="text-3xl font-bold">Reportes de Ventas</h1>
          <p className="text-muted-foreground">Análisis de ventas y gastos registrados</p>
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

      {/* Resumen financiero */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalSales)}</div>
            <p className="text-xs text-muted-foreground">{reportData.salesCount} transacciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(reportData.totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance registrado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${reportData.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(reportData.profit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ventas menos gastos cargados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reportData.salesCount > 0 ? reportData.totalSales / reportData.salesCount : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Productos más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>Top 10 productos por ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.productSales.slice(0, 10).map((product, index) => (
                <div key={product.name} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {index + 1}. {product.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{product.quantity} unidades vendidas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(product.total)}</p>
                  </div>
                </div>
              ))}
              {reportData.productSales.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No hay datos de productos</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gastos por categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
            <CardDescription>Distribución de gastos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.expensesByCategory.map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium capitalize">{category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{formatCurrency(amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {reportData.totalExpenses > 0 ? ((amount / reportData.totalExpenses) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              ))}
              {reportData.expensesByCategory.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No hay gastos registrados</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalle de ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Ventas</CardTitle>
          <CardDescription>Mostrando {Math.min(visibleSales, reportData.dailySales.length)} de {reportData.dailySales.length} transacciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.dailySales
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, visibleSales)
              .map((sale) => (
                <div key={sale.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">Ticket #{sale.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.date).toLocaleString("es-PY")} - {sale.userName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(sale.total)}</p>
                      <p className="text-sm text-muted-foreground capitalize">{sale.paymentMethod}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Productos: {sale.items.map((item) => `${item.product.name} (${item.quantity})`).join(", ")}</p>
                  </div>
                </div>
              ))}
            {reportData.dailySales.length > visibleSales && <Button variant="outline" className="w-full" onClick={() => setVisibleSales((count) => count + 100)}>Ver 100 ventas más</Button>}
            {reportData.dailySales.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No hay ventas en el período seleccionado</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
