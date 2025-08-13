"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "../context/notifications-context"
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  DollarSign,
  ShoppingCart,
  Building2,
  FileText,
  Truck,
  TrendingUp,
  Bell,
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Resumen general del sistema",
    badge: null,
  },
  {
    name: "Productos",
    href: "/admin/products",
    icon: Package,
    description: "Gestión de inventario",
    badge: null,
  },
  {
    name: "Usuarios",
    href: "/admin/users",
    icon: Users,
    description: "Administrar usuarios",
    badge: null,
  },
  {
    name: "Reportes de Ventas",
    href: "/admin/sales-reports",
    icon: BarChart3,
    description: "Análisis de ventas",
    badge: null,
  },
  {
    name: "Gastos",
    href: "/admin/expenses",
    icon: DollarSign,
    description: "Control de gastos",
    badge: null,
  },
  {
    name: "Compras",
    href: "/admin/purchases",
    icon: ShoppingCart,
    description: "Gestión de compras",
    badge: null,
  },
  {
    name: "Dashboard Compras",
    href: "/admin/purchases-dashboard",
    icon: TrendingUp,
    description: "Análisis de compras",
    badge: null,
  },
  {
    name: "Proveedores",
    href: "/admin/suppliers",
    icon: Truck,
    description: "Gestión de proveedores",
    badge: null,
  },
  {
    name: "Transacciones",
    href: "/admin/supplier-transactions",
    icon: FileText,
    description: "Historial de transacciones",
    badge: null,
  },
  {
    name: "Empresa",
    href: "/admin/company",
    icon: Building2,
    description: "Configuración empresarial",
    badge: null,
  },
]

export default function AdminNav() {
  const pathname = usePathname()
  const { notifications } = useNotifications()

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-gray-200 dark:border-gray-800 px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">HeroUI POS</h1>
            <p className="text-xs text-muted-foreground">Panel Administrativo</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            // Agregar badge de notificaciones al Dashboard
            const showNotificationBadge = item.href === "/admin" && unreadCount > 0

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    {showNotificationBadge && (
                      <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span>{unreadCount > 0 ? `${unreadCount} notificaciones` : "Sin notificaciones"}</span>
        </div>
      </div>
    </div>
  )
}
