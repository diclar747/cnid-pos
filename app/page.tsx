"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ShoppingCart,
  BarChart3,
  Users,
  Package,
  Receipt,
  Building2,
  Star,
  Check,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  TrendingUp,
  Shield,
  Zap,
  HeadphonesIcon,
  ChevronRight,
  Play,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "./context/auth-context"

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth()

  const features = [
    {
      icon: ShoppingCart,
      title: "Sistema POS Completo",
      description: "Punto de venta intuitivo con carrito, códigos de barras, y procesamiento rápido de transacciones.",
      benefits: ["Interfaz táctil", "Códigos QR/Barras", "Múltiples formas de pago"],
    },
    {
      icon: Package,
      title: "Gestión de Inventario",
      description:
        "Control total de stock con alertas automáticas, seguimiento en tiempo real y gestión de proveedores.",
      benefits: ["Alertas de stock bajo", "Seguimiento en tiempo real", "Gestión de proveedores"],
    },
    {
      icon: BarChart3,
      title: "Reportes y Analytics",
      description: "Análisis detallado de ventas, tendencias y rendimiento con gráficos interactivos y exportación.",
      benefits: ["Gráficos interactivos", "Exportación PDF/Excel", "Análisis predictivo"],
    },
    {
      icon: Users,
      title: "Gestión de Personal",
      description: "Administración completa de empleados con roles, permisos y seguimiento de actividades.",
      benefits: ["Control de roles", "Seguimiento de actividad", "Gestión de horarios"],
    },
    {
      icon: Receipt,
      title: "Facturación Electrónica",
      description: "Generación automática de facturas con numeración correlativa y cumplimiento fiscal.",
      benefits: ["Numeración automática", "Cumplimiento fiscal", "Envío por email"],
    },
    {
      icon: Building2,
      title: "Multi-sucursal",
      description: "Gestión centralizada de múltiples ubicaciones con sincronización en tiempo real.",
      benefits: ["Sincronización automática", "Control centralizado", "Reportes consolidados"],
    },
  ]

  const tools = [
    "Scanner de códigos",
    "Generador QR",
    "Backup automático",
    "Modo offline",
    "Alertas inteligentes",
    "Dashboard ejecutivo",
    "Control de gastos",
    "Gestión de compras",
    "Evaluación de proveedores",
    "Comunicación automática",
    "Reportes personalizados",
    "Análisis predictivo",
    "Integración APIs",
    "Sistema de scoring",
    "Comparativas de mercado",
    "Alertas predictivas",
    "Gestión de usuarios",
    "Control de acceso",
    "Auditoría completa",
    "Respaldo en la nube",
    "Soporte 24/7",
    "Actualizaciones automáticas",
    "Personalización",
    "Temas personalizados",
    "Modo alto contraste",
    "Optimización SEO",
    "Chat en vivo",
    "Tour interactivo",
    "Animaciones avanzadas",
    "Rendimiento optimizado",
    "Migración de datos",
    "Auth avanzado",
    "Filtros avanzados",
    "Búsqueda inteligente",
    "Exportación masiva",
    "Importación CSV",
    "Plantillas de factura",
    "Códigos promocionales",
    "Descuentos automáticos",
    "Programa de lealtad",
    "Notificaciones push",
    "Recordatorios automáticos",
    "Calendario integrado",
    "Gestión de citas",
    "CRM integrado",
    "Marketing automation",
    "Análisis de clientes",
    "Segmentación avanzada",
  ]

  const businessTypes = [
    {
      title: "Restaurantes",
      description: "Gestión completa para restaurantes con menús digitales, control de mesas y cocina.",
      features: ["Menús digitales", "Control de mesas", "Gestión de cocina", "Delivery integrado"],
    },
    {
      title: "Retail",
      description: "Solución perfecta para tiendas con gestión de inventario y múltiples categorías.",
      features: ["Múltiples categorías", "Control de tallas", "Promociones", "Programa de puntos"],
    },
    {
      title: "Farmacias",
      description: "Sistema especializado con control de medicamentos y fechas de vencimiento.",
      features: ["Control de vencimientos", "Recetas médicas", "Stock crítico", "Reportes sanitarios"],
    },
    {
      title: "Supermercados",
      description: "Gestión de grandes volúmenes con códigos de barras y múltiples cajas.",
      features: ["Múltiples cajas", "Códigos de barras", "Pesaje integrado", "Ofertas automáticas"],
    },
    {
      title: "Servicios",
      description: "Ideal para empresas de servicios con gestión de citas y facturación por horas.",
      features: ["Gestión de citas", "Facturación por horas", "Control de servicios", "Seguimiento de proyectos"],
    },
    {
      title: "Distribuidoras",
      description: "Solución B2B con gestión de mayoristas y precios por volumen.",
      features: ["Precios por volumen", "Gestión B2B", "Créditos y cobranzas", "Rutas de entrega"],
    },
  ]

  const benefits = [
    {
      title: "Aumento de Ventas",
      description: "Incrementa tus ventas hasta un 35% con nuestro sistema optimizado",
      metric: "+35%",
      icon: TrendingUp,
    },
    {
      title: "Reducción de Errores",
      description: "Minimiza errores humanos en un 90% con automatización inteligente",
      metric: "-90%",
      icon: Shield,
    },
    {
      title: "Velocidad de Atención",
      description: "Reduce el tiempo de atención al cliente en un 60%",
      metric: "+60%",
      icon: Zap,
    },
    {
      title: "Control de Inventario",
      description: "Mejora el control de stock y reduce pérdidas en un 45%",
      metric: "+45%",
      icon: Package,
    },
    {
      title: "Satisfacción del Cliente",
      description: "Aumenta la satisfacción del cliente con un servicio más rápido",
      metric: "+50%",
      icon: HeadphonesIcon,
    },
    {
      title: "Ahorro de Tiempo",
      description: "Ahorra hasta 4 horas diarias en tareas administrativas",
      metric: "4h/día",
      icon: Clock,
    },
  ]

  const testimonials = [
    {
      name: "María González",
      business: "Restaurante El Sabor",
      content:
        "Desde que implementamos CNID POS, nuestras ventas aumentaron 40% y el control de inventario es perfecto. La interfaz es muy intuitiva.",
      rating: 5,
      results: "40% más ventas, 0% errores de inventario",
    },
    {
      name: "Carlos Mendoza",
      business: "Farmacia San Rafael",
      content:
        "El sistema nos ayuda a controlar los vencimientos y el stock crítico. Los reportes son excelentes y el soporte es inmediato.",
      rating: 5,
      results: "95% menos productos vencidos, reportes automáticos",
    },
    {
      name: "Ana Rodríguez",
      business: "Boutique Elegancia",
      content:
        "La gestión de múltiples tallas y colores es fantástica. Los códigos QR nos facilitan mucho el trabajo y los clientes están contentos.",
      rating: 5,
      results: "60% menos tiempo en ventas, clientes más satisfechos",
    },
    {
      name: "Roberto Silva",
      business: "Supermercado Central",
      content:
        "Manejamos 5 cajas simultáneamente sin problemas. El sistema es muy estable y los reportes nos ayudan a tomar mejores decisiones.",
      rating: 5,
      results: "5 cajas funcionando, decisiones basadas en datos",
    },
    {
      name: "Lucía Paredes",
      business: "Distribuidora Norte",
      content: "La gestión B2B y los precios por volumen nos han permitido crecer 50% este año. Excelente inversión.",
      rating: 5,
      results: "50% crecimiento anual, gestión B2B eficiente",
    },
    {
      name: "Diego Morales",
      business: "Taller Automotriz",
      content:
        "El control de servicios y la facturación por horas es exactamente lo que necesitábamos. Muy recomendado.",
      rating: 5,
      results: "Control total de servicios, facturación precisa",
    },
  ]

  const pricingPlans = [
    {
      name: "Básico",
      price: "₲ 150.000",
      period: "/mes",
      description: "Perfecto para pequeños negocios",
      features: [
        "1 Usuario",
        "POS Básico",
        "Inventario Simple",
        "Reportes Básicos",
        "Soporte por Email",
        "Backup Semanal",
      ],
      popular: false,
    },
    {
      name: "Profesional",
      price: "₲ 300.000",
      period: "/mes",
      description: "Ideal para negocios en crecimiento",
      features: [
        "5 Usuarios",
        "POS Completo",
        "Inventario Avanzado",
        "Reportes Completos",
        "Soporte Prioritario",
        "Backup Diario",
        "Múltiples Cajas",
        "Códigos QR/Barras",
      ],
      popular: true,
    },
    {
      name: "Empresarial",
      price: "₲ 500.000",
      period: "/mes",
      description: "Para empresas grandes",
      features: [
        "Usuarios Ilimitados",
        "Multi-sucursal",
        "Analytics Avanzado",
        "API Personalizada",
        "Soporte 24/7",
        "Backup en Tiempo Real",
        "Integración Contable",
        "Consultor Dedicado",
      ],
      popular: false,
    },
  ]

  const faqs = [
    {
      question: "¿Qué incluye el sistema POS?",
      answer:
        "Nuestro sistema incluye punto de venta completo, gestión de inventario, reportes avanzados, facturación electrónica, gestión de usuarios y soporte técnico completo.",
    },
    {
      question: "¿Funciona sin internet?",
      answer:
        "Sí, el sistema tiene modo offline que permite seguir vendiendo sin conexión. Los datos se sincronizan automáticamente cuando se restablece la conexión.",
    },
    {
      question: "¿Puedo migrar mis datos actuales?",
      answer:
        "Absolutamente. Ofrecemos migración gratuita de datos desde cualquier sistema anterior, incluyendo Excel, otros POS o sistemas contables.",
    },
    {
      question: "¿Qué tipo de soporte ofrecen?",
      answer:
        "Ofrecemos soporte técnico completo por teléfono, email y chat en vivo. Los planes superiores incluyen soporte prioritario y consultor dedicado.",
    },
    {
      question: "¿Es seguro el sistema?",
      answer:
        "Sí, utilizamos encriptación de nivel bancario, backups automáticos y cumplimos con todas las normativas de seguridad de datos.",
    },
    {
      question: "¿Puedo personalizar el sistema?",
      answer:
        "Sí, el sistema es altamente personalizable. Puedes ajustar la interfaz, reportes, campos personalizados y flujos de trabajo según tus necesidades.",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CNID POS
                </h1>
                <p className="text-xs text-gray-500">Sistema Integral</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">
                Características
              </a>
              <a href="#solutions" className="text-gray-700 hover:text-blue-600 transition-colors">
                Soluciones
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors">
                Precios
              </a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors">
                Contacto
              </a>
              {user ? (
                <Link href={user.role === "admin" ? "/admin" : "/pos"}>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Ir al Sistema
                  </Button>
                </Link>
              ) : (
                <Link href="/pos">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Probar Gratis
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Características
                </a>
                <a href="#solutions" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Soluciones
                </a>
                <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Precios
                </a>
                <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Contacto
                </a>
                {user ? (
                  <Link href={user.role === "admin" ? "/admin" : "/pos"}>
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Ir al Sistema
                    </Button>
                  </Link>
                ) : (
                  <Link href="/pos">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Probar Gratis
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-800 hover:bg-blue-200">🚀 Sistema POS #1 en Paraguay</Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              El Sistema POS que
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Revoluciona tu Negocio
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Gestión completa de ventas, inventario y reportes. Más de 1,000 empresas confían en nosotros para hacer
              crecer sus negocios.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600">1,000+</div>
                <div className="text-gray-600">Empresas Activas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-purple-600">99.9%</div>
                <div className="text-gray-600">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-green-600">24/7</div>
                <div className="text-gray-600">Soporte</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-orange-600">50+</div>
                <div className="text-gray-600">Herramientas</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pos">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Probar Gratis Ahora
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4 bg-transparent">
                <Phone className="mr-2 h-5 w-5" />
                Solicitar Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-800">Características Principales</Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nuestro sistema integral incluye todas las herramientas que tu negocio necesita para crecer y prosperar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={index}
                  className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2"
                >
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-600">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-800">50+ Herramientas Incluidas</Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Herramientas Profesionales</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Accede a más de 50 herramientas profesionales diseñadas para optimizar cada aspecto de tu negocio.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {tools.map((tool, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center border hover:border-blue-200"
              >
                <div className="text-sm font-medium text-gray-700">{tool}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Solutions */}
      <section id="solutions" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-100 text-orange-800">Soluciones por Industria</Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Adaptado a tu tipo de negocio</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Soluciones especializadas para cada industria con funcionalidades específicas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {businessTypes.map((business, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900">{business.title}</CardTitle>
                  <CardDescription className="text-gray-600">{business.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {business.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <ChevronRight className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
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

      {/* Benefits */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/20 text-white">Resultados Comprobados</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Beneficios que transforman tu negocio</h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Nuestros clientes experimentan mejoras significativas desde el primer día de implementación.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold mb-2">{benefit.metric}</div>
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="opacity-90">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-yellow-100 text-yellow-800">Testimonios</Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Lo que dicen nuestros clientes</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Más de 1,000 empresas han transformado sus negocios con nuestro sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardDescription className="text-gray-700 italic">"{testimonial.content}"</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-t pt-4">
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.business}</div>
                    <div className="text-sm text-green-600 font-medium mt-1">{testimonial.results}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-800">Planes y Precios</Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Elige el plan perfecto para ti</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Planes flexibles que se adaptan al tamaño y necesidades de tu negocio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative border-0 shadow-lg ${plan.popular ? "ring-2 ring-blue-600 scale-105" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">Más Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-gray-900 mt-4">
                    {plan.price}
                    <span className="text-lg font-normal text-gray-600">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-900 hover:bg-gray-800"}`}
                  >
                    Comenzar Ahora
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-800">Preguntas Frecuentes</Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Resolvemos tus dudas</h2>
            <p className="text-xl text-gray-600">Las preguntas más comunes sobre nuestro sistema POS.</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-800">Contacto</Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">¿Listo para comenzar?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Contáctanos hoy y descubre cómo podemos transformar tu negocio.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Teléfono</h3>
                  <p className="text-gray-600">+595 21 123-4567</p>
                  <p className="text-gray-600">+595 981 123-456</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                  <p className="text-gray-600">ventas@cnidpos.com</p>
                  <p className="text-gray-600">soporte@cnidpos.com</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Dirección</h3>
                  <p className="text-gray-600">Av. Mariscal López 1234</p>
                  <p className="text-gray-600">Asunción, Paraguay</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Horarios</h3>
                  <p className="text-gray-600">Lun - Vie: 8:00 - 18:00</p>
                  <p className="text-gray-600">Sáb: 8:00 - 12:00</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Solicita una Demo Gratuita</CardTitle>
                <CardDescription>Completa el formulario y te contactaremos en menos de 24 horas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nombre</label>
                    <Input placeholder="Tu nombre completo" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Empresa</label>
                    <Input placeholder="Nombre de tu empresa" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <Input type="email" placeholder="tu@email.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Teléfono</label>
                    <Input placeholder="+595 981 123-456" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo de Negocio</label>
                  <Input placeholder="Ej: Restaurante, Retail, Farmacia..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Mensaje</label>
                  <Textarea placeholder="Cuéntanos sobre tu negocio y necesidades..." rows={4} />
                </div>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Solicitar Demo Gratuita
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">CNID POS</h3>
                  <p className="text-sm text-gray-400">Sistema Integral</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4">
                El sistema POS más completo de Paraguay. Transformamos negocios desde 2020.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                  <span className="text-xs">f</span>
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                  <span className="text-xs">ig</span>
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                  <span className="text-xs">tw</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Producto</h4>
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
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Seguridad
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Soluciones</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Restaurantes
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Retail
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Farmacias
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Supermercados
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Servicios
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Soporte</h4>
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
                    Tutoriales
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
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2024 CNID POS. Todos los derechos reservados.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Términos
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacidad
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
