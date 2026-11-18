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
  ClipboardList,
  LogOut,
  Menu,
  X,
  Armchair,
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

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo cerrar sesión")
    }
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
      badge: null,
      permission: "manage_products",
    },
    {
      title: "Usuarios",
      icon: Users,
      href: "/admin/users",
      badge: null,
      permission: "manage_users",
    },
    {
      title: "Reportes de Ventas",
      icon: BarChart3,
      href: "/admin/sales-reports",
      badge: null,
      permission: "view_reports",
    },
    {
      title: "Gastos",
      icon: DollarSign,
      href: "/admin/expenses",
      badge: null,
      permission: "manage_expenses",
    },
    {
      title: "Compras",
      icon: TrendingUp,
      href: "/admin/purchases",
      badge: null,
      permission: "manage_purchases",
    },
    {
      title: "Salones y mesas",
      icon: Armchair,
      href: "/admin/dining",
      badge: null,
      permission: "manage_company",
    },
    {
      title: "Órdenes de compra",
      icon: ClipboardList,
      href: "/admin/purchase-orders",
      badge: null,
      permission: "manage_purchases",
    },
    {
      title: "Dashboard Compras",
      icon: BarChart3,
      href: "/admin/purchases-dashboard",
      badge: null,
      permission: "manage_purchases",
    },
    {
      title: "Proveedores",
      icon: Building2,
      href: "/admin/suppliers",
      badge: null,
      permission: "manage_suppliers",
    },
    {
      title: "Transacciones",
      icon: CreditCard,
      href: "/admin/supplier-transactions",
      badge: null,
      permission: "manage_suppliers",
    },
    {
      title: "Configuración",
      icon: Settings,
      href: "/admin/company",
      badge: null,
      permission: "manage_company",
    },
  ]

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          "relative flex items-center gap-3 border-b border-white/10 p-4",
          isCollapsed && "justify-center px-2",
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-900/40">
          <ShoppingCart className="h-5 w-5 text-white" />
        </div>
        {!isCollapsed && (
          <div>
            <h1 className="text-base font-bold text-white">CNID POS</h1>
            <p className="text-xs text-indigo-200/65">Panel de administración</p>
          </div>
        )}
        <button type="button" onClick={() => setIsCollapsed(!isCollapsed)} className={cn("hidden rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white md:inline-flex", isCollapsed && "absolute -right-3 top-5 z-10 border border-slate-700 bg-slate-900")} aria-label={isCollapsed ? "Expandir menú" : "Minimizar menú"} title={isCollapsed ? "Expandir menú" : "Minimizar menú"}>{isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <span className="text-sm font-semibold text-cyan-200">
                {user?.name?.charAt(0) || "A"}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name || "Administrador"}</p>
              <p className="max-w-[160px] truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Items */}
          <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-3" aria-label="Menú principal">
        {menuItems.filter((item) => !item.permission || user?.permissions.includes(item.permission)).map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <div key={item.href} className="relative group">
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "h-10 w-full justify-start gap-3 rounded-xl text-slate-300 transition-all duration-200 hover:text-white",
                  isCollapsed && "justify-center px-2",
                  isActive && "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-950/30",
                  !isActive && "hover:bg-white/10 hover:text-white",
                )}
                onClick={() => {
                  router.push(item.href)
                  setIsMobileMenuOpen(false)
                }}
                title={isCollapsed ? item.title : undefined}
                aria-label={isCollapsed ? item.title : undefined}
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
      <div className="space-y-2 border-t border-slate-800 p-3">
        {/* Logout Button */}
        <Button
          variant="destructive"
          size="sm"
          className={cn("w-full justify-center gap-2 bg-transparent text-slate-300 hover:bg-rose-600 hover:text-white", isCollapsed && "px-2")}
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
      <div className="hidden h-full bg-gradient-to-b from-[#111b3f] via-[#111b36] to-[#0b1227] md:block">
        <NavContent />
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#111b3f] to-[#182d65] p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">CNID POS</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => { setIsCollapsed(false); setIsMobileMenuOpen(!isMobileMenuOpen) }}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className="absolute left-0 top-0 h-full w-72 border-r border-white/10 bg-gradient-to-b from-[#111b3f] to-[#0b1227]"
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
