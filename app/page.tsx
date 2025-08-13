"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ShoppingCart, BarChart3, Package, Users, Settings, TrendingUp, User, Mail, Shield } from "lucide-react"
import { useAuth } from "./context/auth-context"
import { useCart } from "./context/cart-context"
import { useNotifications } from "./context/notifications-context"
import { ThemeToggle } from "./components/theme-toggle"

const quickActions = [
  {
    title: "Punto de Venta",
    description: "Iniciar nueva venta",
    href: "/pos",
    icon: ShoppingCart,
    color: "bg-blue-500",
    badge: null,
  },
  {
    title: "Administración",
    description: "Panel de control",
    href: "/admin",
    icon: Settings,
    color: "bg-purple-500",
    badge: "notifications",
  },
  {
    title: "Productos",
    description: "Gestionar inventario",
    href: "/admin/products",
    icon: Package,
    color: "bg-green-500",
    badge: "products",
  },
  {
    title: "Reportes",
    description: "Ver estadísticas",
    href: "/admin/sales-reports",
    icon: BarChart3,
    color: "bg-orange-500",
    badge: null,
  },
  {
    title: "Usuarios",
    description: "Administrar usuarios",
    href: "/admin/users",
    icon: Users,
    color: "bg-indigo-500",
    badge: null,
  },
  {
    title: "Análisis",
    description: "Métricas avanzadas",
    href: "/admin/supplier-transactions",
    icon: TrendingUp,
    color: "bg-pink-500",
    badge: null,
  },
]

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { itemCount } = useCart()
  const { notifications } = useNotifications()

  const unreadNotifications = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>

          {/* User info skeleton */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Actions grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getBadgeCount = (badgeType: string | null) => {
    switch (badgeType) {
      case "notifications":
        return unreadNotifications
      case "products":
        return itemCount
      default:
        return 0
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bienvenido a HeroUI POS</h1>
            <p className="text-muted-foreground">Sistema completo de punto de venta y gestión empresarial</p>
          </div>
          <ThemeToggle />
        </div>

        {/* User Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {user.name || "Usuario"}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {user.role || "user"}
                  </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span>
                  Items en carrito: <strong>{itemCount}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="h-4 w-4 p-0" />
                <span>
                  Notificaciones: <strong>{unreadNotifications}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>
                  Estado: <strong className="text-green-600">Activo</strong>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const badgeCount = getBadgeCount(action.badge)

            return (
              <Card key={action.title} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <Link href={action.href}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}
                        >
                          <action.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{action.title}</CardTitle>
                          <CardDescription>{action.description}</CardDescription>
                        </div>
                      </div>
                      {badgeCount > 0 && (
                        <Badge variant="destructive" className="h-6 w-6 p-0 flex items-center justify-center text-xs">
                          {badgeCount}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Link>
              </Card>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>HeroUI POS - Sistema de Punto de Venta © 2024</p>
          <p>Versión 1.0.0 - Desarrollado con Next.js y shadcn/ui</p>
        </div>
      </div>
    </div>
  )
}
