"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus, AlertTriangle } from "lucide-react"
import { products, type Product } from "../data/products"
import { useCart } from "../context/cart-context"
import Image from "next/image"

interface ProductGridProps {
  searchTerm: string
  selectedCategory: string
  selectedFilter: string
}

export default function ProductGrid({ searchTerm, selectedCategory, selectedFilter }: ProductGridProps) {
  const { addToCart, cart } = useCart()

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product) => product.isActive)

    // Filter by search term (name or barcode)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchLower) ||
          product.barcode?.includes(searchTerm) ||
          product.description?.toLowerCase().includes(searchLower),
      )
    }

    // Filter by category
    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((product) => product.category === selectedCategory)
    }

    // Filter by additional filters
    if (selectedFilter) {
      switch (selectedFilter) {
        case "low-stock":
          filtered = filtered.filter((product) => product.stock < 20 && product.stock > 0)
          break
        case "out-of-stock":
          filtered = filtered.filter((product) => product.stock === 0)
          break
        case "high-price":
          filtered = filtered.filter((product) => product.price > 30000)
          break
        case "popular":
          // Sort by stock (assuming lower stock means more popular)
          filtered = filtered.sort((a, b) => a.stock - b.stock)
          break
      }
    }

    return filtered
  }, [searchTerm, selectedCategory, selectedFilter])

  const getCartQuantity = (productId: number) => {
    const cartItem = cart?.find((item) => item.id === productId)
    return cartItem?.quantity || 0
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const handleAddToCart = (product: Product) => {
    if (product.stock > 0) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      })
    }
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">No se encontraron productos</h3>
        <p className="text-muted-foreground">
          {searchTerm
            ? `No hay productos que coincidan con "${searchTerm}"`
            : "No hay productos disponibles con los filtros seleccionados"}
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{searchTerm ? `Resultados para "${searchTerm}"` : "Productos"}</h2>
        <Badge variant="secondary">{filteredProducts.length} productos</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const cartQuantity = getCartQuantity(product.id)
          const isOutOfStock = product.stock === 0
          const isLowStock = product.stock < 10 && product.stock > 0

          return (
            <Card
              key={product.id}
              className={`hover:shadow-lg transition-all duration-200 ${
                isOutOfStock ? "opacity-60" : ""
              } ${cartQuantity > 0 ? "ring-2 ring-blue-200 dark:ring-blue-800" : ""}`}
            >
              <CardContent className="p-4">
                <div className="relative mb-3">
                  <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  </div>

                  {/* Stock badges */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {isOutOfStock && (
                      <Badge variant="destructive" className="text-xs">
                        Sin Stock
                      </Badge>
                    )}
                    {isLowStock && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Bajo Stock
                      </Badge>
                    )}
                    {cartQuantity > 0 && (
                      <Badge className="text-xs bg-blue-100 text-blue-800">En Carrito: {cartQuantity}</Badge>
                    )}
                  </div>

                  {/* Barcode display */}
                  {product.barcode && (
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="outline" className="text-xs">
                        {product.barcode}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-green-600">{formatPrice(product.price)}</span>
                    <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {cartQuantity > 0 ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 bg-transparent"
                          onClick={() => {
                            // Remove one item from cart
                            const currentItem = cart?.find((item) => item.id === product.id)
                            if (currentItem && currentItem.quantity > 1) {
                              addToCart({
                                id: product.id,
                                name: product.name,
                                price: product.price,
                                image: product.image,
                                quantity: -1,
                              })
                            }
                          }}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium min-w-[2rem] text-center">{cartQuantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 bg-transparent"
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock || cartQuantity >= product.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {isOutOfStock ? "Sin Stock" : "Agregar"}
                      </Button>
                    )}
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
