"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Package, XCircle, ArrowRight } from "lucide-react"
import { useNotifications } from "../context/notifications-context"
import { useCart } from "../context/cart-context"
import { useRouter } from "next/navigation"

export function StockAlerts() {
  const { checkStockLevels, getCriticalStockProducts, getLowStockProducts, getOutOfStockProducts } = useNotifications()
  const { products } = useCart()
  const router = useRouter()

  useEffect(() => {
    if (products && products.length > 0) {
      checkStockLevels(products)
    }
  }, [products, checkStockLevels])

  const criticalStock = getCriticalStockProducts()
  const lowStock = getLowStockProducts()
  const outOfStock = getOutOfStockProducts()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (criticalStock.length === 0 && lowStock.length === 0 && outOfStock.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Package className="h-5 w-5" />
            Estado del Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-green-600 mb-2">
              <Package className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-sm text-muted-foreground">¡Excelente! Todos los productos tienen stock suficiente.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Critical Stock */}
      {criticalStock.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Stock Crítico
              <Badge variant="destructive">{criticalStock.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalStock.slice(0, 3).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(product.price)} • Solo {product.stock} disponibles
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {product.stock} unidades
                  </Badge>
                </div>
              ))}
              {criticalStock.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  Y {criticalStock.length - 3} productos más...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock */}
      {lowStock.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Stock Bajo
              <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                {lowStock.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStock.slice(0, 3).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(product.price)} • {product.stock} disponibles
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-yellow-600 text-yellow-600 text-xs">
                    {product.stock} unidades
                  </Badge>
                </div>
              ))}
              {lowStock.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">Y {lowStock.length - 3} productos más...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Out of Stock */}
      {outOfStock.length > 0 && (
        <Card className="border-gray-200 bg-gray-50/50 dark:bg-gray-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <Package className="h-5 w-5" />
              Productos Agotados
              <Badge variant="secondary">{outOfStock.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outOfStock.slice(0, 3).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded grayscale"
                    />
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(product.price)} • Sin stock</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Agotado
                  </Badge>
                </div>
              ))}
              {outOfStock.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">Y {outOfStock.length - 3} productos más...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <div className="flex justify-center pt-2">
        <Button onClick={() => router.push("/admin/products")} variant="outline" className="w-full">
          Gestionar Inventario
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
