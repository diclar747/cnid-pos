"use client"

import { useMemo } from "react"
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import {
  Building,
  TrendingUp,
  TrendingDown,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Star,
  Users,
  ShoppingCart,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSuppliers } from "../context/suppliers-context"
import { usePurchases } from "../context/purchases-context"

interface SupplierDetailDialogProps {
  supplierId: number
  open: boolean
  onClose: () => void
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function SupplierDetailDialog({ supplierId, open, onClose }: SupplierDetailDialogProps) {
  const { getSupplierById } = useSuppliers()
  const { purchases } = usePurchases()

  const supplier = getSupplierById(supplierId)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Análisis de compras del proveedor
  const supplierAnalysis = useMemo(() => {
    if (!supplier) return null

    const supplierPurchases = purchases.filter((p) => p.supplier?.toLowerCase().includes(supplier.name.toLowerCase()))

    // Métricas generales
    const totalAmount = supplierPurchases.reduce((sum, p) => sum + p.total, 0)
    const totalQuantity = supplierPurchases.reduce((sum, p) => sum + p.quantity, 0)
    const transactionCount = supplierPurchases.length
    const averageOrderValue = transactionCount > 0 ? totalAmount / transactionCount : 0

    // Análisis temporal (últimos 12 meses)
    const monthlyData = new Map()
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      return date.toISOString().slice(0, 7) // YYYY-MM
    }).reverse()

    last12Months.forEach((month) => {
      monthlyData.set(month, { month, amount: 0, transactions: 0 })
    })

    supplierPurchases.forEach((purchase) => {
      const month = purchase.date.slice(0, 7)
      if (monthlyData.has(month)) {
        const existing = monthlyData.get(month)
        monthlyData.set(month, {
          month,
          amount: existing.amount + purchase.total,
          transactions: existing.transactions + 1,
        })
      }
    })

    const timelineData = Array.from(monthlyData.values())

    // Análisis por producto
    const productAnalysis = new Map()
    supplierPurchases.forEach((purchase) => {
      if (productAnalysis.has(purchase.productId)) {
        const existing = productAnalysis.get(purchase.productId)
        productAnalysis.set(purchase.productId, {
          ...existing,
          totalAmount: existing.totalAmount + purchase.total,
          totalQuantity: existing.totalQuantity + purchase.quantity,
          transactionCount: existing.transactionCount + 1,
        })
      } else {
        productAnalysis.set(purchase.productId, {
          productId: purchase.productId,
          productName: purchase.productName,
          totalAmount: purchase.total,
          totalQuantity: purchase.quantity,
          transactionCount: 1,
          averagePrice: purchase.unitPrice,
        })
      }
    })

    const productData = Array.from(productAnalysis.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10)

    // Análisis de frecuencia de compras
    const purchaseDates = supplierPurchases.map((p) => new Date(p.date)).sort((a, b) => a.getTime() - b.getTime())
    let averageDaysBetweenOrders = 0
    if (purchaseDates.length > 1) {
      const intervals = []
      for (let i = 1; i < purchaseDates.length; i++) {
        const days = Math.ceil((purchaseDates[i].getTime() - purchaseDates[i - 1].getTime()) / (1000 * 60 * 60 * 24))
        intervals.push(days)
      }
      averageDaysBetweenOrders = intervals.reduce((sum, days) => sum + days, 0) / intervals.length
    }

    // Últimas transacciones
    const recentTransactions = supplierPurchases
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

    // Tendencia (comparar últimos 3 meses vs 3 meses anteriores)
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())

    const recent3Months = supplierPurchases.filter((p) => new Date(p.date) >= threeMonthsAgo)
    const previous3Months = supplierPurchases.filter(
      (p) => new Date(p.date) >= sixMonthsAgo && new Date(p.date) < threeMonthsAgo,
    )

    const recentTotal = recent3Months.reduce((sum, p) => sum + p.total, 0)
    const previousTotal = previous3Months.reduce((sum, p) => sum + p.total, 0)
    const growthRate = previousTotal > 0 ? ((recentTotal - previousTotal) / previousTotal) * 100 : 0

    return {
      metrics: {
        totalAmount,
        totalQuantity,
        transactionCount,
        averageOrderValue,
        averageDaysBetweenOrders,
        growthRate,
        firstPurchase: purchaseDates[0],
        lastPurchase: purchaseDates[purchaseDates.length - 1],
      },
      timelineData,
      productData,
      recentTransactions,
    }
  }, [supplier, purchases])

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
      />
    ))
  }

  if (!supplier || !supplierAnalysis) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {supplier.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {supplier.name}
          </DialogTitle>
          <DialogDescription>Análisis detallado de transacciones y rendimiento</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="analytics">Análisis</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Información del proveedor */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Información del Proveedor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">RUC</p>
                      <p className="font-medium">{supplier.ruc}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Categoría</p>
                      <Badge variant="outline">{supplier.category}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{supplier.address}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{supplier.phone}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{supplier.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Calificación:</span>
                    <div className="flex">{getRatingStars(supplier.rating)}</div>
                    <span className="text-sm">({supplier.rating})</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Límite de Crédito</p>
                      <p className="font-medium">{formatCurrency(supplier.creditLimit)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Términos de Pago</p>
                      <p className="font-medium">{supplier.paymentTerms}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-1 h-4 w-4" />
                      {supplier.contacts.length} contacto{supplier.contacts.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de rendimiento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    Métricas de Rendimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-600 dark:text-blue-400">Total Comprado</p>
                      <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                        {formatCurrency(supplierAnalysis.metrics.totalAmount)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-green-600 dark:text-green-400">Transacciones</p>
                      <p className="text-xl font-bold text-green-900 dark:text-green-100">
                        {supplierAnalysis.metrics.transactionCount}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-sm text-purple-600 dark:text-purple-400">Promedio por Orden</p>
                      <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                        {formatCurrency(supplierAnalysis.metrics.averageOrderValue)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <p className="text-sm text-orange-600 dark:text-orange-400">Frecuencia</p>
                      <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
                        {Math.round(supplierAnalysis.metrics.averageDaysBetweenOrders)} días
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tendencia (3 meses)</span>
                      <div className="flex items-center">
                        {supplierAnalysis.metrics.growthRate >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            supplierAnalysis.metrics.growthRate >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {supplierAnalysis.metrics.growthRate >= 0 ? "+" : ""}
                          {supplierAnalysis.metrics.growthRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Primera Compra</p>
                      <p className="text-sm font-medium">
                        {supplierAnalysis.metrics.firstPurchase
                          ? supplierAnalysis.metrics.firstPurchase.toLocaleDateString("es-PY")
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Última Compra</p>
                      <p className="text-sm font-medium">
                        {supplierAnalysis.metrics.lastPurchase
                          ? supplierAnalysis.metrics.lastPurchase.toLocaleDateString("es-PY")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contactos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contactos ({supplier.contacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supplier.contacts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No hay contactos registrados</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {supplier.contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {contact.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{contact.name}</p>
                            {contact.isPrimary && (
                              <Badge variant="default" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Principal
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{contact.position}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <a href={`tel:${contact.phone}`} className="text-xs text-blue-600 hover:underline">
                              {contact.phone}
                            </a>
                            <a href={`mailto:${contact.email}`} className="text-xs text-blue-600 hover:underline">
                              {contact.email}
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Gráfico de tendencia temporal */}
            <Card>
              <CardHeader>
                <CardTitle>Evolución de Compras (12 meses)</CardTitle>
                <CardDescription>Tendencia mensual de compras</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={supplierAnalysis.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Monto"]} />
                    <Line type="monotone" dataKey="amount" stroke="#0088FE" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Análisis comparativo */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Volumen de Compras</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{supplierAnalysis.metrics.totalQuantity}</div>
                    <p className="text-sm text-muted-foreground">Unidades totales</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Consistencia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {Math.round(supplierAnalysis.metrics.averageDaysBetweenOrders)}
                    </div>
                    <p className="text-sm text-muted-foreground">Días entre órdenes</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Crecimiento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${
                        supplierAnalysis.metrics.growthRate >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {supplierAnalysis.metrics.growthRate >= 0 ? "+" : ""}
                      {supplierAnalysis.metrics.growthRate.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Últimos 3 meses</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Productos Más Comprados</CardTitle>
                <CardDescription>Top 10 productos por monto total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supplierAnalysis.productData.map((product, index) => (
                    <div key={product.productId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-sm text-muted-foreground">{product.transactionCount} transacciones</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(product.totalAmount)}</p>
                        <p className="text-sm text-muted-foreground">{product.totalQuantity} unidades</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transacciones Recientes</CardTitle>
                <CardDescription>Últimas 10 compras realizadas</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierAnalysis.recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(transaction.date).toLocaleDateString("es-PY")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{transaction.productName}</TableCell>
                        <TableCell>{transaction.quantity}</TableCell>
                        <TableCell>{formatCurrency(transaction.unitPrice)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(transaction.total)}</TableCell>
                        <TableCell>{transaction.createdBy}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {supplierAnalysis.recentTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">No hay transacciones registradas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
