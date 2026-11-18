"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  LayoutGrid,
  UtensilsCrossed,
  CupSoda,
  Sandwich,
  Leaf,
  CookingPot,
  Truck,
  Citrus,
  CakeSlice,
  Pizza,
  Croissant,
  TrendingUp,
  Tag,
  Package,
  AlertTriangle,
  CheckCircle,
  type LucideIcon,
} from "lucide-react"
import { useCart } from "../context/cart-context"

interface CategorySidebarProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  selectedFilter: string
  onFilterChange: (filter: string) => void
  collapsed?: boolean
}

type CategoryStyle = { icon: LucideIcon; color: string }

const categoryStyles: Record<string, CategoryStyle> = {
  "menu diario": { icon: UtensilsCrossed, color: "from-amber-400 to-orange-600" },
  comidas: { icon: UtensilsCrossed, color: "from-amber-400 to-orange-600" },
  bebidas: { icon: CupSoda, color: "from-sky-400 to-blue-600" },
  sandwich: { icon: Sandwich, color: "from-yellow-400 to-amber-600" },
  "especiales dietas": { icon: Leaf, color: "from-emerald-400 to-green-600" },
  pastas: { icon: CookingPot, color: "from-violet-400 to-purple-600" },
  delivery: { icon: Truck, color: "from-indigo-400 to-blue-700" },
  "jugos naturales": { icon: Citrus, color: "from-lime-400 to-emerald-600" },
  postres: { icon: CakeSlice, color: "from-pink-400 to-rose-600" },
  pizza: { icon: Pizza, color: "from-red-400 to-orange-600" },
  empanadas: { icon: Croissant, color: "from-orange-400 to-amber-600" },
}

function getCategoryStyle(category: string): CategoryStyle {
  const key = category.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
  return categoryStyles[key] ?? { icon: Tag, color: "from-slate-400 to-slate-600" }
}

export default function CategorySidebar({
  selectedCategory,
  onCategoryChange,
  selectedFilter,
  onFilterChange,
  collapsed = false,
}: CategorySidebarProps) {
  const { products: allProducts } = useCart()
  // Igual que la grilla del POS: los productos inactivos no se cuentan ni generan categorías.
  const products = allProducts.filter((product) => product.isActive !== false)

  const categories = [
    { id: "all", name: "Todos", icon: LayoutGrid, color: "from-blue-500 to-indigo-600" },
    ...Array.from(new Set(products.map((product) => product.category))).map((id) => ({
      id,
      name: id,
      ...getCategoryStyle(id),
    })),
  ]

  const filters = [
    { id: "popular", name: "Más Vendidos", icon: TrendingUp },
    { id: "low-stock", name: "Stock Bajo", icon: AlertTriangle },
    { id: "out-of-stock", name: "Sin Stock", icon: Package },
    { id: "high-price", name: "Precio Alto", icon: Tag },
  ]

  const getCategoryCount = (categoryId: string) => {
    if (categoryId === "all") return products.length
    return products.filter((product) => product.category === categoryId).length
  }

  const getStockStats = () => {
    const inStock = products.filter((p) => p.trackStock === false || p.stock > 5).length
    const lowStock = products.filter((p) => p.trackStock !== false && p.stock > 0 && p.stock <= 5).length
    const outOfStock = products.filter((p) => p.trackStock !== false && p.stock === 0).length
    return { inStock, lowStock, outOfStock }
  }

  const stockStats = getStockStats()

  if (collapsed) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center bg-background">
        <ScrollArea className="min-h-0 w-full flex-1">
          <div className="flex flex-col items-center gap-2 py-3">
            {categories.map((category) => {
              const Icon = category.icon
              const isSelected = selectedCategory === category.id
              return (
                <Button key={category.id} variant="ghost" onClick={() => onCategoryChange(category.id)}
                  aria-label={`${category.name}: ${getCategoryCount(category.id)} productos`} aria-pressed={isSelected}
                  title={`${category.name} (${getCategoryCount(category.id)})`}
                  className={`h-11 w-11 rounded-xl p-1 ${isSelected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"}`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${category.color} text-white`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </Button>
              )
            })}
            <Separator className="my-1 w-9" />
            {filters.map((filter) => {
              const Icon = filter.icon
              const isSelected = selectedFilter === filter.id
              return <Button key={filter.id} variant="ghost" onClick={() => onFilterChange(isSelected ? "" : filter.id)}
                aria-label={filter.name} aria-pressed={isSelected} title={filter.name}
                className={`h-11 w-11 rounded-xl ${isSelected ? "bg-primary/10 text-primary ring-2 ring-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </Button>
            })}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
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
                  aria-pressed={isSelected}
                >
                  <div className="flex w-full min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${category.color} text-white shadow-sm`}>
                      <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.1} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate font-semibold">{category.name}</div>
                      <div className={`text-xs ${isSelected ? "text-blue-100" : "text-muted-foreground"}`}>{count} productos</div>
                    </div>
                    <Badge variant="secondary" className={`ml-auto shrink-0 ${isSelected ? "bg-white/20 text-white hover:bg-white/25" : ""}`}>
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
