"use client"

import { useState } from "react"
import { Search, Menu, X, Scan, ShoppingCart, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { useCart } from "../context/cart-context"
import { useAuth } from "../context/auth-context"
import CategorySidebar from "../components/category-sidebar"
import ProductGrid from "../components/product-grid"
import CartSidebar from "../components/cart-sidebar"
import BarcodeScanner from "../components/barcode-scanner"
import { ThemeToggle } from "../components/theme-toggle"
import ProtectedRoute from "../components/protected-route"

export default function POSPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedFilter, setSelectedFilter] = useState("")
  const [showCategories, setShowCategories] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const { cart } = useCart()
  const { user, logout, hasPermission } = useAuth()
  const router = useRouter()

  const totalItems = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <ProtectedRoute requiredPermissions={["access_pos"]}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setShowCategories(true)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">HeroUI POS</h1>
                <p className="text-xs text-muted-foreground">
                  {user?.name} -{" "}
                  {user?.role === "admin" ? "Administrador" : user?.role === "manager" ? "Gerente" : "Cajero"}
                </p>
              </div>
            </div>

            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={showScanner} onOpenChange={setShowScanner}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Scan className="h-4 w-4 mr-2" />
                    Escáner
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <BarcodeScanner onClose={() => setShowScanner(false)} />
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                className="relative md:hidden bg-transparent"
                onClick={() => setShowCart(true)}
              >
                <ShoppingCart className="h-4 w-4" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {totalItems}
                  </Badge>
                )}
              </Button>

              <div className="hidden md:block">
                <ThemeToggle />
              </div>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hasPermission("view_dashboard") && (
                    <DropdownMenuItem onClick={() => router.push("/admin")}>
                      <Settings className="h-4 w-4 mr-2" />
                      Administración
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-73px)]">
          {/* Categories Sidebar - Desktop */}
          <div className="hidden md:block w-64 border-r bg-card/30">
            <CategorySidebar
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
            />
          </div>

          {/* Categories Sidebar - Mobile Overlay */}
          {showCategories && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowCategories(false)} />
              <div className="absolute left-0 top-0 h-full w-64 bg-background border-r">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="font-semibold">Categorías</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowCategories(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CategorySidebar
                  selectedCategory={selectedCategory}
                  onCategoryChange={(category) => {
                    setSelectedCategory(category)
                    setShowCategories(false)
                  }}
                  selectedFilter={selectedFilter}
                  onFilterChange={(filter) => {
                    setSelectedFilter(filter)
                    setShowCategories(false)
                  }}
                />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <ProductGrid searchTerm={searchTerm} selectedCategory={selectedCategory} selectedFilter={selectedFilter} />
          </div>

          {/* Cart Sidebar - Desktop */}
          <div className="hidden lg:block w-80 border-l bg-card/30">
            <CartSidebar />
          </div>

          {/* Cart Sidebar - Mobile Overlay */}
          {showCart && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
              <div className="absolute right-0 top-0 h-full w-80 bg-background border-l">
                <CartSidebar onClose={() => setShowCart(false)} />
              </div>
            </div>
          )}
        </div>

        {/* Floating Scanner Button - Mobile */}
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogTrigger asChild>
            <Button className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg md:hidden" size="sm">
              <Scan className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <BarcodeScanner onClose={() => setShowScanner(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
