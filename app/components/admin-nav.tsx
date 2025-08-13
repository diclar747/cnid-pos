"use client"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useNotifications } from "../context/notifications-context"

export default function AdminNav() {
  const pathname = usePathname()
  const { unreadCount } = useNotifications()

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">HeroUI POS</h1>
            <p className="text-sm text-muted-foreground">Panel de Administración</p>
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
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-muted/50 ${
                  isActive ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span>{unreadCount > 0 ? `${unreadCount} notificaciones pendientes` : "Sin notificaciones"}</span>
        </div>
      </div>
    </div>
  )
}
