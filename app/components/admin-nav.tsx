"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  Receipt,
  Building2,
  ShoppingCart,
  Truck,
  FileText,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useNotifications } from "../context/notifications-context"
import { useAuth } from "../context/auth-context"

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { unreadCount } = useNotifications()
  const { logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const navItems = [
    {
      title: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      description: "Vista general del sistema",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      title: "Productos",
      href: "/admin/products",
      icon: Package,
      description: "Gestión de inventario",
    },
    {
      title: "Usuarios",
      href: "/admin/users",
      icon: Users,
      description: "Administrar empleados",
    },
    {
      title: "Reportes de Ventas",
      href: "/admin/sales-reports",
      icon: BarChart3,
      description: "Análisis y estadísticas",
    },
    {
      title: "Gastos",
      href: "/admin/expenses",
      icon: Receipt,
      description: "Control de gastos",
    },
    {
      title: "Empresa",
      href: "/admin/company",
      icon: Building2,
      description: "Configuración general",
    },
    {
      title: "Compras",
      href: "/admin/purchases",
      icon: ShoppingCart,
      description: "Gestión de compras",
    },
    {
      title: "Dashboard Compras",
      href: "/admin/purchases-dashboard",
      icon: Truck,
      description: "Análisis de compras",
    },
    {
      title: "Proveedores",
      href: "/admin/suppliers",
      icon: Truck,
      description: "Gestión de proveedores",
    },
    {
      title: "Transacciones",
      href: "/admin/supplier-transactions",
      icon: FileText,
      description: "Historial de transacciones",
    },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white shadow-md"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-0
        ${isCollapsed ? "w-16" : "w-80"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        transition-all duration-300 ease-in-out
        bg-white border-r border-gray-200 shadow-lg lg:shadow-none
        flex flex-col h-full
      `}
      >
        {/* Header */}
        <div className={`p-6 border-b ${isCollapsed ? "px-3" : ""}`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    CNID POS
                  </h1>
                  <p className="text-sm text-muted-foreground">Panel de Administración</p>
                </div>
              )}
            </div>

            {/* Desktop Collapse Button */}
            <div className="hidden lg:block">
              <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5">
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                    hover:bg-muted/50 group relative
                    ${isActive ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md" : ""}
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />

                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className={`text-xs truncate ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                        {item.description}
                      </div>
                    </div>
                  )}

                  {!isCollapsed && item.badge && (
                    <Badge variant={isActive ? "secondary" : "secondary"} className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.title}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className={`p-4 border-t space-y-3 ${isCollapsed ? "px-2" : ""}`}>
          {/* Notifications */}
          <div
            className={`flex items-center gap-2 text-sm text-muted-foreground ${isCollapsed ? "justify-center" : ""}`}
          >
            <Bell className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>{unreadCount > 0 ? `${unreadCount} notificaciones` : "Sin notificaciones"}</span>}
          </div>

          {/* Logout Button */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 ${isCollapsed ? "px-2" : ""}`}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </Button>

          {/* Tooltip for logout in collapsed state */}
          {isCollapsed && (
            <div className="relative group">
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Cerrar Sesión
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
