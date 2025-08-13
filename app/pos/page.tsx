"use client"

import type React from "react"
import Link from "next/link"
import { ThemeToggle } from "../components/theme-toggle"

import { useState, useRef, useEffect } from "react"
import { Search, Scan, LogOut, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import ProductGrid from "../components/product-grid"
import CartSidebar from "../components/cart-sidebar"
import CategorySidebar from "../components/category-sidebar"
import BarcodeScanner from "../components/barcode-scanner"
import ProtectedRoute from "../components/protected-route"
import { useAuth } from "../context/auth-context"
import { useCart } from "../context/cart-context"
import { useRouter } from "next/navigation"

function POSContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [lastScannedProduct, setLastScannedProduct] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { user, logout, isAdmin } = useAuth()
  const { addToCartByBarcode, products } = useCart()
  const router = useRouter()

  // Mantener el foco en el campo de búsqueda
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [lastScannedProduct])

  const handleProductScanned = (productName: string) => {
    setLastScannedProduct(productName)
    setTimeout(() => {
      setLastScannedProduct("")
    }, 3000)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)

    // Detectar si es un código de barras (13 dígitos)
    if (value.length === 13 && /^\d+$/.test(value)) {
      const success = addToCartByBarcode(value)
      if (success) {
        const product = products.find((p) => p.barcode === value)
        if (product) {
          handleProductScanned(product.name)
          // Limpiar el campo de búsqueda y mantener el foco
          setSearchQuery("")
          if (searchInputRef.current) {
            searchInputRef.current.focus()
          }
        }
      } else {
        // Si no encuentra el producto, mostrar mensaje
        setLastScannedProduct("Producto no encontrado")
        setTimeout(() => {
          setLastScannedProduct("")
          setSearchQuery("")
        }, 2000)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Si presiona Enter y hay texto, buscar por nombre
    if (e.key === "Enter" && searchQuery.trim()) {
      const product = products.find(
        (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode === searchQuery,
      )

      if (product) {
        addToCartByBarcode(product.barcode)
        handleProductScanned(product.name)
        setSearchQuery("")
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/landing")
  }

  const goToAdmin = () => {
    router.push("/admin")
  }

  return (
    <div className="flex h-screen bg-background">
      <CategorySidebar selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="sticky top-0 z-10 bg-background p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold">Punto de Venta</h1>
              <p className="text-sm text-muted-foreground">
                Usuario: {user?.name} ({user?.role === "admin" ? "Administrador" : "Cajero"})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/landing">
                <Button variant="outline" size="sm" className="bg-transparent">
                  Ver Landing
                </Button>
              </Link>
              <div className="relative w-80">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar por nombre o escanear código de barras..."
                  className="pl-8 text-lg input-adaptive"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
              </div>
              <Button onClick={() => setIsScannerOpen(true)} className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Cámara
              </Button>
              <ThemeToggle />
              {isAdmin && (
                <Button variant="outline" onClick={goToAdmin} className="flex items-center gap-2 bg-transparent">
                  <Settings className="h-4 w-4" />
                  Admin
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 bg-transparent">
                <LogOut className="h-4 w-4" />
                Salir
              </Button>
            </div>
          </div>

          {lastScannedProduct && (
            <div
              className={`px-4 py-2 rounded ${
                lastScannedProduct === "Producto no encontrado"
                  ? "bg-red-100 border border-red-400 text-red-700"
                  : "bg-green-100 border border-green-400 text-green-700"
              }`}
            >
              {lastScannedProduct === "Producto no encontrado"
                ? "❌ Producto no encontrado"
                : `✅ Producto agregado: ${lastScannedProduct}`}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          <ProductGrid category={selectedCategory} searchQuery={searchQuery} />
        </div>
      </main>

      <CartSidebar />

      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onProductScanned={handleProductScanned}
      />
    </div>
  )
}

export default function POSPage() {
  return (
    <ProtectedRoute>
      <POSContent />
    </ProtectedRoute>
  )
}
