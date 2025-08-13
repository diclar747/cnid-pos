"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, TrendingUp, Users, ShoppingBag, AlertTriangle, Calendar, Activity } from "lucide-react"
import { useSales } from "../context/sales-context"
import { useCart } from "../context/cart-context"
import { useAuth } from "../context/auth-context"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export default function AdminDashboard() {
  const { sales, expenses, getTotalSales, getTotalExpenses } = useSales()
  const { products } = useCart()
  const { users } = useAuth()

  const [todayStats, setTodayStats] = useState({
    sales: 0,
    expenses: 0,
    profit: 0,
  })

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    const todaySales = getTotalSales(today, today)
    const todayExpenses = getTotalExpenses(today, today)

    setTodayStats({
      sales: todaySales,
      expenses: todayExpenses,
      profit: todaySales - todayExpenses,
    })
  }, [sales, expenses, getTotalSales, getTotalExpenses])

  const totalSales = getTotalSales()
  const totalExpenses = getTotalExpenses()
  const totalProfit = totalSales - totalExpenses
  const lowStockProducts = products.filter((p) => p.stock < 10)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return 0
    return (((current - previous) / previous) * 100).toFixed(1)
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Resumen general de tu negocio</p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-600">{new Date().toLocaleDateString("es-PY")}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Ventas Hoy</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(todayStats.sales)}</div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-xs text-green-600 font-medium">+12.5% vs ayer</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-red-50 to-red-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Gastos Hoy</CardTitle>
            <div className="p-2 bg-red-500 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{formatCurrency(todayStats.expenses)}</div>
            <div className="flex items-center mt-2">
              <Activity className="h-4 w-4 text-orange-500 mr-1" />
              <span className="text-xs text-orange-600 font-medium">-5.2% vs ayer</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Ganancia Hoy</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${todayStats.profit >= 0 ? "text-green-900" : "text-red-900"}`}>
              {formatCurrency(todayStats.profit)}
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-xs text-green-600 font-medium">+18.7% vs ayer</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Productos</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg">
              <Package className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{products.length}</div>
            <div className="flex items-center mt-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
              <span className="text-xs text-orange-600 font-medium">{lowStockProducts.length} stock bajo</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Resumen Financiero */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Resumen Financiero
            </CardTitle>
            <CardDescription>Estadísticas generales del negocio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Ventas Totales</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(totalSales)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Gastos Totales</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Ganancia Neta</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-blue-900" : "text-red-900"}`}>
                  {formatCurrency(totalProfit)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Margen de Ganancia</span>
                <span className="text-sm text-gray-600">
                  {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress value={totalSales > 0 ? Math.max(0, (totalProfit / totalSales) * 100) : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Stock Bajo */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Stock Bajo
            </CardTitle>
            <CardDescription>Productos que necesitan reposición</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-6">
                <Package className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-600 font-medium">¡Excelente!</p>
                <p className="text-xs text-gray-500">Todos los productos tienen stock suficiente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">Código: {product.barcode}</p>
                    </div>
                    <Badge variant="destructive" className="ml-2">
                      {product.stock} unidades
                    </Badge>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-xs text-center text-gray-500 pt-2">
                    +{lowStockProducts.length - 5} productos más con stock bajo
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ventas Recientes */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingBag className="h-5 w-5 mr-2 text-blue-600" />
              Ventas Recientes
            </CardTitle>
            <CardDescription>Últimas 5 transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <div className="text-center py-6">
                <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay ventas registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sales
                  .slice(-5)
                  .reverse()
                  .map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Ticket #{sale.receiptNumber}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(sale.date).toLocaleString("es-PY")} • {sale.cashier}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(sale.total)}</p>
                        <Badge variant="outline" className="text-xs">
                          {sale.paymentMethod === "card" ? "Tarjeta" : "Efectivo"}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sistema Info */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              Información del Sistema
            </CardTitle>
            <CardDescription>Estado actual del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="font-medium text-purple-900">Usuarios Activos</p>
                <p className="text-xs text-purple-600">Total registrados</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-900">{users.length}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-blue-900">Productos Activos</p>
                <p className="text-xs text-blue-600">En inventario</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900">{products.length}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-900">Transacciones</p>
                <p className="text-xs text-green-600">Total procesadas</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-900">{sales.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
