"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Scan,
  Receipt,
  Star,
  ArrowRight,
  CheckCircle,
  Smartphone,
  Cloud,
  Shield,
} from "lucide-react"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const router = useRouter()

  const features = [
    {
      icon: ShoppingCart,
      title: "Punto de Venta Intuitivo",
      description: "Interfaz moderna y fácil de usar para procesar ventas rápidamente",
      color: "text-blue-600",
    },
    {
      icon: Package,
      title: "Gestión de Inventario",
      description: "Control completo de productos, stock y alertas automáticas",
      color: "text-green-600",
    },
    {
      icon: BarChart3,
      title: "Reportes Avanzados",
      description: "Análisis detallado de ventas, productos más vendidos y métricas",
      color: "text-purple-600",
    },
    {
      icon: Users,
      title: "Multi-usuario",
      description: "Gestión de empleados con diferentes niveles de acceso",
      color: "text-orange-600",
    },
    {
      icon: Scan,
      title: "Escáner de Códigos",
      description: "Lectura de códigos de barras con cámara o entrada manual",
      color: "text-cyan-600",
    },
    {
      icon: Receipt,
      title: "Facturación Digital",
      description: "Generación automática de recibos y facturas",
      color: "text-pink-600",
    },
  ]

  const benefits = [
    "Interfaz responsive para móvil, tablet y desktop",
    "Modo oscuro y claro automático",
    "Alertas de stock en tiempo real",
    "Backup automático de datos",
    "Soporte técnico 24/7",
    "Actualizaciones gratuitas",
  ]

  const testimonials = [
    {
      name: "María González",
      business: "Restaurante El Sabor",
      rating: 5,
      comment: "HeroUI POS transformó completamente nuestro negocio. Ahora procesamos ventas 3x más rápido.",
    },
    {
      name: "Carlos Mendoza",
      business: "Supermercado Central",
      rating: 5,
      comment: "El control de inventario es excelente. Las alertas de stock nos han ahorrado mucho dinero.",
    },
    {
      name: "Ana Rodríguez",
      business: "Cafetería Luna",
      rating: 5,
      comment: "Fácil de usar y muy completo. Mis empleados lo aprendieron en minutos.",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">HeroUI POS</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.push("/login")}>
                Iniciar Sesión
              </Button>
              <Button onClick={() => router.push("/login")}>Comenzar Gratis</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            ✨ Nuevo: Escáner de códigos integrado
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            El Sistema POS
            <br />
            <span className="text-blue-600">Más Completo</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Gestiona tu negocio con la plataforma más moderna y fácil de usar. Desde pequeños comercios hasta grandes
            restaurantes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => router.push("/login")} className="text-lg px-8 py-3">
              Probar Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push("/pos")} className="text-lg px-8 py-3">
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Funcionalidades Completas</h2>
            <p className="text-xl text-muted-foreground">Todo lo que necesitas para gestionar tu negocio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div
                      className={`w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4`}
                    >
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">¿Por qué elegir HeroUI POS?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Diseñado específicamente para el mercado paraguayo, con todas las funcionalidades que tu negocio
                necesita.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 text-center">
                <Smartphone className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Responsive</h3>
                <p className="text-sm text-muted-foreground">Funciona en cualquier dispositivo</p>
              </Card>
              <Card className="p-6 text-center">
                <Cloud className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">En la Nube</h3>
                <p className="text-sm text-muted-foreground">Accede desde cualquier lugar</p>
              </Card>
              <Card className="p-6 text-center">
                <Shield className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Seguro</h3>
                <p className="text-sm text-muted-foreground">Datos protegidos y encriptados</p>
              </Card>
              <Card className="p-6 text-center">
                <BarChart3 className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Analytics</h3>
                <p className="text-sm text-muted-foreground">Reportes detallados</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Lo que dicen nuestros clientes</h2>
            <p className="text-xl text-muted-foreground">Miles de negocios ya confían en HeroUI POS</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: testimonial.rating }, (_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <CardDescription className="text-base italic">"{testimonial.comment}"</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.business}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">¿Listo para comenzar?</h2>
          <p className="text-xl mb-8 opacity-90">Únete a miles de negocios que ya están creciendo con HeroUI POS</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => router.push("/login")} className="text-lg px-8 py-3">
              Comenzar Gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/pos")}
              className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600"
            >
              Ver Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">HeroUI POS</span>
              </div>
              <p className="text-muted-foreground">El sistema de punto de venta más completo para tu negocio.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Producto</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Funcionalidades</li>
                <li>Precios</li>
                <li>Demo</li>
                <li>Soporte</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Acerca de</li>
                <li>Blog</li>
                <li>Carreras</li>
                <li>Contacto</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Privacidad</li>
                <li>Términos</li>
                <li>Cookies</li>
                <li>Licencias</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>© 2024 HeroUI POS. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
