"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Package, DollarSign, TrendingUp, ShoppingCart, Star, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { StockAlerts } from "../components/stock-alerts"
import { useNotifications } from "../context/notifications-context"
import { useCart } from "../context/cart-context"

export default function AdminDashboard() {
  const { checkStockLevels, getCriticalStockProducts, getLowStockProducts, getOutOfStockProducts } = useNotifications()
  const { products } = useCart()

  useEffect(() => {
    if (products && products.length > 0) {
      checkStockLevels(products)
    }
  }, [products, checkStockLevels])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  // Mock data for demonstration
  const stats = {
    totalProducts: products?.length || 15,
    totalSales: 1250000,
    monthlySales: 8500000,
    totalPurchases: 3200000,
  }

  const topProducts = [
    { name: "Hamburguesa Clásica", sales: 45, revenue: 1125000 },
    { name: "Pizza Margherita", sales: 32, revenue: 1120000 },
    { name: "Café Latte", sales: 67, revenue: 1005000 },
    { name: "Alitas de Pollo", sales: 28, revenue: 616000 },
    { name: "Torta de Chocolate", sales: 23, revenue: 414000 },
  ]

  const criticalStock = getCriticalStockProducts()
  const lowStock = getLowStockProducts()
  const outOfStock = getOutOfStockProducts()
  const inStock = products?.filter((p) => p.stock > 5).length || 0

  const stockProgress = products?.length ? (inStock / products.length) * 100 : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Vista general de tu negocio</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">En el inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalSales)}</div>
            <p className="text-xs text-muted-foreground">+12% desde ayer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.monthlySales)}</div>
            <p className="text-xs text-muted-foreground">+8% desde el mes pasado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compras del Mes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalPurchases)}</div>
            <p className="text-xs text-muted-foreground">-5% desde el mes pasado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Alerts */}
        <div>
          <StockAlerts />
        </div>

        {/* Inventory Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Estado del Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Stock General</span>
                <span>{Math.round(stockProgress)}%</span>
              </div>
              <Progress value={stockProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-medium text-sm">{inStock}</div>
                  <div className="text-xs text-muted-foreground">En Stock</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <div>
                  <div className="font-medium text-sm">{lowStock.length}</div>
                  <div className="text-xs text-muted-foreground">Stock Bajo</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600" />
                <div>
                  <div className="font-medium text-sm">{criticalStock.length}</div>
                  <div className="text-xs text-muted-foreground">Crítico</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                <Package className="h-4 w-4 text-gray-600" />
                <div>
                  <div className="font-medium text-sm">{outOfStock.length}</div>
                  <div className="text-xs text-muted-foreground">Agotado</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Productos Más Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sales} ventas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{formatPrice(product.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resumen de Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600">Stock Crítico</span>
                <Badge variant="destructive">{criticalStock.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-yellow-600">Stock Bajo</span>
                <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                  {lowStock.length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Agotados</span>
                <Badge variant="secondary">{outOfStock.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rendimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Margen Promedio</span>
                <span className="font-medium">35%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Rotación</span>
                <span className="font-medium">2.3x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Satisfacción</span>
                <span className="font-medium">4.6★</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Objetivos del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Ventas</span>
                  <span>85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Nuevos Clientes</span>
                  <span>62%</span>
                </div>
                <Progress value={62} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
