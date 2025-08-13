"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  LayoutGrid,
  Utensils,
  Coffee,
  IceCream,
  Beef,
  Salad,
  TrendingUp,
  Star,
  Tag,
  Sparkles,
  Package,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { useCart } from "../context/cart-context"

interface CategorySidebarProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

export default function CategorySidebar({ selectedCategory, onCategoryChange }: CategorySidebarProps) {
  const { products } = useCart()

  const categories = [
    {
      id: "todos",
      name: "Todos los Productos",
      icon: LayoutGrid,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      id: "comida",
      name: "Comida",
      icon: Utensils,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      id: "bebidas",
      name: "Bebidas",
      icon: Coffee,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-200",
    },
    {
      id: "postres",
      name: "Postres",
      icon: IceCream,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200",
    },
    {
      id: "carnes",
      name: "Carnes",
      icon: Beef,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      id: "ensaladas",
      name: "Ensaladas",
      icon: Salad,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
  ]

  const filters = [
    {
      id: "mas-vendidos",
      name: "Más Vendidos",
      icon: TrendingUp,
      color: "text-purple-600",
    },
    {
      id: "mejor-valorados",
      name: "Mejor Valorados",
      icon: Star,
      color: "text-yellow-600",
    },
    {
      id: "ofertas",
      name: "Ofertas",
      icon: Tag,
      color: "text-red-600",
    },
    {
      id: "nuevos",
      name: "Nuevos",
      icon: Sparkles,
      color: "text-indigo-600",
    },
  ]

  const getProductCount = (categoryId: string) => {
    if (!products || products.length === 0) return 0

    if (categoryId === "todos") return products.length

    return products.filter((product) => product.category.toLowerCase() === categoryId.toLowerCase()).length
  }

  const getStockStats = () => {
    if (!products || products.length === 0) {
      return { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }
    }

    const total = products.length
    const inStock = products.filter((p) => p.stock > 5).length
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length
    const outOfStock = products.filter((p) => p.stock === 0).length

    return { total, inStock, lowStock, outOfStock }
  }

  const stockStats = getStockStats()

  return (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Categorías</h2>
        <div className="text-sm text-muted-foreground">{stockStats.total} productos en total</div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Categorías principales */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">CATEGORÍAS</h3>
            {categories.map((category) => {
              const Icon = category.icon
              const count = getProductCount(category.id)
              const isSelected = selectedCategory === category.id

              return (
                <Button
                  key={category.id}
                  variant={isSelected ? "secondary" : "ghost"}
                  className={`w-full justify-start h-auto p-3 ${
                    isSelected
                      ? `${category.bgColor} ${category.borderColor} border ${category.color}`
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => onCategoryChange(category.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isSelected ? category.color : "text-muted-foreground"}`} />
                      <span className={`text-sm ${isSelected ? "font-medium" : ""}`}>{category.name}</span>
                    </div>
                    <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                      {count}
                    </Badge>
                  </div>
                </Button>
              )
            })}
          </div>

          <Separator />

          {/* Filtros especiales */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">FILTROS</h3>
            {filters.map((filter) => {
              const Icon = filter.icon
              const isSelected = selectedCategory === filter.id

              return (
                <Button
                  key={filter.id}
                  variant={isSelected ? "secondary" : "ghost"}
                  className={`w-full justify-start h-auto p-3 ${isSelected ? "bg-secondary" : "hover:bg-muted/50"}`}
                  onClick={() => onCategoryChange(filter.id)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isSelected ? filter.color : "text-muted-foreground"}`} />
                    <span className={`text-sm ${isSelected ? "font-medium" : ""}`}>{filter.name}</span>
                  </div>
                </Button>
              )
            })}
          </div>

          <Separator />

          {/* Estadísticas de stock */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">ESTADO DEL INVENTARIO</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">En Stock</span>
                </div>
                <Badge variant="outline" className="text-green-700 border-green-300">
                  {stockStats.inStock}
                </Badge>
              </div>

              {stockStats.lowStock > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">Stock Bajo</span>
                  </div>
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    {stockStats.lowStock}
                  </Badge>
                </div>
              )}

              {stockStats.outOfStock > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">Agotado</span>
                  </div>
                  <Badge variant="outline" className="text-red-700 border-red-300">
                    {stockStats.outOfStock}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
