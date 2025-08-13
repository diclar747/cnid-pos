"use client"

import { useState } from "react"
import { Search, Menu, X, ShoppingCart, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import CategorySidebar from "../components/category-sidebar"
import ProductGrid from "../components/product-grid"
import CartSidebar from "../components/cart-sidebar"
import BarcodeScanner from "../components/barcode-scanner"
import { ThemeToggle } from "../components/theme-toggle"
import { useCart } from "../context/cart-context"

export default function POSPage() {
  const [selectedCategory, setSelectedCategory] = useState("todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [showCategorySidebar, setShowCategorySidebar] = useState(false)
  const [showCartSidebar, setShowCartSidebar] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const { itemCount } = useCart()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <div className="mr-6 flex items-center space-x-2">
              <div className="w-8 h-8 btn-gradient rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span className="hidden font-bold sm:inline-block gradient-text">POS CNID</span>
            </div>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            onClick={() => setShowCategorySidebar(true)}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </Button>

          {/* Search */}
          <div className="flex flex-1 items-center space-x-2">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar productos..."
                  className="pl-8 md:w-[300px] lg:w-[400px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Scanner Button */}
            <Dialog open={showScanner} onOpenChange={setShowScanner}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex bg-transparent">
                  <Scan className="h-4 w-4 mr-2" />
                  Escanear
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Escáner de Códigos de Barras</DialogTitle>
                </DialogHeader>
                <BarcodeScanner onClose={() => setShowScanner(false)} />
              </DialogContent>
            </Dialog>

            {/* Theme Toggle - Desktop only */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            {/* Cart Button */}
            <Button
              variant="outline"
              size="sm"
              className="relative bg-transparent"
              onClick={() => setShowCartSidebar(true)}
            >
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {itemCount}
                </Badge>
              )}
              <span className="sr-only">Carrito</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container-fluid">
        <div className="flex">
          {/* Category Sidebar - Desktop */}
          <aside className="hidden w-64 shrink-0 md:block">
            <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
              <CategorySidebar selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            <div className="h-[calc(100vh-3.5rem)] overflow-auto">
              <ProductGrid selectedCategory={selectedCategory} searchTerm={searchTerm} />
            </div>
          </main>

          {/* Cart Sidebar - Desktop */}
          <aside className="hidden w-80 shrink-0 lg:block">
            <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
              <CartSidebar />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Category Sidebar Overlay */}
      {showCategorySidebar && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCategorySidebar(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-background shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Categorías</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCategorySidebar(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CategorySidebar
              selectedCategory={selectedCategory}
              onCategoryChange={(category) => {
                setSelectedCategory(category)
                setShowCategorySidebar(false)
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile Cart Sidebar Overlay */}
      {showCartSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCartSidebar(false)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-background shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Carrito</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCartSidebar(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CartSidebar onClose={() => setShowCartSidebar(false)} />
          </div>
        </div>
      )}

      {/* Mobile Scanner Button */}
      <div className="fixed bottom-4 right-4 sm:hidden">
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg">
              <Scan className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Escáner de Códigos de Barras</DialogTitle>
            </DialogHeader>
            <BarcodeScanner onClose={() => setShowScanner(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
