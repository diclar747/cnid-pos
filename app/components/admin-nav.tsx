"use client"

import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  LogOut,
  ShoppingCart,
  DollarSign,
  Building,
  Zap,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "../context/auth-context"
import { useCart } from "../context/cart-context"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { ThemeToggle } from "./theme-toggle"

const adminNavItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    color: "text-blue-600",
  },
  {
    title: "Productos",
    href: "/admin/products",
    icon: Package,
    color: "text-green-600",
  },
  {
    title: "Usuarios",
    href: "/admin/users",
    icon: Users,
    color: "text-purple-600",
  },
  {
    title: "Reportes",
    href: "/admin/sales-reports",
    icon: BarChart3,
    color: "text-orange-600",
  },
  {
    title: "Gastos",
    href: "/admin/expenses",
    icon: DollarSign,
    color: "text-red-600",
  },
  {
    title: "Configuración",
    href: "/admin/company",
    icon: Building,
    color: "text-indigo-600",
  },
]

export default function AdminNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout, syncWithDatabase: syncUsers } = useAuth()
  const { syncWithDatabase: syncProducts } = useCart()
  const [collapsed, setCollapsed] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/landing")
  }

  const goToPOS = () => {
    router.push("/pos")
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await Promise.all([syncUsers(), syncProducts()])
      alert("Sincronización completada exitosamente")
    } catch (error) {
      alert("Error durante la sincronización")
      console.error("Error de sincronización:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-300 shadow-lg dark:bg-gray-900 dark:border-gray-800",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 bg-clip-text text-transparent">
                  POS CNID
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Panel Admin</p>
              </div>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {!collapsed && (
          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Bienvenido</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{user?.name}</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200",
                  isActive &&
                    "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
                  collapsed ? "px-2" : "px-3",
                )}
                onClick={() => router.push(item.href)}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-blue-600 dark:text-blue-400" : item.color,
                    collapsed ? "mr-0" : "mr-3",
                  )}
                />
                {!collapsed && <span className="font-medium">{item.title}</span>}
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors",
            collapsed ? "px-2" : "px-3",
          )}
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <RefreshCw className={cn("h-5 w-5 text-green-600 animate-spin", collapsed ? "mr-0" : "mr-3")} />
          ) : (
            <Database className={cn("h-5 w-5 text-green-600", collapsed ? "mr-0" : "mr-3")} />
          )}
          {!collapsed && <span className="font-medium">{isSyncing ? "Sincronizando..." : "Sincronizar BD"}</span>}
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors",
            collapsed ? "px-2" : "px-3",
          )}
          onClick={goToPOS}
        >
          <ShoppingCart className={cn("h-5 w-5 text-blue-600", collapsed ? "mr-0" : "mr-3")} />
          {!collapsed && <span className="font-medium">Ir al POS</span>}
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors",
            collapsed ? "px-2" : "px-3",
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-5 w-5 text-red-600", collapsed ? "mr-0" : "mr-3")} />
          {!collapsed && <span className="font-medium">Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  )
}
