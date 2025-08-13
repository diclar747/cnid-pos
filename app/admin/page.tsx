"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useCart } from "../context/cart-context"
import { useSales } from "../context/sales-context"
import { useNotifications } from "../context/notifications-context"
import { StockAlerts } from "../components/stock-alerts"
import { Package, DollarSign, TrendingUp, AlertTriangle, ShoppingCart, Calendar, Target } from "lucide-react"
import { useEffect } from "react"

export default function AdminDashboard() {
  const { products, purchases } = useCart()
  const { sales } = useSales()
  const { checkStockLevels, getLowStockProducts, getCriticalStockProducts, getOutOfStockProducts } = useNotifications()

  // Sincronizar productos con notificaciones
  useEffect(() => {
    if (products.length > 0) {
      checkStockLevels(products)
    }
  }, [products, checkStockLevels])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Calcular estadísticas
  const totalProducts = products.length
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.total, 0)
  const lowStockCount = getLowStockProducts().length
  const criticalStockCount = getCriticalStockProducts().length
  const outOfStockCount = getOutOfStockProducts().length

  // Ventas del mes actual
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlySales = sales.filter((sale) => {
    const saleDate = new Date(sale.date)
    return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear
  })
  const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + sale.total, 0)

  // Productos más vendidos
  const productSales = sales.reduce(
    (acc, sale) => {
      sale.items.forEach((item) => {
        if (!acc[item.productId]) {
          acc[item.productId] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
          }
        }
        acc[item.productId].quantity += item.quantity
        acc[item.productId].revenue += item.price * item.quantity
      })
      return acc
    },
    {} as Record<number, { name: string; quantity: number; revenue: number }>,
  )

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  // Progreso de stock
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0)
  const averageStock = totalStock / products.length || 0
  const stockHealth = Math.max(0, Math.min(100, (averageStock / 50) * 100)) // Asumiendo 50 como stock ideal

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">Resumen general del sistema POS</p>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {lowStockCount + criticalStockCount + outOfStockCount > 0 && (
                <span className="text-orange-600">
                  {lowStockCount + criticalStockCount + outOfStockCount} con alertas
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="card-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">{sales.length} transacciones</p>
          </CardContent>
        </Card>

        <Card className="card-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">{monthlySales.length} ventas este mes</p>
          </CardContent>
        </Card>

        <Card className="card-dark">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compras Totales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPurchases)}</div>
            <p className="text-xs text-muted-foreground">{purchases.length} compras registradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Stock y Estado del Inventario */}
      <div className="grid gap-6 md:grid-cols-2">
        <StockAlerts />

        <Card className="card-dark">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Estado del Inventario
            </CardTitle>
            <CardDescription>Salud general del stock</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Salud del Stock</span>
                <span>{Math.round(stockHealth)}%</span>
              </div>
              <Progress value={stockHealth} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                <p className="text-xs text-muted-foreground">Agotados</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-orange-600">{criticalStockCount}</p>
                <p className="text-xs text-muted-foreground">Críticos</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
                <p className="text-xs text-muted-foreground">Stock Bajo</p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Stock Total:</span>
                <span className="font-medium">{totalStock.toLocaleString()} unidades</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Promedio por Producto:</span>
                <span className="font-medium">{Math.round(averageStock)} unidades</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productos más vendidos */}
      {topProducts.length > 0 && (
        <Card className="card-dark">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Productos Más Vendidos
            </CardTitle>
            <CardDescription>Top 5 productos por cantidad vendida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.quantity} unidades vendidas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(product.revenue)}</p>
                    <p className="text-sm text-muted-foreground">ingresos</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de alertas */}
      {(lowStockCount > 0 || criticalStockCount > 0 || outOfStockCount > 0) && (
        <Card className="card-dark border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Resumen de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {outOfStockCount > 0 && (
                <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                  <p className="text-sm text-red-600">Productos Agotados</p>
                  <p className="text-xs text-muted-foreground mt-1">Requieren reabastecimiento inmediato</p>
                </div>
              )}
              {criticalStockCount > 0 && (
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{criticalStockCount}</p>
                  <p className="text-sm text-orange-600">Stock Crítico</p>
                  <p className="text-xs text-muted-foreground mt-1">Menos de 5 unidades disponibles</p>
                </div>
              )}
              {lowStockCount > 0 && (
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
                  <p className="text-sm text-yellow-600">Stock Bajo</p>
                  <p className="text-xs text-muted-foreground mt-1">Considera reabastecer pronto</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
