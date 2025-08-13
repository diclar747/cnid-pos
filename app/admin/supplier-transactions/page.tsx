"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, DollarSign, Package, Users, Calendar, Download, Eye, Filter, Search } from "lucide-react"

// Datos simulados de transacciones
const mockTransactions = [
  {
    id: "TXN-001",
    date: "2024-01-15",
    supplierId: "SUP-001",
    supplierName: "Distribuidora Central",
    amount: 2500000,
    type: "purchase",
    status: "completed",
    items: 15,
    category: "Alimentos",
    paymentMethod: "transfer",
    rating: 4.5,
  },
  {
    id: "TXN-002",
    date: "2024-01-18",
    supplierId: "SUP-002",
    supplierName: "Bebidas Premium",
    amount: 1800000,
    type: "purchase",
    status: "completed",
    items: 12,
    category: "Bebidas",
    paymentMethod: "credit",
    rating: 4.8,
  },
  {
    id: "TXN-003",
    date: "2024-01-22",
    supplierId: "SUP-003",
    supplierName: "Postres Artesanales",
    amount: 950000,
    type: "purchase",
    status: "pending",
    items: 8,
    category: "Postres",
    paymentMethod: "cash",
    rating: 4.2,
  },
  {
    id: "TXN-004",
    date: "2024-01-25",
    supplierId: "SUP-001",
    supplierName: "Distribuidora Central",
    amount: 3200000,
    type: "purchase",
    status: "completed",
    items: 20,
    category: "Alimentos",
    paymentMethod: "transfer",
    rating: 4.5,
  },
  {
    id: "TXN-005",
    date: "2024-01-28",
    supplierId: "SUP-004",
    supplierName: "Carnes Selectas",
    amount: 2100000,
    type: "purchase",
    status: "completed",
    items: 10,
    category: "Carnes",
    paymentMethod: "transfer",
    rating: 4.7,
  },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export default function SupplierTransactionsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30")
  const [selectedSupplier, setSelectedSupplier] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)

  // Filtrar transacciones
  const filteredTransactions = useMemo(() => {
    return mockTransactions.filter((transaction) => {
      const matchesSupplier = selectedSupplier === "all" || transaction.supplierId === selectedSupplier
      const matchesSearch =
        transaction.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.id.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSupplier && matchesSearch
    })
  }, [selectedSupplier, searchTerm])

  // Calcular métricas
  const metrics = useMemo(() => {
    const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
    const count = filteredTransactions.length
    const average = count > 0 ? total / count : 0
    const topSupplier = filteredTransactions.reduce((top, current) => {
      return current.amount > (top?.amount || 0) ? current : top
    }, null as any)

    return {
      totalAmount: total,
      transactionCount: count,
      averageAmount: average,
      topSupplier: topSupplier?.supplierName || "N/A",
      growth: 12.5, // Simulado
    }
  }, [filteredTransactions])

  // Datos para gráficos
  const chartData = useMemo(() => {
    // Datos por fecha
    const byDate = filteredTransactions.reduce(
      (acc, t) => {
        const date = t.date
        acc[date] = (acc[date] || 0) + t.amount
        return acc
      },
      {} as Record<string, number>,
    )

    const areaData = Object.entries(byDate).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
      amount: amount / 1000000,
    }))

    // Datos por proveedor
    const bySupplier = filteredTransactions.reduce(
      (acc, t) => {
        acc[t.supplierName] = (acc[t.supplierName] || 0) + t.amount
        return acc
      },
      {} as Record<string, number>,
    )

    const barData = Object.entries(bySupplier).map(([name, amount]) => ({
      name: name.length > 15 ? name.substring(0, 15) + "..." : name,
      amount: amount / 1000000,
    }))

    // Datos por categoría
    const byCategory = filteredTransactions.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      },
      {} as Record<string, number>,
    )

    const pieData = Object.entries(byCategory).map(([name, value]) => ({
      name,
      value: value / 1000000,
    }))

    return { areaData, barData, pieData }
  }, [filteredTransactions])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const exportData = () => {
    const dataToExport = {
      summary: metrics,
      transactions: filteredTransactions,
      charts: chartData,
      exportDate: new Date().toISOString(),
      filters: {
        period: selectedPeriod,
        supplier: selectedSupplier,
        search: searchTerm,
      },
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `supplier-transactions-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis de Transacciones</h1>
          <p className="text-muted-foreground">Seguimiento completo de transacciones por proveedor</p>
        </div>
        <Button onClick={exportData} className="flex items-center gap-2">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="365">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Proveedor</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  <SelectItem value="SUP-001">Distribuidora Central</SelectItem>
                  <SelectItem value="SUP-002">Bebidas Premium</SelectItem>
                  <SelectItem value="SUP-003">Postres Artesanales</SelectItem>
                  <SelectItem value="SUP-004">Carnes Selectas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por proveedor o ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transacciones</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalAmount)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />+{metrics.growth}% vs mes anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cantidad</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.transactionCount}</div>
            <p className="text-xs text-muted-foreground">transacciones registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averageAmount)}</div>
            <p className="text-xs text-muted-foreground">por transacción</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Proveedor</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{metrics.topSupplier}</div>
            <p className="text-xs text-muted-foreground">mayor volumen</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Transacciones</CardTitle>
            <CardDescription>Evolución del monto por fecha</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.areaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}M PYG`, "Monto"]} />
                <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking por Proveedor</CardTitle>
            <CardDescription>Volumen de transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}M PYG`, "Monto"]} />
                <Bar dataKey="amount" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
            <CardDescription>Porcentaje del total</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}M PYG`, "Monto"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolución Temporal</CardTitle>
            <CardDescription>Línea de tiempo detallada</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.areaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}M PYG`, "Monto"]} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#ff7300" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de transacciones */}
      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
          <CardDescription>
            Mostrando {filteredTransactions.length} de {mockTransactions.length} transacciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.id}</TableCell>
                  <TableCell>{new Date(transaction.date).toLocaleDateString("es-ES")}</TableCell>
                  <TableCell>{transaction.supplierName}</TableCell>
                  <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                      {transaction.status === "completed" ? "Completada" : "Pendiente"}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.items}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(transaction)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Detalle de Transacción {transaction.id}</DialogTitle>
                          <DialogDescription>Información completa de la transacción</DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="general" className="w-full">
                          <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="financial">Financiero</TabsTrigger>
                            <TabsTrigger value="supplier">Proveedor</TabsTrigger>
                            <TabsTrigger value="history">Historial</TabsTrigger>
                          </TabsList>

                          <TabsContent value="general" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">ID de Transacción</label>
                                <p className="text-lg">{transaction.id}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Fecha</label>
                                <p className="text-lg">{new Date(transaction.date).toLocaleDateString("es-ES")}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Tipo</label>
                                <Badge>{transaction.type === "purchase" ? "Compra" : "Otro"}</Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Estado</label>
                                <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                                  {transaction.status === "completed" ? "Completada" : "Pendiente"}
                                </Badge>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="financial" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Monto Total</label>
                                <p className="text-2xl font-bold">{formatCurrency(transaction.amount)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Método de Pago</label>
                                <p className="text-lg capitalize">{transaction.paymentMethod}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Cantidad de Items</label>
                                <p className="text-lg">{transaction.items} productos</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Promedio por Item</label>
                                <p className="text-lg">{formatCurrency(transaction.amount / transaction.items)}</p>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="supplier" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Proveedor</label>
                                <p className="text-lg font-semibold">{transaction.supplierName}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">ID Proveedor</label>
                                <p className="text-lg">{transaction.supplierId}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Categoría</label>
                                <Badge variant="outline">{transaction.category}</Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Rating</label>
                                <div className="flex items-center gap-2">
                                  <Progress value={transaction.rating * 20} className="w-20" />
                                  <span>{transaction.rating}/5</span>
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="history" className="space-y-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <div>
                                  <p className="font-medium">Transacción completada</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(transaction.date).toLocaleString("es-ES")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <div>
                                  <p className="font-medium">Pago procesado</p>
                                  <p className="text-sm text-muted-foreground">Método: {transaction.paymentMethod}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <div>
                                  <p className="font-medium">Orden creada</p>
                                  <p className="text-sm text-muted-foreground">{transaction.items} items solicitados</p>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
