"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Package,
  Users,
  ShoppingCart,
  Settings,
  Home,
  TrendingUp,
  DollarSign,
  Building2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useAuth } from "../context/auth-context"
import { cn } from "@/lib/utils"

interface AdminNavProps {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

export default function AdminNav({ isCollapsed, setIsCollapsed }: AdminNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const menuItems = [
    {
      title: "Dashboard",
      icon: Home,
      href: "/admin",
      badge: null,
    },
    {
      title: "Punto de Venta",
      icon: ShoppingCart,
      href: "/pos",
      badge: null,
    },
    {
      title: "Productos",
      icon: Package,
      href: "/admin/products",
      badge: "50+",
    },
    {
      title: "Usuarios",
      icon: Users,
      href: "/admin/users",
      badge: null,
    },
    {
      title: "Reportes de Ventas",
      icon: BarChart3,
      href: "/admin/sales-reports",
      badge: null,
    },
    {
      title: "Gastos",
      icon: DollarSign,
      href: "/admin/expenses",
      badge: null,
    },
    {
      title: "Compras",
      icon: TrendingUp,
      href: "/admin/purchases",
      badge: null,
    },
    {
      title: "Dashboard Compras",
      icon: BarChart3,
      href: "/admin/purchases-dashboard",
      badge: "Nuevo",
    },
    {
      title: "Proveedores",
      icon: Building2,
      href: "/admin/suppliers",
      badge: null,
    },
    {
      title: "Transacciones",
      icon: CreditCard,
      href: "/admin/supplier-transactions",
      badge: null,
    },
    {
      title: "Configuración",
      icon: Settings,
      href: "/admin/company",
      badge: null,
    },
  ]

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-3 p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600",
          isCollapsed && "justify-center p-4",
        )}
      >
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
        </div>
        {!isCollapsed && (
          <div>
            <h1 className="text-lg font-bold text-white">HeroUI Admin</h1>
            <p className="text-xs text-blue-100">Panel de Administración</p>
          </div>
        )}
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                {user?.name?.charAt(0) || "A"}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name || "Administrador"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <div key={item.href} className="relative group">
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-12 transition-all duration-200",
                  isCollapsed && "justify-center px-2",
                  isActive && "bg-blue-600 text-white shadow-md",
                  !isActive && "hover:bg-blue-50 dark:hover:bg-blue-950",
                )}
                onClick={() => {
                  router.push(item.href)
                  setIsMobileMenuOpen(false)
                }}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-white")} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.title}</span>
                    {item.badge && (
                      <Badge variant={isActive ? "secondary" : "outline"} className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Button>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.title}
                  {item.badge && <span className="ml-2 bg-blue-600 px-1 rounded text-xs">{item.badge}</span>}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer Controls */}
      <div className="p-4 border-t space-y-2">
        {/* Collapse Toggle */}
        <Button
          variant="outline"
          size="sm"
          className={cn("w-full justify-center gap-2", isCollapsed && "px-2")}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Minimizar</span>
            </>
          )}
        </Button>

        {/* Logout Button */}
        <Button
          variant="destructive"
          size="sm"
          className={cn("w-full justify-center gap-2", isCollapsed && "px-2")}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:block h-full">
        <NavContent />
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <h1 className="text-lg font-bold text-white">HeroUI Admin</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className="absolute left-0 top-0 h-full w-80 bg-background border-r"
              onClick={(e) => e.stopPropagation()}
            >
              <NavContent />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
