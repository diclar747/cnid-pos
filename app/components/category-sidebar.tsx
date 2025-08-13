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
import { products } from "../data/products"

interface CategorySidebarProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  selectedFilter: string
  onFilterChange: (filter: string) => void
}

export default function CategorySidebar({
  selectedCategory,
  onCategoryChange,
  selectedFilter,
  onFilterChange,
}: CategorySidebarProps) {
  const { products: cartProducts } = useCart()

  const categories = [
    { id: "all", name: "Todos", icon: LayoutGrid, color: "bg-blue-500" },
    { id: "food", name: "Comida", icon: Utensils, color: "bg-orange-500" },
    { id: "drinks", name: "Bebidas", icon: Coffee, color: "bg-cyan-500" },
    { id: "desserts", name: "Postres", icon: IceCream, color: "bg-pink-500" },
    { id: "meat", name: "Carnes", icon: Beef, color: "bg-red-500" },
    { id: "salads", name: "Ensaladas", icon: Salad, color: "bg-green-500" },
  ]

  const filters = [
    { id: "bestsellers", name: "Más Vendidos", icon: TrendingUp },
    { id: "top-rated", name: "Mejor Valorados", icon: Star },
    { id: "offers", name: "Ofertas", icon: Tag },
    { id: "new", name: "Nuevos", icon: Sparkles },
  ]

  const getCategoryCount = (categoryId: string) => {
    if (categoryId === "all") return products.length
    return products.filter((product) => product.category === categoryId).length
  }

  const getStockStats = () => {
    const inStock = products.filter((p) => p.stock > 5).length
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length
    const outOfStock = products.filter((p) => p.stock === 0).length
    return { inStock, lowStock, outOfStock }
  }

  const stockStats = getStockStats()

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg mb-2">Categorías</h2>
        <div className="text-sm text-muted-foreground">{products.length} productos disponibles</div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Categories */}
          <div className="space-y-2">
            {categories.map((category) => {
              const Icon = category.icon
              const count = getCategoryCount(category.id)
              const isSelected = selectedCategory === category.id

              return (
                <Button
                  key={category.id}
                  variant={isSelected ? "default" : "ghost"}
                  className={`w-full justify-start h-auto p-3 ${isSelected ? "" : "hover:bg-muted/50"}`}
                  onClick={() => onCategoryChange(category.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={`p-2 rounded-lg ${category.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">{count} productos</div>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {count}
                    </Badge>
                  </div>
                </Button>
              )
            })}
          </div>

          <Separator />

          {/* Filters */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Filtros</h3>
            {filters.map((filter) => {
              const Icon = filter.icon
              const isSelected = selectedFilter === filter.id

              return (
                <Button
                  key={filter.id}
                  variant={isSelected ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => onFilterChange(isSelected ? "" : filter.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {filter.name}
                </Button>
              )
            })}
          </div>

          <Separator />

          {/* Stock Status */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Estado del Stock</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">En Stock</span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  {stockStats.inStock}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Stock Bajo</span>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                >
                  {stockStats.lowStock}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Agotado</span>
                </div>
                <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  {stockStats.outOfStock}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
