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
  Smartphone,
  Shield,
  Clock,
  Receipt,
  Printer,
  Database,
  Settings,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Building2,
  Truck,
  QrCode,
  Camera,
  Wifi,
  Lock,
  DatabaseBackupIcon as Backup,
  FolderSyncIcon as Sync,
  Award,
  Rocket,
  Heart,
  MessageCircle,
  Download,
  PlayCircle,
  HelpCircle,
  Sparkles,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "../components/theme-toggle"

export default function LandingPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const mainFeatures = [
    {
      icon: ShoppingCart,
      title: "Punto de Venta Intuitivo",
      description: "Interfaz moderna y fácil de usar para procesar ventas rápidamente con soporte táctil",
      color: "bg-blue-500 dark:bg-blue-600",
      details: ["Interfaz táctil optimizada", "Atajos de teclado", "Modo pantalla completa", "Búsqueda rápida"],
    },
    {
      icon: Scan,
      title: "Escáner de Códigos Avanzado",
      description: "Escaneo con cámara, lector USB o entrada manual con base de datos de productos",
      color: "bg-green-500 dark:bg-green-600",
      details: ["Escáner con cámara", "Soporte USB", "Entrada manual", "Auto-completado"],
    },
    {
      icon: Package,
      title: "Gestión de Inventario Completa",
      description: "Control total de stock, alertas automáticas, categorías y movimientos detallados",
      color: "bg-purple-500 dark:bg-purple-600",
      details: ["Alertas de stock bajo", "Categorización", "Historial de movimientos", "Códigos de barras"],
    },
    {
      icon: BarChart3,
      title: "Reportes y Analytics",
      description: "Análisis detallado de ventas, productos más vendidos, tendencias y métricas clave",
      color: "bg-orange-500 dark:bg-orange-600",
      details: ["Reportes en tiempo real", "Gráficos interactivos", "Exportar a PDF/Excel", "Métricas personalizadas"],
    },
    {
      icon: Users,
      title: "Sistema Multi-Usuario",
      description: "Gestión de empleados con roles, permisos personalizados y seguimiento de actividad",
      color: "bg-red-500 dark:bg-red-600",
      details: ["Roles y permisos", "Registro de actividad", "Turnos de trabajo", "Comisiones por vendedor"],
    },
    {
      icon: FileText,
      title: "Facturación Electrónica",
      description: "Genera facturas profesionales con cumplimiento fiscal paraguayo y envío automático",
      color: "bg-indigo-500 dark:bg-indigo-600",
      details: ["Cumplimiento fiscal PY", "Envío por email", "Numeración automática", "Plantillas personalizables"],
    },
    {
      icon: DollarSign,
      title: "Control Financiero",
      description: "Gestión de gastos, ingresos, flujo de caja y reportes financieros detallados",
      color: "bg-yellow-500 dark:bg-yellow-600",
      details: ["Control de gastos", "Flujo de caja", "Rentabilidad por producto", "Reportes financieros"],
    },
    {
      icon: Cloud,
      title: "Tecnología en la Nube",
      description: "Datos seguros con backup automático, sincronización y acceso desde cualquier dispositivo",
      color: "bg-cyan-500 dark:bg-cyan-600",
      details: ["Backup automático", "Sincronización", "Acceso multiplataforma", "Seguridad SSL"],
    },
  ]

  const additionalFeatures = [
    {
      icon: CreditCard,
      title: "Múltiples Métodos de Pago",
      description: "Efectivo, tarjetas, transferencias, QR y pagos digitales",
    },
    {
      icon: Printer,
      title: "Impresión Automática",
      description: "Tickets, facturas y reportes con impresoras térmicas",
    },
    {
      icon: QrCode,
      title: "Códigos QR",
      description: "Generación automática para productos y pagos",
    },
    {
      icon: Camera,
      title: "Escáner Integrado",
      description: "Usa la cámara del dispositivo como escáner",
    },
    {
      icon: AlertTriangle,
      title: "Alertas Inteligentes",
      description: "Notificaciones de stock, vencimientos y más",
    },
    {
      icon: Database,
      title: "Base de Datos Robusta",
      description: "Almacenamiento seguro y consultas rápidas",
    },
    {
      icon: Smartphone,
      title: "Responsive Design",
      description: "Funciona en móviles, tablets y computadoras",
    },
    {
      icon: Lock,
      title: "Seguridad Avanzada",
      description: "Encriptación de datos y acceso seguro",
    },
    {
      icon: Sync,
      title: "Sincronización Real",
      description: "Datos actualizados en tiempo real",
    },
    {
      icon: Settings,
      title: "Altamente Configurable",
      description: "Personaliza según las necesidades de tu negocio",
    },
    {
      icon: Backup,
      title: "Backup Automático",
      description: "Respaldos automáticos cada hora",
    },
    {
      icon: Wifi,
      title: "Modo Offline",
      description: "Funciona sin conexión a internet",
    },
  ]

  const businessTypes = [
    {
      icon: Building2,
      title: "Supermercados",
      description: "Control de inventario masivo, múltiples categorías y códigos de barras",
      features: ["Gestión de proveedores", "Control de vencimientos", "Ofertas y promociones"],
    },
    {
      icon: Receipt,
      title: "Restaurantes",
      description: "Gestión de mesas, comandas, cocina y delivery con tiempos de preparación",
      features: ["Gestión de mesas", "Comandas de cocina", "Control de delivery"],
    },
    {
      icon: Heart,
      title: "Farmacias",
      description: "Control de medicamentos, recetas, vencimientos y regulaciones sanitarias",
      features: ["Control de vencimientos", "Gestión de recetas", "Alertas sanitarias"],
    },
    {
      icon: ShoppingCart,
      title: "Tiendas de Ropa",
      description: "Gestión de tallas, colores, temporadas y control de stock por variante",
      features: ["Variantes de productos", "Control de temporadas", "Gestión de tallas"],
    },
    {
      icon: Truck,
      title: "Distribuidoras",
      description: "Gestión de rutas, clientes mayoristas y control de créditos",
      features: ["Gestión de rutas", "Clientes mayoristas", "Control de créditos"],
    },
    {
      icon: Wrench,
      title: "Servicios Técnicos",
      description: "Órdenes de trabajo, repuestos, garantías y seguimiento de reparaciones",
      features: ["Órdenes de trabajo", "Control de garantías", "Historial de servicios"],
    },
  ]

  const benefits = [
    "Aumenta la velocidad de atención hasta 300%",
    "Reduce errores de inventario en un 95%",
    "Mejora el control financiero y rentabilidad",
    "Genera reportes profesionales automáticamente",
    "Cumple con normativas fiscales paraguayas",
    "Acceso seguro con múltiples usuarios y roles",
    "Backup automático cada hora",
    "Soporte técnico 24/7 en español",
    "Actualizaciones gratuitas de por vida",
    "Integración con sistemas contables",
  ]

  const testimonials = [
    {
      name: "María González",
      business: "Supermercado La Familia",
      content:
        "POS CNID transformó completamente nuestro negocio. Procesamos ventas 3x más rápido y tenemos control total del inventario. El sistema de alertas nos ha ahorrado miles de guaraníes evitando productos vencidos.",
      rating: 5,
      image: "/placeholder.svg?height=60&width=60",
      results: "300% más rápido",
    },
    {
      name: "Carlos Mendoza",
      business: "Farmacia San José",
      content:
        "El control de vencimientos y el sistema de códigos de barras nos ahorra horas de trabajo diario. Los reportes son increíbles y nos ayudan a tomar mejores decisiones de compra.",
      rating: 5,
      image: "/placeholder.svg?height=60&width=60",
      results: "5 horas ahorradas/día",
    },
    {
      name: "Ana Rodríguez",
      business: "Boutique Elegancia",
      content:
        "Fácil de usar y muy completo. Mis empleados lo aprendieron en minutos. El soporte técnico es excelente y siempre están disponibles cuando los necesitamos.",
      rating: 5,
      image: "/placeholder.svg?height=60&width=60",
      results: "Aprendizaje en minutos",
    },
    {
      name: "Roberto Silva",
      business: "Restaurante El Buen Sabor",
      content:
        "La gestión de mesas y comandas revolucionó nuestro servicio. Los clientes están más satisfechos y hemos aumentado nuestras ventas en un 40% desde que implementamos el sistema.",
      rating: 5,
      image: "/placeholder.svg?height=60&width=60",
      results: "+40% en ventas",
    },
    {
      name: "Lucía Martínez",
      business: "Distribuidora Norte",
      content:
        "El control de rutas y clientes mayoristas nos permite gestionar mejor nuestras entregas. Los reportes de vendedores nos ayudan a optimizar las comisiones y motivar al equipo.",
      rating: 5,
      image: "/placeholder.svg?height=60&width=60",
      results: "Mejor gestión de rutas",
    },
    {
      name: "Diego Fernández",
      business: "Taller Técnico Pro",
      content:
        "Las órdenes de trabajo y el control de garantías nos han profesionalizado completamente. Nuestros clientes confían más en nosotros y hemos reducido las reclamaciones a cero.",
      rating: 5,
      image: "/placeholder.svg?height=60&width=60",
      results: "0 reclamaciones",
    },
  ]

  const pricingPlans = [
    {
      name: "Básico",
      price: "150.000",
      period: "/mes",
      description: "Perfecto para pequeños negocios que están comenzando",
      features: [
        "Hasta 1.000 productos",
        "2 usuarios simultáneos",
        "Reportes básicos",
        "Soporte por email",
        "Backup diario",
        "1 punto de venta",
        "Facturación básica",
        "Inventario simple",
      ],
      popular: false,
      color: "border-gray-200",
    },
    {
      name: "Profesional",
      price: "300.000",
      period: "/mes",
      description: "Ideal para negocios en crecimiento con necesidades avanzadas",
      features: [
        "Productos ilimitados",
        "5 usuarios simultáneos",
        "Reportes avanzados",
        "Soporte prioritario",
        "Backup cada hora",
        "3 puntos de venta",
        "Facturación electrónica",
        "Gestión de proveedores",
        "Alertas inteligentes",
        "Códigos QR",
        "Multi-sucursal",
      ],
      popular: true,
      color: "border-blue-500",
    },
    {
      name: "Enterprise",
      price: "500.000",
      period: "/mes",
      description: "Para grandes empresas con necesidades específicas",
      features: [
        "Todo lo del plan Profesional",
        "Usuarios ilimitados",
        "API personalizada",
        "Soporte 24/7",
        "Backup en tiempo real",
        "Puntos de venta ilimitados",
        "Integración contable",
        "Reportes ejecutivos",
        "Capacitación incluida",
        "Personalización avanzada",
        "Consultoría de procesos",
        "SLA garantizado",
      ],
      popular: false,
      color: "border-purple-500",
    },
  ]

  const stats = [
    { number: "500+", label: "Negocios Activos", icon: Building2 },
    { number: "50K+", label: "Transacciones Diarias", icon: Receipt },
    { number: "99.9%", label: "Tiempo de Actividad", icon: Clock },
    { number: "24/7", label: "Soporte Técnico", icon: Headphones },
  ]

  const faqs = [
    {
      question: "¿Necesito internet para usar el sistema?",
      answer:
        "No, POS CNID funciona completamente offline. Los datos se sincronizan automáticamente cuando hay conexión disponible.",
    },
    {
      question: "¿Puedo importar mis productos existentes?",
      answer:
        "Sí, ofrecemos herramientas de importación desde Excel, CSV y otros sistemas POS. Nuestro equipo te ayuda con la migración gratuita.",
    },
    {
      question: "¿El sistema cumple con las normativas paraguayas?",
      answer:
        "Completamente. POS CNID está diseñado específicamente para cumplir con todas las regulaciones fiscales de Paraguay, incluyendo facturación electrónica.",
    },
    {
      question: "¿Qué tipo de soporte técnico incluye?",
      answer:
        "Incluimos soporte técnico en español por WhatsApp, email y teléfono. Los planes Profesional y Enterprise tienen soporte prioritario 24/7.",
    },
    {
      question: "¿Puedo usar el sistema en múltiples dispositivos?",
      answer:
        "Sí, puedes acceder desde computadoras, tablets y smartphones. Los datos se sincronizan automáticamente entre todos los dispositivos.",
    },
    {
      question: "¿Hay límite en la cantidad de productos?",
      answer:
        "El plan Básico permite hasta 1.000 productos. Los planes Profesional y Enterprise no tienen límites en productos, usuarios o transacciones.",
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
                  href="#solutions"
                  className="text-foreground/70 hover:text-primary px-3 py-2 text-sm font-medium transition-colors"
                >
                  Soluciones
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
                Probar Demo
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
                href="#solutions"
                className="block px-3 py-2 text-base font-medium text-foreground/70 hover:text-primary"
              >
                Soluciones
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
                  Probar Demo
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
              <Sparkles className="h-4 w-4 mr-2" />
              Sistema de Gestión Integral Más Completo de Paraguay
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              <span className="gradient-text">POS CNID</span>
              <br />
              <span className="text-3xl md:text-5xl">La Revolución en Gestión Comercial</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto">
              La plataforma más avanzada y completa para gestionar tu negocio en Paraguay. Desde pequeños comercios
              hasta grandes cadenas, con más de 50 funcionalidades integradas, facturación electrónica, inventario
              inteligente y reportes ejecutivos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="btn-gradient text-lg px-8 py-3" onClick={() => router.push("/pos")}>
                <PlayCircle className="mr-2 h-5 w-5" />
                Ver Demo Interactivo
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-3 bg-transparent"
                onClick={() => router.push("/login")}
              >
                Comenzar Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-2">
                    <stat.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 dark:from-blue-600/20 dark:to-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-400/20 dark:from-purple-600/20 dark:to-pink-600/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Main Features Section */}
      <section id="features" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Funcionalidades Principales del Sistema
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Más de 50 herramientas integradas para gestionar cada aspecto de tu negocio de manera profesional y
              eficiente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {mainFeatures.map((feature, index) => (
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
                  <CardDescription className="text-muted-foreground text-center mb-4">
                    {feature.description}
                  </CardDescription>
                  <ul className="space-y-1 text-sm">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Features Grid */}
          <div className="bg-muted/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-center mb-8">Más de 40 Funcionalidades Adicionales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {additionalFeatures.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Solutions by Business Type */}
      <section id="solutions" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Soluciones Especializadas por Tipo de Negocio
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Configuraciones optimizadas y funcionalidades específicas para cada industria
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {businessTypes.map((business, index) => (
              <Card key={index} className="hover:shadow-xl transition-shadow duration-300 card-dark">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <business.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{business.title}</CardTitle>
                  <CardDescription className="text-base">{business.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {business.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                ¿Por qué más de 500 negocios eligen POS CNID?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Diseñado específicamente para el mercado paraguayo, cumpliendo con todas las normativas locales y
                adaptado a las necesidades reales de los comerciantes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground/80 text-sm">{benefit}</span>
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

                  <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Producto Más Vendido</p>
                        <p className="font-semibold text-orange-900 dark:text-orange-100">Hamburguesa Clásica</p>
                      </div>
                      <Badge variant="secondary">23 unidades</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Historias de Éxito de Nuestros Clientes
            </h2>
            <p className="text-xl text-muted-foreground">
              Más de 500 negocios han transformado sus operaciones con POS CNID
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={testimonial.image || "/placeholder.svg"}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.business}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {testimonial.results}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Planes Diseñados para Crecer Contigo
            </h2>
            <p className="text-xl text-muted-foreground">
              Desde pequeños emprendimientos hasta grandes cadenas comerciales
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`border-2 ${plan.color} ${
                  plan.popular ? "relative" : ""
                } hover:border-primary transition-colors duration-300 card-dark`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Award className="h-4 w-4 mr-1" />
                      Más Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold text-foreground">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">Gs {plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? "btn-gradient" : "bg-transparent"}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.popular ? "Comenzar Ahora" : "Comenzar Prueba"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">¿Necesitas una solución personalizada para tu empresa?</p>
            <Button variant="outline" size="lg">
              <MessageCircle className="mr-2 h-5 w-5" />
              Contactar Ventas Empresariales
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Preguntas Frecuentes</h2>
            <p className="text-xl text-muted-foreground">Resolvemos las dudas más comunes sobre POS CNID</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="card-dark">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2 text-primary" />
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">¿No encuentras la respuesta que buscas?</p>
            <Button variant="outline">
              <MessageCircle className="mr-2 h-4 w-4" />
              Contactar Soporte
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 btn-gradient">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">¿Listo para Revolucionar tu Negocio?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Únete a más de 500 negocios que ya han transformado sus operaciones con POS CNID. Comienza tu prueba
            gratuita hoy mismo y descubre por qué somos el sistema más completo de Paraguay.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
              onClick={() => router.push("/pos")}
            >
              <Rocket className="mr-2 h-5 w-5" />
              Comenzar Prueba Gratuita
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-3 bg-transparent"
            >
              <Download className="mr-2 h-5 w-5" />
              Descargar Catálogo
            </Button>
          </div>
          <div className="flex items-center justify-center space-x-6 text-blue-100">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>Prueba gratuita 30 días</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>Sin compromiso</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>Soporte incluido</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 btn-gradient rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold gradient-text">POS CNID</span>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md">
                El sistema de gestión integral más completo y avanzado de Paraguay. Transformamos la manera en que los
                negocios operan y crecen.
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  +595 21 123456
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Contacto
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-foreground">Producto</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground transition-colors">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="hover:text-foreground transition-colors">
                    Soluciones
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-foreground transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Demo Interactivo
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    API Documentación
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
                    Guías y Tutoriales
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Soporte Técnico
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Estado del Sistema
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Capacitación
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-foreground">Empresa</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Acerca de Nosotros
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Blog y Noticias
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Carreras
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Términos y Privacidad
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-muted-foreground mb-4 md:mb-0">
                <p>&copy; 2024 POS CNID. Todos los derechos reservados.</p>
                <p className="text-sm">Hecho con ❤️ en Paraguay para comerciantes paraguayos</p>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Datos Seguros
                </Badge>
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <Award className="h-3 w-3 mr-1" />
                  Certificado
                </Badge>
                <Badge variant="outline" className="text-purple-600 border-purple-600">
                  <MapPin className="h-3 w-3 mr-1" />
                  Hecho en PY
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
