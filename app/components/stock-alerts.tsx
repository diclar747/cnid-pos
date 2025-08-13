"use client"

import { useEffect } from "react"
import { AlertTriangle, AlertCircle, Package, TrendingDown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useNotifications } from "../context/notifications-context"
import { useCart } from "../context/cart-context"
import { useRouter } from "next/navigation"

export function StockAlerts() {
  const { checkStockLevels, getLowStockProducts, getCriticalStockProducts, getOutOfStockProducts } = useNotifications()
  const { products } = useCart()
  const router = useRouter()

  // Actualizar productos en el contexto de notificaciones
  useEffect(() => {
    if (products.length > 0) {
      checkStockLevels(products)
    }
  }, [products, checkStockLevels])

  const lowStockProducts = getLowStockProducts()
  const criticalStockProducts = getCriticalStockProducts()
  const outOfStockProducts = getOutOfStockProducts()

  const totalAlerts = lowStockProducts.length + criticalStockProducts.length + outOfStockProducts.length

  if (totalAlerts === 0) {
    return (
      <Card className="card-dark">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Package className="h-5 w-5" />
            Estado del Inventario
          </CardTitle>
          <CardDescription>Todos los productos tienen stock adecuado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-green-600 mb-2">✓</div>
            <p className="text-sm text-muted-foreground">No hay alertas de stock en este momento</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card className="card-dark">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-500" />
              Alertas de Stock
            </CardTitle>
            <CardDescription>Productos que requieren atención inmediata</CardDescription>
          </div>
          <Badge variant="destructive" className="text-sm">
            {totalAlerts} alertas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Productos Agotados */}
        {outOfStockProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h4 className="font-medium text-red-600 dark:text-red-400">
                Productos Agotados ({outOfStockProducts.length})
              </h4>
            </div>
            <div className="grid gap-2">
              {outOfStockProducts.slice(0, 3).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950 rounded"
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="text-xs">
                      Agotado
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(product.price)}</p>
                  </div>
                </div>
              ))}
              {outOfStockProducts.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{outOfStockProducts.length - 3} productos más
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stock Crítico */}
        {criticalStockProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h4 className="font-medium text-orange-600 dark:text-orange-400">
                Stock Crítico ({criticalStockProducts.length})
              </h4>
            </div>
            <div className="grid gap-2">
              {criticalStockProducts.slice(0, 3).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950 rounded"
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                      {product.stock} unidades
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(product.price)}</p>
                  </div>
                </div>
              ))}
              {criticalStockProducts.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{criticalStockProducts.length - 3} productos más
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stock Bajo */}
        {lowStockProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-yellow-500" />
              <h4 className="font-medium text-yellow-600 dark:text-yellow-400">
                Stock Bajo ({lowStockProducts.length})
              </h4>
            </div>
            <div className="grid gap-2">
              {lowStockProducts.slice(0, 2).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-950 rounded"
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                      {product.stock} unidades
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(product.price)}</p>
                  </div>
                </div>
              ))}
              {lowStockProducts.length > 2 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{lowStockProducts.length - 2} productos más
                </p>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-transparent"
            onClick={() => router.push("/admin/products")}
          >
            Ver Todos los Productos
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
