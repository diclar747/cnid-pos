"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Package,
  Scan,
  Users,
  Zap,
  CheckCircle,
  Star,
  Menu,
  X,
  DollarSign,
  TrendingUp,
  FileText,
  Cloud,
  Headphones,
  ShoppingCart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "../components/theme-toggle"

export default function LandingPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const features = [
    {
      icon: Scan,
      title: "Escáner de Códigos",
      description: "Escaneo rápido con cámara o lector de códigos de barras para agilizar las ventas",
      color: "bg-blue-500 dark:bg-blue-600",
    },
    {
      icon: CreditCard,
      title: "Múltiples Pagos",
      description: "Acepta pagos en efectivo, tarjetas de crédito/débito y métodos digitales",
      color: "bg-green-500 dark:bg-green-600",
    },
    {
      icon: Package,
      title: "Gestión de Inventario",
      description: "Control completo de stock, alertas de inventario bajo y movimientos automáticos",
      color: "bg-purple-500 dark:bg-purple-600",
    },
    {
      icon: BarChart3,
      title: "Reportes Avanzados",
      description: "Análisis detallado de ventas, productos más vendidos y tendencias de negocio",
      color: "bg-orange-500 dark:bg-orange-600",
    },
    {
      icon: Users,
      title: "Multi-Usuario",
      description: "Sistema de roles para administradores y cajeros con permisos personalizados",
      color: "bg-red-500 dark:bg-red-600",
    },
    {
      icon: FileText,
      title: "Facturación Completa",
      description: "Genera facturas profesionales con datos fiscales y cumplimiento legal",
      color: "bg-indigo-500 dark:bg-indigo-600",
    },
    {
      icon: DollarSign,
      title: "Control de Gastos",
      description: "Registra y categoriza gastos operativos para un control financiero completo",
      color: "bg-yellow-500 dark:bg-yellow-600",
    },
    {
      icon: Cloud,
      title: "En la Nube",
      description: "Datos seguros en la nube con backup automático y acceso desde cualquier lugar",
      color: "bg-cyan-500 dark:bg-cyan-600",
    },
  ]

  const benefits = [
    "Aumenta la velocidad de atención al cliente",
    "Reduce errores en el manejo de inventario",
    "Mejora el control financiero del negocio",
    "Genera reportes profesionales automáticamente",
    "Cumple con normativas fiscales paraguayas",
    "Acceso seguro con múltiples usuarios",
  ]

  const testimonials = [
    {
      name: "María González",
      business: "Supermercado La Familia",
      content:
        "POS CNID transformó completamente nuestro negocio. Las ventas son más rápidas y tenemos control total del inventario.",
      rating: 5,
    },
    {
      name: "Carlos Mendoza",
      business: "Farmacia San José",
      content: "El sistema de códigos de barras nos ahorra horas de trabajo diario. Los reportes son increíbles.",
      rating: 5,
    },
    {
      name: "Ana Rodríguez",
      business: "Boutique Elegancia",
      content: "Fácil de usar y muy completo. El soporte técnico es excelente y siempre están disponibles.",
      rating: 5,
    },
  ]

  return (
    <div className="min-h-screen gradient-bg-light">
      {/* Navigation */}
      <nav className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-10 h-10 btn-gradient rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold gradient-text">POS CNID</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a
                  href="#features"
                  className="text-foreground/70 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Características
                </a>
                <a
                  href="#benefits"
                  className="text-foreground/70 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Beneficios
                </a>
                <a
                  href="#testimonials"
                  className="text-foreground/70 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Testimonios
                </a>
                <a
                  href="#pricing"
                  className="text-foreground/70 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Precios
                </a>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-2">
              <ThemeToggle />
              <Button
                variant="outline"
                onClick={() => router.push("/pos")}
                className="bg-transparent flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Ir al POS
              </Button>
              <Button onClick={() => router.push("/login")} className="btn-gradient">
                Iniciar Sesión
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-t border-border">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a
                href="#features"
                className="block px-3 py-2 text-base font-medium text-foreground/70 hover:text-primary"
              >
                Características
              </a>
              <a
                href="#benefits"
                className="block px-3 py-2 text-base font-medium text-foreground/70 hover:text-primary"
              >
                Beneficios
              </a>
              <a
                href="#testimonials"
                className="block px-3 py-2 text-base font-medium text-foreground/70 hover:text-primary"
              >
                Testimonios
              </a>
              <a
                href="#pricing"
                className="block px-3 py-2 text-base font-medium text-foreground/70 hover:text-primary"
              >
                Precios
              </a>
              <div className="px-3 py-2 space-y-2">
                <Button
                  variant="outline"
                  onClick={() => router.push("/pos")}
                  className="w-full bg-transparent flex items-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Ir al POS
                </Button>
                <Button onClick={() => router.push("/login")} className="w-full btn-gradient">
                  Iniciar Sesión
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <Badge className="mb-6 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
              🚀 Sistema de Gestión Integral
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              <span className="gradient-text">POS CNID</span>
              <br />
              <span className="text-3xl md:text-5xl">Sistema de Gestión Integral</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              La solución completa para tu negocio en Paraguay. Gestiona ventas, inventario, facturación y reportes
              desde una sola plataforma moderna y fácil de usar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="btn-gradient text-lg px-8 py-3" onClick={() => router.push("/pos")}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Probar POS Ahora
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-3 bg-transparent"
                onClick={() => router.push("/login")}
              >
                Iniciar Sesión
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 dark:from-blue-600/20 dark:to-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-400/20 dark:from-purple-600/20 dark:to-pink-600/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Características Principales</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu negocio de manera eficiente y profesional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 border-0 shadow-adaptive hover:-translate-y-2 card-dark"
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-center">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">¿Por qué elegir POS CNID?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Diseñado específicamente para negocios paraguayos, cumpliendo con todas las normativas locales y
                adaptado a las necesidades del mercado.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground/80">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="card-dark rounded-2xl shadow-adaptive p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Ventas del Día</p>
                        <p className="text-sm text-muted-foreground">Actualizado en tiempo real</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">Gs 2.450.000</p>
                      <p className="text-sm text-green-600">+15% vs ayer</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                      <p className="text-sm text-blue-600 font-medium">Productos Vendidos</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">127</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                      <p className="text-sm text-purple-600 font-medium">Transacciones</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">43</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Lo que dicen nuestros clientes</h2>
            <p className="text-xl text-muted-foreground">Más de 500 negocios confían en POS CNID</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="border-0 shadow-adaptive hover:shadow-xl transition-shadow duration-300 card-dark"
              >
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.business}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Planes Flexibles</h2>
            <p className="text-xl text-muted-foreground">Elige el plan que mejor se adapte a tu negocio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Plan Básico */}
            <Card className="border-2 border-border hover:border-primary transition-colors duration-300 card-dark">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-foreground">Básico</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">Gs 150.000</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <CardDescription className="mt-2">Perfecto para pequeños negocios</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Hasta 1.000 productos</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>2 usuarios</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Reportes básicos</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Soporte por email</span>
                  </li>
                </ul>
                <Button className="w-full mt-8 bg-transparent" variant="outline">
                  Comenzar Prueba
                </Button>
              </CardContent>
            </Card>

            {/* Plan Profesional */}
            <Card className="border-2 border-primary relative hover:border-primary/80 transition-colors duration-300 card-dark">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Más Popular</Badge>
              </div>
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-foreground">Profesional</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">Gs 300.000</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <CardDescription className="mt-2">Ideal para negocios en crecimiento</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Productos ilimitados</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>5 usuarios</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Reportes avanzados</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Soporte prioritario</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Backup automático</span>
                  </li>
                </ul>
                <Button className="w-full mt-8 btn-gradient">Comenzar Ahora</Button>
              </CardContent>
            </Card>

            {/* Plan Enterprise */}
            <Card className="border-2 border-border hover:border-purple-500 transition-colors duration-300 card-dark">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-foreground">Enterprise</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">Gs 500.000</span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <CardDescription className="mt-2">Para grandes empresas</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Todo lo del plan Profesional</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Usuarios ilimitados</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>API personalizada</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Soporte 24/7</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Capacitación incluida</span>
                  </li>
                </ul>
                <Button className="w-full mt-8 bg-transparent" variant="outline">
                  Contactar Ventas
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 btn-gradient">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">¿Listo para transformar tu negocio?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Únete a cientos de negocios que ya confían en POS CNID para gestionar sus operaciones diarias
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
              onClick={() => router.push("/pos")}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Probar POS Gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-3 bg-transparent"
            >
              <Headphones className="mr-2 h-5 w-5" />
              Hablar con Ventas
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 btn-gradient rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="ml-2 text-xl font-bold gradient-text">POS CNID</span>
              </div>
              <p className="text-muted-foreground">Sistema de gestión integral para negocios modernos en Paraguay.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-foreground">Producto</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Demo
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-foreground">Soporte</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Centro de Ayuda
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Documentación
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Estado del Sistema
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-foreground">Empresa</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Acerca de
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Carreras
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Privacidad
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 POS CNID. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
