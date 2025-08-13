"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./context/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Users, BarChart3, Package } from "lucide-react"

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/pos")
      }
    }
  }, [user, router])

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">HeroUI POS</h1>
          <p className="text-xl text-gray-600 mb-8">Sistema completo de punto de venta para tu negocio</p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => router.push("/login")} className="bg-blue-600 hover:bg-blue-700">
              Iniciar Sesión
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push("/landing")}>
              Ver Demo
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <ShoppingCart className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Punto de Venta</CardTitle>
              <CardDescription>Interfaz intuitiva para procesar ventas rápidamente</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Package className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>Inventario</CardTitle>
              <CardDescription>Control completo de productos y stock en tiempo real</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>Reportes</CardTitle>
              <CardDescription>Análisis detallado de ventas y rendimiento</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>Gestión de empleados y permisos de acceso</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">¿Listo para comenzar?</CardTitle>
              <CardDescription>Únete a miles de negocios que ya confían en HeroUI POS</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => router.push("/login")} className="bg-blue-600 hover:bg-blue-700">
                Comenzar Ahora
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
