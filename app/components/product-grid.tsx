"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Star, Plus, Package, Search } from "lucide-react"
import { useCart } from "../context/cart-context"
import { products } from "../data/products"
import toast from "react-hot-toast"

interface ProductGridProps {
  searchTerm: string
  selectedCategory: string
  selectedFilter: string
}

export default function ProductGrid({ searchTerm, selectedCategory, selectedFilter }: ProductGridProps) {
  const { addToCart } = useCart()
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null)

  const filteredProducts = products.filter((product) => {
    // Filter by search term
    if (
      searchTerm &&
      !product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !product.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }

    // Filter by category
    if (selectedCategory !== "all" && product.category !== selectedCategory) {
      return false
    }

    // Filter by special filters
    if (selectedFilter) {
      switch (selectedFilter) {
        case "bestsellers":
          return product.popular
        case "top-rated":
          return product.rating >= 4.5
        case "offers":
          return product.discount > 0
        case "new":
          return product.isNew
        default:
          return true
      }
    }

    return true
  })

  const handleAddToCart = async (product: any) => {
    if (product.stock === 0) {
      toast.error("Producto agotado")
      return
    }

    setLoadingProduct(product.id)

    // Simulate loading
    await new Promise((resolve) => setTimeout(resolve, 500))

    addToCart(product)
    toast.success(`${product.name} agregado al carrito`)
    setLoadingProduct(null)
  }

  const getProductBadges = (product: any) => {
    const badges = []

    if (product.popular) badges.push({ text: "Popular", variant: "default" as const })
    if (product.isNew) badges.push({ text: "Nuevo", variant: "secondary" as const })
    if (product.discount > 0) badges.push({ text: `${product.discount}% OFF`, variant: "destructive" as const })
    if (product.stock <= 5 && product.stock > 0) badges.push({ text: "Stock Bajo", variant: "outline" as const })
    if (product.stock === 0) badges.push({ text: "Agotado", variant: "destructive" as const })

    return badges
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
      />
    ))
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-medium">No se encontraron productos</h3>
            <p className="text-muted-foreground">
              {searchTerm ? `No hay productos que coincidan con "${searchTerm}"` : "No hay productos en esta categoría"}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const badges = getProductBadges(product)
            const isLoading = loadingProduct === product.id

            return (
              <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all duration-200">
                <div className="relative">
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = `/placeholder.svg?height=200&width=200&text=${encodeURIComponent(product.name)}`
                      }}
                    />
                  </div>

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {badges.slice(0, 2).map((badge, index) => (
                      <Badge key={index} variant={badge.variant} className="text-xs">
                        {badge.text}
                      </Badge>
                    ))}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0 || isLoading}
                      className="bg-white text-black hover:bg-gray-100"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {product.stock === 0 ? "Agotado" : "Agregar"}
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm leading-tight line-clamp-2">{product.name}</h3>
                      <div className="flex items-center gap-1 ml-2">
                        {renderStars(product.rating)}
                        <span className="text-xs text-muted-foreground ml-1">{product.rating}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-bold text-lg">{formatPrice(product.price)}</div>
                        {product.discount > 0 && (
                          <div className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.price / (1 - product.discount / 100))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span>{product.stock}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0 || isLoading}
                      className="w-full"
                      size="sm"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {product.stock === 0 ? "Agotado" : "Agregar al Carrito"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
}
