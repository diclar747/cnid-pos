"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Minus, ShoppingCart, Package, Search } from "lucide-react"
import { useCart } from "../context/cart-context"
import { useSales } from "../context/sales-context"
import type { Product } from "../data/products"
import Image from "next/image"
import { basePrice, effectivePrice, hasPromo } from "@/lib/product-price"
import Link from "next/link"
import RestaurantNavigation from "./restaurant-navigation"

interface ProductGridProps {
  searchTerm: string
  selectedCategory: string
  selectedMenu: string
  selectedFilter: string
  onAddProduct?: (product: Product, quantity: number) => void
}

export default function ProductGrid({ searchTerm, selectedCategory, selectedMenu, selectedFilter, onAddProduct }: ProductGridProps) {
  const { cart, products, addToCart, updateQuantity, orderType } = useCart()
  const { getTopProducts } = useSales()
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({})
  const popularNames = useMemo(() => new Set(getTopProducts(6).map((item) => item.productName)), [getTopProducts])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (product.isActive === false) return false
      // Search by name, description, or barcode
      const matchesSearch =
        searchTerm === "" ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.menuName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filter by category
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      const matchesMenu = selectedMenu === "all" || product.menuName === selectedMenu

      // Filter by additional filters
      let matchesFilter = true
      if (selectedFilter === "low-stock") {
        matchesFilter = product.trackStock !== false && product.stock <= 5
      } else if (selectedFilter === "out-of-stock") {
        matchesFilter = product.trackStock !== false && product.stock === 0
      } else if (selectedFilter === "high-price") {
        matchesFilter = product.price > 30000
      } else if (selectedFilter === "popular") {
        matchesFilter = popularNames.has(product.name)
      }

      return matchesSearch && matchesCategory && matchesMenu && matchesFilter
    })
  }, [products, searchTerm, selectedCategory, selectedMenu, selectedFilter, popularNames])

  const getCartQuantity = (productId: number) => {
    const cartItem = cart?.find((item) => item.id === productId)
    return cart.filter((item) => item.id === productId).reduce((sum, item) => sum + item.quantity, 0)
  }

  const handleQuantityChange = (productId: number, value: string) => {
    const quantity = Number.parseInt(value) || 0
    setQuantities({ ...quantities, [productId]: quantity })
  }

  const handleAddToCart = (product: Product) => {
    const quantity = quantities[product.id] || 1
    if (product.modifierGroups?.length && onAddProduct) onAddProduct(product, quantity)
    else addToCart(product, quantity)
    setQuantities({ ...quantities, [product.id]: 1 }) // Reset to 1 after adding
  }

  const handleUpdateQuantity = (productId: number, newQuantity: number) => {
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
    <div className="p-3 pb-[env(safe-area-inset-bottom)] sm:p-6">
      <div className="mb-6 rounded-3xl border border-indigo-100/80 bg-white/80 p-4 shadow-sm shadow-indigo-100/50 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 sm:p-5">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="shrink-0">
            <p className="mb-1 text-xs font-bold uppercase tracking-[.2em] text-indigo-600 dark:text-indigo-300">Catálogo del restaurante</p><h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Productos</h2>
            <p className="text-muted-foreground">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
              {searchTerm && ` encontrado${filteredProducts.length !== 1 ? "s" : ""} para "${searchTerm}"`}
            </p>
            <Link href="/photo-credits" className="mt-1 inline-block text-xs text-blue-700 underline-offset-2 hover:underline">
              Fotos ilustrativas · créditos
            </Link>
          </div>
          <RestaurantNavigation />
        </div>
        {searchTerm && <Badge variant="outline" className="mt-2 border-blue-200 bg-blue-50 text-blue-700">Búsqueda: {searchTerm}</Badge>}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4 xl:gap-5">
        {filteredProducts.map((product) => {
          const cartQuantity = getCartQuantity(product.id)
          const inputQuantity = quantities[product.id] || 1

          return (
            <Card key={product.id} className="group overflow-hidden rounded-3xl border-indigo-100/80 bg-white/95 shadow-sm shadow-indigo-100/50 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-200/40 dark:border-slate-800 dark:bg-slate-900">
              <div className="relative">
                <div className="aspect-[2/1] overflow-hidden bg-gray-50 sm:aspect-square">
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
                  {product.trackStock !== false && product.stock <= 5 && product.stock > 0 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Stock Bajo
                    </Badge>
                  )}
                  {product.trackStock !== false && product.stock === 0 && <Badge variant="destructive">Agotado</Badge>}
                </div>

                {/* Popular Badge */}
                {popularNames.has(product.name) && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-600 text-white">Popular</Badge>
                  </div>
                )}

                {/* Price */}
                <div className="absolute bottom-3 right-3 rounded-full bg-slate-950/85 px-3 py-1.5 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
                  {hasPromo(product, orderType) && <span className="mr-1 text-xs line-through opacity-70">{formatPrice(basePrice(product, orderType))}</span>}{formatPrice(effectivePrice(product, orderType))}
                </div>
              </div>

              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
                    {product.menuName && <p className="text-xs font-medium text-blue-600">{product.menuName}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">Código: {product.barcode}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{product.trackStock === false ? "Preparación disponible" : `Stock: ${product.stock}`}</span>
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  </div>

                  {cartQuantity > 0 && !product.modifierGroups?.length ? (
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
                            disabled={product.trackStock !== false && cartQuantity >= product.stock}
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
                          max={product.trackStock === false ? undefined : product.stock}
                          value={inputQuantity}
                          onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                          className="w-20 h-9 text-center"
                        />
                        <Button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.trackStock !== false && (product.stock === 0 || inputQuantity > product.stock)}
                          className="flex-1 h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700"
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
