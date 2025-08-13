"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Minus, ShoppingCart, Package, Search } from "lucide-react"
import { useCart } from "../context/cart-context"
import { products } from "../data/products"
import Image from "next/image"

interface ProductGridProps {
  searchTerm: string
  selectedCategory: string
  selectedFilter: string
}

export default function ProductGrid({ searchTerm, selectedCategory, selectedFilter }: ProductGridProps) {
  const { cart, addToCart, updateQuantity } = useCart()
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({})

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search by name, description, or barcode
      const matchesSearch =
        searchTerm === "" ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.toLowerCase().includes(searchTerm.toLowerCase())

      // Filter by category
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory

      // Filter by additional filters
      let matchesFilter = true
      if (selectedFilter === "low-stock") {
        matchesFilter = product.stock <= 5
      } else if (selectedFilter === "out-of-stock") {
        matchesFilter = product.stock === 0
      } else if (selectedFilter === "popular") {
        matchesFilter = product.isPopular || false
      }

      return matchesSearch && matchesCategory && matchesFilter
    })
  }, [searchTerm, selectedCategory, selectedFilter])

  const getCartQuantity = (productId: string) => {
    const cartItem = cart?.find((item) => item.id === productId)
    return cartItem?.quantity || 0
  }

  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = Number.parseInt(value) || 0
    setQuantities({ ...quantities, [productId]: quantity })
  }

  const handleAddToCart = (product: any) => {
    const quantity = quantities[product.id] || 1
    addToCart(product, quantity)
    setQuantities({ ...quantities, [product.id]: 1 }) // Reset to 1 after adding
  }

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      updateQuantity(productId, 0) // This will remove the item
    } else {
      updateQuantity(productId, newQuantity)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(price)
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {searchTerm ? (
            <Search className="h-12 w-12 text-gray-400" />
          ) : (
            <Package className="h-12 w-12 text-gray-400" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {searchTerm ? "No se encontraron productos" : "No hay productos disponibles"}
        </h3>
        <p className="text-gray-600 max-w-md">
          {searchTerm
            ? `No encontramos productos que coincidan con "${searchTerm}". Intenta con otro término de búsqueda o código de barras.`
            : "No hay productos disponibles en esta categoría."}
        </p>
        {searchTerm && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Consejo:</strong> Puedes buscar por nombre del producto o código de barras (ej: 7891234567890-801)
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Productos</h2>
            <p className="text-muted-foreground">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
              {searchTerm && ` encontrado${filteredProducts.length !== 1 ? "s" : ""} para "${searchTerm}"`}
            </p>
          </div>
          {searchTerm && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Búsqueda: {searchTerm}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const cartQuantity = getCartQuantity(product.id)
          const inputQuantity = quantities[product.id] || 1

          return (
            <Card key={product.id} className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
              <div className="relative">
                <div className="aspect-square bg-gray-50 overflow-hidden">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                {/* Stock Badge */}
                <div className="absolute top-2 left-2">
                  {product.stock <= 5 && product.stock > 0 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Stock Bajo
                    </Badge>
                  )}
                  {product.stock === 0 && <Badge variant="destructive">Agotado</Badge>}
                </div>

                {/* Popular Badge */}
                {product.isPopular && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-600 text-white">Popular</Badge>
                  </div>
                )}

                {/* Price */}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-semibold">
                  {formatPrice(product.price)}
                </div>
              </div>

              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">Código: {product.barcode}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Stock: {product.stock}</span>
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  </div>

                  {cartQuantity > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          En carrito: {cartQuantity}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 bg-transparent"
                            onClick={() => handleUpdateQuantity(product.id, cartQuantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{cartQuantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 bg-transparent"
                            onClick={() => handleUpdateQuantity(product.id, cartQuantity + 1)}
                            disabled={cartQuantity >= product.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max={product.stock}
                          value={inputQuantity}
                          onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                          className="w-20 h-9 text-center"
                        />
                        <Button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock === 0 || inputQuantity > product.stock}
                          className="flex-1 h-9"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
