"use client"

import { useState, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import {
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  Users,
  Download,
  Filter,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePurchases } from "../../context/purchases-context"
import { useCart } from "../../context/cart-context"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C"]

export default function PurchasesDashboard() {
  const { purchases, getPurchasesByDate, getTotalPurchases } = usePurchases()
  const { products } = useCart()
  const [dateRange, setDateRange] = useState("30")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState("all")

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Calcular fechas basadas en el rango seleccionado
  const getDateRange = () => {
    const end = new Date()
    const start = new Date()

    if (dateRange === "custom" && startDate && endDate) {
      return { start: startDate, end: endDate }
    }

    switch (dateRange) {
      case "7":
        start.setDate(start.getDate() - 7)
        break
      case "30":
        start.setDate(start.getDate() - 30)
        break
      case "90":
        start.setDate(start.getDate() - 90)
        break
      case "365":
        start.setDate(start.getDate() - 365)
        break
      default:
        start.setDate(start.getDate() - 30)
    }

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    }
  }

  const { start, end } = getDateRange()
  const filteredPurchases = getPurchasesByDate(start, end).filter(
    (purchase) => selectedSupplier === "all" || purchase.supplier === selectedSupplier,
  )

  // Datos para gráficos
  const dashboardData = useMemo(() => {
    // Compras por día
    const dailyPurchases = new Map()
    filteredPurchases.forEach((purchase) => {
      const date = new Date(purchase.date).toLocaleDateString("es-PY")
      if (dailyPurchases.has(date)) {
        dailyPurchases.set(date, dailyPurchases.get(date) + purchase.total)
      } else {
        dailyPurchases.set(date, purchase.total)
      }
    })

    const dailyData = Array.from(dailyPurchases.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Últimos 30 días

    // Compras por producto
    const productPurchases = new Map()
    filteredPurchases.forEach((purchase) => {
      if (productPurchases.has(purchase.productName)) {
        const existing = productPurchases.get(purchase.productName)
        productPurchases.set(purchase.productName, {
          name: purchase.productName,
          total: existing.total + purchase.total,
          quantity: existing.quantity + purchase.quantity,
        })
      } else {
        productPurchases.set(purchase.productName, {
          name: purchase.productName,
          total: purchase.total,
          quantity: purchase.quantity,
        })
      }
    })

    const productData = Array.from(productPurchases.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // Compras por proveedor
    const supplierPurchases = new Map()
    filteredPurchases.forEach((purchase) => {
      const supplier = purchase.supplier || "Sin proveedor"
      if (supplierPurchases.has(supplier)) {
        supplierPurchases.set(supplier, supplierPurchases.get(supplier) + purchase.total)
      } else {
        supplierPurchases.set(supplier, purchase.total)
      }
    })

    const supplierData = Array.from(supplierPurchases.entries()).map(([name, value]) => ({ name, value }))

    // Métricas generales
    const totalAmount = filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0)
    const totalQuantity = filteredPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0)
    const uniqueProducts = new Set(filteredPurchases.map((p) => p.productId)).size
    const uniqueSuppliers = new Set(filteredPurchases.map((p) => p.supplier || "Sin proveedor")).size
    const averagePurchase = filteredPurchases.length > 0 ? totalAmount / filteredPurchases.length : 0

    // Comparación con período anterior
    const previousStart = new Date(start)
    const previousEnd = new Date(end)
    const daysDiff = Math.ceil((previousEnd.getTime() - previousStart.getTime()) / (1000 * 60 * 60 * 24))
    previousStart.setDate(previousStart.getDate() - daysDiff)
    previousEnd.setDate(previousEnd.getDate() - daysDiff)

    const previousPurchases = getPurchasesByDate(
      previousStart.toISOString().split("T")[0],
      previousEnd.toISOString().split("T")[0],
    )
    const previousTotal = previousPurchases.reduce((sum, purchase) => sum + purchase.total, 0)
    const growthRate = previousTotal > 0 ? ((totalAmount - previousTotal) / previousTotal) * 100 : 0

    return {
      dailyData,
      productData,
      supplierData,
      metrics: {
        totalAmount,
        totalQuantity,
        uniqueProducts,
        uniqueSuppliers,
        averagePurchase,
        growthRate,
        purchaseCount: filteredPurchases.length,
      },
    }
  }, [filteredPurchases, start, end, getPurchasesByDate])

  // Obtener lista de proveedores únicos
  const suppliers = Array.from(new Set(purchases.map((p) => p.supplier).filter(Boolean)))

  const handleExport = () => {
    const reportData = {
      period: `${start} al ${end}`,
      metrics: dashboardData.metrics,
      dailyData: dashboardData.dailyData,
      productData: dashboardData.productData,
      supplierData: dashboardData.supplierData,
    }

    const dataStr = JSON.stringify(reportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `dashboard-compras-${start}-${end}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Dashboard de Compras
          </h1>
          <p className="text-muted-foreground">Análisis visual de compras y proveedores</p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar Datos
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Período</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="365">Último año</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div>
                  <Label>Fecha inicio</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Fecha fin</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}

            <div>
              <Label>Proveedor</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(dashboardData.metrics.totalAmount)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {dashboardData.metrics.growthRate >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {Math.abs(dashboardData.metrics.growthRate).toFixed(1)}% vs período anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.metrics.purchaseCount}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatCurrency(dashboardData.metrics.averagePurchase)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.metrics.uniqueProducts}</div>
            <p className="text-xs text-muted-foreground">{dashboardData.metrics.totalQuantity} unidades totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.metrics.uniqueSuppliers}</div>
            <p className="text-xs text-muted-foreground">Proveedores activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
          <TabsTrigger value="products">Por Productos</TabsTrigger>
          <TabsTrigger value="suppliers">Por Proveedores</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compras por Día</CardTitle>
              <CardDescription>Evolución diaria de las compras</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={dashboardData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Total"]} />
                  <Area type="monotone" dataKey="total" stroke="#0088FE" fill="#0088FE" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Productos Más Comprados</CardTitle>
              <CardDescription>Por monto total invertido</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dashboardData.productData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Total"]} />
                  <Bar dataKey="total" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Proveedores</CardTitle>
                <CardDescription>Porcentaje del total de compras</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboardData.supplierData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dashboardData.supplierData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Total"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking de Proveedores</CardTitle>
                <CardDescription>Por monto total de compras</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.supplierData
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5)
                    .map((supplier, index) => (
                      <div key={supplier.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{supplier.name}</span>
                        </div>
                        <span className="text-sm font-bold">{formatCurrency(supplier.value)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Compras</CardTitle>
                <CardDescription>Evolución mensual</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.dailyData.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Total"]} />
                    <Line type="monotone" dataKey="total" stroke="#FF8042" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análisis de Crecimiento</CardTitle>
                <CardDescription>Comparación con período anterior</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">Período Actual</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {formatCurrency(dashboardData.metrics.totalAmount)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium">Crecimiento</p>
                      <p
                        className={`text-2xl font-bold ${
                          dashboardData.metrics.growthRate >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {dashboardData.metrics.growthRate >= 0 ? "+" : ""}
                        {dashboardData.metrics.growthRate.toFixed(1)}%
                      </p>
                    </div>
                    {dashboardData.metrics.growthRate >= 0 ? (
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-600 dark:text-green-400">Transacciones</p>
                      <p className="text-xl font-bold text-green-900 dark:text-green-100">
                        {dashboardData.metrics.purchaseCount}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-sm text-purple-600 dark:text-purple-400">Promedio</p>
                      <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                        {formatCurrency(dashboardData.metrics.averagePurchase)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
