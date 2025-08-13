"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Star, Plus, ShoppingCart, Package, AlertTriangle } from "lucide-react"
import { useCart } from "../context/cart-context"
import { toast } from "react-hot-toast"

interface ProductGridProps {
  selectedCategory: string
  searchTerm: string
}

export default function ProductGrid({ selectedCategory, searchTerm }: ProductGridProps) {
  const { products, addToCart } = useCart()
  const [loadingProduct, setLoadingProduct] = useState<number | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return []

    let filtered = products

    // Filtrar por categoría
    if (selectedCategory !== "todos") {
      if (["mas-vendidos", "mejor-valorados", "ofertas", "nuevos"].includes(selectedCategory)) {
        // Filtros especiales
        switch (selectedCategory) {
          case "mas-vendidos":
            filtered = products.filter((p) => p.id <= 5) // Primeros 5 como más vendidos
            break
          case "mejor-valorados":
            filtered = products.filter((p) => p.id % 2 === 0) // Productos pares como mejor valorados
            break
          case "ofertas":
            filtered = products.filter((p) => p.id % 3 === 0) // Productos múltiplos de 3 como ofertas
            break
          case "nuevos":
            filtered = products.filter((p) => p.id > 10) // Últimos productos como nuevos
            break
        }
      } else {
        // Filtrar por categoría normal
        filtered = products.filter((product) => product.category.toLowerCase() === selectedCategory.toLowerCase())
      }
    }

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    return filtered
  }, [products, selectedCategory, searchTerm])

  const handleAddToCart = async (product: any) => {
    if (product.stock <= 0) {
      toast.error("Producto agotado")
      return
    }

    setLoadingProduct(product.id)

    try {
      // Simular delay para mejor UX
      await new Promise((resolve) => setTimeout(resolve, 300))

      addToCart(product)
      toast.success(`${product.name} agregado al carrito`)
    } catch (error) {
      toast.error("Error al agregar producto")
    } finally {
      setLoadingProduct(null)
    }
  }

  const getProductBadges = (product: any) => {
    const badges = []

    // Badge de stock
    if (product.stock === 0) {
      badges.push({ text: "Agotado", variant: "destructive" as const })
    } else if (product.stock <= 2) {
      badges.push({ text: "Últimas unidades", variant: "destructive" as const })
    } else if (product.stock <= 5) {
      badges.push({ text: "Stock bajo", variant: "secondary" as const })
    }

    // Badges especiales según filtros
    if (selectedCategory === "mas-vendidos" && product.id <= 5) {
      badges.push({ text: "Popular", variant: "default" as const })
    }
    if (selectedCategory === "ofertas" && product.id % 3 === 0) {
      badges.push({ text: "Oferta", variant: "destructive" as const })
    }
    if (selectedCategory === "nuevos" && product.id > 10) {
      badges.push({ text: "Nuevo", variant: "secondary" as const })
    }

    return badges
  }

  const getRating = (productId: number) => {
    // Generar rating simulado basado en ID
    const ratings = [4.2, 4.5, 4.8, 4.1, 4.7, 4.3, 4.6, 4.4, 4.9, 4.0]
    return ratings[productId % ratings.length] || 4.5
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay productos disponibles</h3>
        <p className="text-muted-foreground">Los productos se cargarán automáticamente cuando estén disponibles.</p>
      </div>
    )
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No se encontraron productos</h3>
        <p className="text-muted-foreground">Intenta cambiar los filtros o el término de búsqueda.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {selectedCategory === "todos"
            ? "Todos los Productos"
            : selectedCategory === "mas-vendidos"
              ? "Más Vendidos"
              : selectedCategory === "mejor-valorados"
                ? "Mejor Valorados"
                : selectedCategory === "ofertas"
                  ? "Ofertas Especiales"
                  : selectedCategory === "nuevos"
                    ? "Productos Nuevos"
                    : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
        </h2>
        <p className="text-muted-foreground">
          {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
          {searchTerm && ` encontrado${filteredProducts.length !== 1 ? "s" : ""} para "${searchTerm}"`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const badges = getProductBadges(product)
          const rating = getRating(product.id)
          const isLoading = loadingProduct === product.id
          const isOutOfStock = product.stock <= 0

          return (
            <Card key={product.id} className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
              <div className="relative">
                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `/placeholder.svg?height=200&width=200&text=${encodeURIComponent(product.name.charAt(0))}`
                    }}
                  />
                </div>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {badges.map((badge, index) => (
                    <Badge key={index} variant={badge.variant} className="text-xs">
                      {badge.text}
                    </Badge>
                  ))}
                </div>

                {/* Stock indicator */}
                <div className="absolute top-2 right-2">
                  {isOutOfStock ? (
                    <div className="bg-red-500 text-white p-1 rounded-full">
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                  ) : product.stock <= 5 ? (
                    <Badge variant="outline" className="bg-white/90 text-xs">
                      {product.stock} left
                    </Badge>
                  ) : null}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200"
                    onClick={() => handleAddToCart(product)}
                    disabled={isLoading || isOutOfStock}
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1" />
                    )}
                    {isOutOfStock ? "Agotado" : "Agregar"}
                  </Button>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</h3>

                  <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.floor(rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : i < rating
                                ? "fill-yellow-200 text-yellow-400"
                                : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-lg text-primary">{formatCurrency(product.price)}</p>
                      <p className="text-xs text-muted-foreground">Stock: {product.stock} unidades</p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddToCart(product)}
                      disabled={isLoading || isOutOfStock}
                      className="shrink-0"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
