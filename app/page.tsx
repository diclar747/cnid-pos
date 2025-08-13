"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./context/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ShoppingCart,
  BarChart3,
  Users,
  Package,
  CreditCard,
  Shield,
  Zap,
  TrendingUp,
  Star,
  Check,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  Menu,
  X,
  ChevronDown,
} from "lucide-react"
import { useState } from "react"

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Si el usuario está autenticado, redirigir al POS
  useEffect(() => {
    if (!loading && user) {
      router.push("/pos")
    }
  }, [user, loading, router])

  // Si está cargando o hay usuario, no mostrar el landing
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">HeroUI POS</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection("features")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Características
              </button>
              <button
                onClick={() => scrollToSection("solutions")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Soluciones
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Precios
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Contacto
              </button>
              <Button onClick={() => router.push("/login")}>Iniciar Sesión</Button>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-left text-muted-foreground hover:text-foreground transition-colors"
                >
                  Características
                </button>
                <button
                  onClick={() => scrollToSection("solutions")}
                  className="text-left text-muted-foreground hover:text-foreground transition-colors"
                >
                  Soluciones
                </button>
                <button
                  onClick={() => scrollToSection("pricing")}
                  className="text-left text-muted-foreground hover:text-foreground transition-colors"
                >
                  Precios
                </button>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="text-left text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contacto
                </button>
                <Button onClick={() => router.push("/login")} className="w-full">
                  Iniciar Sesión
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Sistema POS Completo
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            El POS más completo para tu negocio
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Gestiona ventas, inventario, proveedores y más con nuestro sistema integral. Diseñado para empresas
            paraguayas que buscan eficiencia y crecimiento.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" onClick={() => router.push("/login")} className="bg-blue-600 hover:bg-blue-700">
              Comenzar Ahora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollToSection("features")}>
              Ver Características
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">1,000+</div>
              <div className="text-muted-foreground">Empresas confían en nosotros</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">99.9%</div>
              <div className="text-muted-foreground">Tiempo de actividad</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">24/7</div>
              <div className="text-muted-foreground">Soporte técnico</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Características Principales</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que necesitas en un solo lugar</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Nuestro sistema POS incluye todas las herramientas necesarias para gestionar tu negocio de manera
              eficiente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <ShoppingCart className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Punto de Venta</CardTitle>
                <CardDescription>
                  Interfaz intuitiva para procesar ventas rápidamente con soporte para múltiples métodos de pago.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Package className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Gestión de Inventario</CardTitle>
                <CardDescription>
                  Control completo de stock con alertas automáticas, códigos de barras y gestión de proveedores.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Reportes Avanzados</CardTitle>
                <CardDescription>
                  Análisis detallados de ventas, inventario y rendimiento con gráficos interactivos.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-12 w-12 text-orange-600 mb-4" />
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>
                  Control de acceso con roles y permisos personalizables para tu equipo.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CreditCard className="h-12 w-12 text-red-600 mb-4" />
                <CardTitle>Facturación Electrónica</CardTitle>
                <CardDescription>
                  Genera facturas electrónicas cumpliendo con las normativas paraguayas de la SET.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Shield className="h-12 w-12 text-indigo-600 mb-4" />
                <CardTitle>Seguridad Avanzada</CardTitle>
                <CardDescription>
                  Protección de datos con encriptación y backups automáticos en la nube.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Herramientas Incluidas</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Más de 50 herramientas profesionales</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Cada funcionalidad está diseñada para optimizar tu operación diaria.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              "Escáner de Códigos",
              "Gestión de Productos",
              "Control de Stock",
              "Alertas de Inventario",
              "Gestión de Proveedores",
              "Órdenes de Compra",
              "Facturación",
              "Reportes de Ventas",
              "Dashboard Ejecutivo",
              "Gestión de Usuarios",
              "Control de Acceso",
              "Backup Automático",
              "Códigos QR",
              "Plantillas de Factura",
              "Numeración Correlativa",
              "Gestión de Gastos",
              "Reportes Financieros",
              "Análisis de Rentabilidad",
              "Gestión de Clientes",
              "Historial de Ventas",
              "Alertas Predictivas",
              "Comparativas de Mercado",
              "Integración APIs",
              "Sistema de Scoring",
              "Comunicación Automática",
              "Evaluación de Proveedores",
              "Dashboard de Compras",
              "Filtros Avanzados",
              "Temas Personalizados",
              "Modo Alto Contraste",
              "Tema Automático",
              "Animaciones Avanzadas",
              "Optimización SEO",
              "Chat en Vivo",
              "Tour Interactivo",
              "Transiciones Fluidas",
              "Optimización de Rendimiento",
              "Migración de Datos",
              "Autenticación Real",
              "Productos Ejemplo",
              "Sistema de Backup",
              "Reportes PDF",
              "Integración Supabase",
              "APIs de Proveedores",
              "Scoring Automático",
              "Reportes Ejecutivos",
              "Comparativas Automáticas",
              "Alertas Inteligentes",
            ].map((tool, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center hover:shadow-md transition-shadow"
              >
                <div className="text-sm font-medium">{tool}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions by Industry */}
      <section id="solutions" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Soluciones por Industria</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Adaptado a tu tipo de negocio</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Configuraciones específicas para diferentes sectores comerciales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">🍽️ Restaurantes</CardTitle>
                <CardDescription>
                  Gestión de mesas, comandas, cocina y delivery con integración a apps de entrega.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">🛍️ Retail y Tiendas</CardTitle>
                <CardDescription>
                  Control de inventario, códigos de barras, promociones y programa de fidelidad.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">💊 Farmacias</CardTitle>
                <CardDescription>Gestión de medicamentos, vencimientos, recetas y control sanitario.</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">🔧 Ferreterías</CardTitle>
                <CardDescription>
                  Catálogo extenso, medidas, pesos y gestión de materiales de construcción.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">👕 Boutiques</CardTitle>
                <CardDescription>Gestión de tallas, colores, temporadas y colecciones de moda.</CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">🏪 Supermercados</CardTitle>
                <CardDescription>Gestión masiva de productos, ofertas, balanzas y múltiples cajas.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Beneficios Comprobados</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Resultados que puedes medir</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Nuestros clientes experimentan mejoras significativas en su operación.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">+35%</h3>
              <p className="text-lg font-semibold mb-2">Aumento en Ventas</p>
              <p className="text-muted-foreground">Mejor control y análisis de productos impulsa las ventas</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-blue-600 mb-2">-60%</h3>
              <p className="text-lg font-semibold mb-2">Tiempo de Procesamiento</p>
              <p className="text-muted-foreground">Interfaz optimizada acelera cada transacción</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-purple-600 mb-2">-90%</h3>
              <p className="text-lg font-semibold mb-2">Errores de Inventario</p>
              <p className="text-muted-foreground">Control automático elimina errores manuales</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-orange-600 mb-2">+50%</h3>
              <p className="text-lg font-semibold mb-2">Eficiencia Operativa</p>
              <p className="text-muted-foreground">Automatización de procesos clave</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-red-600 mb-2">+25%</h3>
              <p className="text-lg font-semibold mb-2">Satisfacción del Cliente</p>
              <p className="text-muted-foreground">Servicio más rápido y preciso</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-indigo-600 mb-2">-40%</h3>
              <p className="text-lg font-semibold mb-2">Pérdidas por Stock</p>
              <p className="text-muted-foreground">Alertas predictivas y control preciso</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Testimonios</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Lo que dicen nuestros clientes</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Historias reales de éxito de empresas paraguayas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription>
                  "Desde que implementamos HeroUI POS, nuestras ventas aumentaron 40% y eliminamos completamente los
                  errores de inventario. El soporte técnico es excepcional."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-semibold">María González</div>
                <div className="text-sm text-muted-foreground">Propietaria, Farmacia San Roque</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription>
                  "La gestión de proveedores y las alertas automáticas nos ahorraron miles de dólares en stock muerto.
                  Es una inversión que se paga sola."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-semibold">Carlos Mendoza</div>
                <div className="text-sm text-muted-foreground">Gerente, Supermercado El Progreso</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription>
                  "Los reportes detallados nos permitieron identificar nuestros productos más rentables y optimizar
                  nuestro menú. Increíble herramienta."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-semibold">Ana Rodríguez</div>
                <div className="text-sm text-muted-foreground">Chef Propietaria, Restaurante Sabores</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription>
                  "La facturación electrónica integrada nos simplificó enormemente el cumplimiento con la SET. Ya no
                  tenemos que preocuparnos por las declaraciones."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-semibold">Roberto Silva</div>
                <div className="text-sm text-muted-foreground">Contador, Ferretería Central</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription>
                  "El sistema es tan intuitivo que nuestro personal lo aprendió en un día. La productividad mejoró
                  inmediatamente y los clientes notan la diferencia."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-semibold">Lucía Benítez</div>
                <div className="text-sm text-muted-foreground">Gerente, Boutique Elegancia</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription>
                  "Los códigos QR y el escáner de barras aceleraron nuestro proceso de venta en un 70%. Ahora podemos
                  atender el doble de clientes en el mismo tiempo."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-semibold">Diego Paredes</div>
                <div className="text-sm text-muted-foreground">Propietario, Tienda TecnoMax</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Planes y Precios</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Elige el plan perfecto para tu negocio</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Precios transparentes en guaraníes paraguayos, sin sorpresas ni costos ocultos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-center">Básico</CardTitle>
                <div className="text-center">
                  <div className="text-3xl font-bold">₲ 450.000</div>
                  <div className="text-muted-foreground">por mes</div>
                </div>
                <CardDescription className="text-center">Perfecto para pequeños negocios</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Hasta 1,000 productos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>1 usuario</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Reportes básicos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Facturación electrónica</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Soporte por email</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-transparent" variant="outline">
                  Comenzar Prueba
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-blue-200 dark:border-blue-800 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white">Más Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-center">Profesional</CardTitle>
                <div className="text-center">
                  <div className="text-3xl font-bold">₲ 850.000</div>
                  <div className="text-muted-foreground">por mes</div>
                </div>
                <CardDescription className="text-center">Ideal para medianas empresas</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Productos ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Hasta 5 usuarios</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Reportes avanzados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Gestión de proveedores</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Códigos QR y barras</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Soporte prioritario</span>
                  </li>
                </ul>
                <Button className="w-full mt-6">Comenzar Prueba</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-center">Empresarial</CardTitle>
                <div className="text-center">
                  <div className="text-3xl font-bold">₲ 1.500.000</div>
                  <div className="text-muted-foreground">por mes</div>
                </div>
                <CardDescription className="text-center">Para grandes operaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Todo lo del plan Profesional</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Usuarios ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>API personalizada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Integraciones avanzadas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Soporte 24/7</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Gerente de cuenta dedicado</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-transparent" variant="outline">
                  Contactar Ventas
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Preguntas Frecuentes</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Resolvemos tus dudas</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Las preguntas más comunes sobre nuestro sistema POS.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  ¿Cómo funciona la facturación electrónica?
                  <ChevronDown className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Nuestro sistema está integrado con la SET (Subsecretaría de Estado de Tributación) para generar
                  automáticamente facturas electrónicas válidas. Solo necesitas configurar tus datos fiscales una vez y
                  el sistema se encarga del resto.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  ¿Puedo usar el sistema sin conexión a internet?
                  <ChevronDown className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sí, el sistema funciona en modo offline para ventas básicas. Cuando se restablece la conexión, todos
                  los datos se sincronizan automáticamente con la nube.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  ¿Qué tipo de soporte técnico ofrecen?
                  <ChevronDown className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ofrecemos soporte por WhatsApp, email y teléfono. El plan Empresarial incluye soporte 24/7 y un
                  gerente de cuenta dedicado para resolver cualquier consulta.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  ¿Puedo migrar mis datos desde otro sistema?
                  <ChevronDown className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Absolutamente. Nuestro equipo técnico te ayuda gratuitamente a migrar todos tus productos, clientes y
                  datos históricos desde cualquier sistema anterior.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  ¿Hay período de prueba gratuito?
                  <ChevronDown className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sí, ofrecemos 30 días de prueba gratuita con acceso completo a todas las funcionalidades. No se
                  requiere tarjeta de crédito para comenzar.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  ¿El sistema se adapta a mi tipo de negocio?
                  <ChevronDown className="h-5 w-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sí, tenemos configuraciones específicas para restaurantes, farmacias, supermercados, boutiques,
                  ferreterías y más. Cada configuración incluye las herramientas específicas de tu industria.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Contacto</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Listo para comenzar?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Contáctanos hoy y descubre cómo HeroUI POS puede transformar tu negocio.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold mb-6">Información de Contacto</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Teléfono</h4>
                    <p className="text-muted-foreground">+595 21 123-4567</p>
                    <p className="text-muted-foreground">+595 981 123-456</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Email</h4>
                    <p className="text-muted-foreground">ventas@heroui.com</p>
                    <p className="text-muted-foreground">soporte@heroui.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Dirección</h4>
                    <p className="text-muted-foreground">Av. Mariscal López 1234</p>
                    <p className="text-muted-foreground">Asunción, Paraguay</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Horarios</h4>
                    <p className="text-muted-foreground">Lun - Vie: 8:00 - 18:00</p>
                    <p className="text-muted-foreground">Sáb: 8:00 - 12:00</p>
                  </div>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Solicita una Demostración</CardTitle>
                <CardDescription>Completa el formulario y te contactaremos en menos de 24 horas.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nombre</Label>
                      <Input id="firstName" placeholder="Tu nombre" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Apellido</Label>
                      <Input id="lastName" placeholder="Tu apellido" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="tu@email.com" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" placeholder="+595 981 123-456" />
                  </div>
                  <div>
                    <Label htmlFor="business">Tipo de Negocio</Label>
                    <Input id="business" placeholder="Ej: Restaurante, Farmacia, Tienda" />
                  </div>
                  <div>
                    <Label htmlFor="message">Mensaje</Label>
                    <Textarea id="message" placeholder="Cuéntanos sobre tu negocio y necesidades..." />
                  </div>
                  <Button type="submit" className="w-full">
                    Solicitar Demostración
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">HeroUI POS</span>
              </div>
              <p className="text-gray-400 mb-4">
                El sistema POS más completo para empresas paraguayas. Gestiona tu negocio con eficiencia y
                profesionalismo.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  📘
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  📷
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  🐦
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Producto</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Integraciones
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Soporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Centro de Ayuda
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentación
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Estado del Sistema
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Sobre Nosotros
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Carreras
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Prensa
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">© 2024 HeroUI POS. Todos los derechos reservados.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Privacidad
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Términos
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
