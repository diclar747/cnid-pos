"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ShoppingCart,
  BarChart3,
  Users,
  Package,
  CreditCard,
  Shield,
  Star,
  Check,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  TrendingUp,
  Award,
  Target,
  FileText,
  ChevronDown,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const features = [
    {
      icon: ShoppingCart,
      title: "Sistema POS Completo",
      description: "Procesa ventas rápidamente con interfaz intuitiva, códigos de barras y múltiples métodos de pago.",
      benefits: ["Ventas 3x más rápidas", "0% errores de cálculo", "Soporte offline"],
    },
    {
      icon: BarChart3,
      title: "Reportes Avanzados",
      description: "Analiza tu negocio con reportes detallados de ventas, inventario y rendimiento en tiempo real.",
      benefits: ["Insights automáticos", "Predicciones de stock", "ROI visible"],
    },
    {
      icon: Package,
      title: "Gestión de Inventario",
      description: "Control total de stock con alertas automáticas, códigos QR y seguimiento de productos.",
      benefits: ["Stock siempre actualizado", "Alertas inteligentes", "Trazabilidad completa"],
    },
    {
      icon: Users,
      title: "Gestión de Empleados",
      description: "Administra usuarios, permisos y horarios con sistema de roles y seguimiento de actividad.",
      benefits: ["Control de acceso", "Productividad medible", "Seguridad garantizada"],
    },
    {
      icon: CreditCard,
      title: "Múltiples Pagos",
      description: "Acepta efectivo, tarjetas, transferencias y pagos digitales con integración bancaria.",
      benefits: ["Más opciones de pago", "Conciliación automática", "Menos efectivo perdido"],
    },
    {
      icon: FileText,
      title: "Facturación Electrónica",
      description: "Genera facturas legales automáticamente con numeración correlativa y respaldo en la nube.",
      benefits: ["Cumplimiento fiscal", "Facturas instantáneas", "Respaldo seguro"],
    },
  ]

  const tools = [
    "Scanner de Códigos",
    "Impresión Térmica",
    "Códigos QR",
    "Backup Automático",
    "Modo Offline",
    "Multi-sucursal",
    "API Integración",
    "Reportes PDF",
    "Dashboard Móvil",
    "Alertas SMS",
    "Control Remoto",
    "Sincronización",
    "Seguridad SSL",
    "Soporte 24/7",
    "Capacitación",
    "Actualizaciones",
    "Personalización",
    "Escalabilidad",
    "Análisis IA",
    "Predicciones",
    "Automatización",
    "Integración ERP",
    "E-commerce",
    "Delivery",
    "Loyalty Program",
    "Gift Cards",
    "Promociones",
    "Descuentos",
    "Comisiones",
    "Metas de Venta",
    "KPIs Automáticos",
    "Benchmarking",
    "Auditoría",
    "Compliance",
    "GDPR Ready",
    "Backup Cloud",
    "Disaster Recovery",
    "Load Balancing",
    "CDN Global",
    "99.9% Uptime",
    "Monitoreo 24/7",
    "Alertas Proactivas",
    "Performance Tuning",
    "Security Scanning",
    "Penetration Testing",
    "Data Encryption",
    "Access Control",
    "Audit Logs",
    "Compliance Reports",
    "Training Videos",
  ]

  const solutions = [
    {
      title: "Restaurantes",
      description: "Gestión completa para restaurantes con comandas, cocina y delivery integrado.",
      features: ["Comandas digitales", "Control de cocina", "Delivery tracking", "Mesas y reservas"],
      icon: "🍽️",
    },
    {
      title: "Retail & Tiendas",
      description: "Solución perfecta para tiendas con gestión de inventario y múltiples sucursales.",
      features: ["Multi-sucursal", "Control de stock", "Promociones", "Fidelización"],
      icon: "🛍️",
    },
    {
      title: "Farmacias",
      description: "Sistema especializado con control de medicamentos y recetas médicas.",
      features: ["Control de lotes", "Vencimientos", "Recetas", "Regulaciones"],
      icon: "💊",
    },
    {
      title: "Supermercados",
      description: "Manejo de grandes volúmenes con códigos de barras y balanzas integradas.",
      features: ["Códigos de barras", "Balanzas", "Ofertas", "Inventario masivo"],
      icon: "🏪",
    },
    {
      title: "Servicios",
      description: "Gestión de citas, servicios y facturación para empresas de servicios.",
      features: ["Agenda de citas", "Servicios", "Facturación", "CRM integrado"],
      icon: "🔧",
    },
    {
      title: "Distribuidoras",
      description: "Control de distribución con rutas, vendedores y clientes mayoristas.",
      features: ["Rutas de venta", "Vendedores", "Mayoristas", "Logística"],
      icon: "🚛",
    },
  ]

  const benefits = [
    {
      title: "Aumenta Ventas",
      description: "Incrementa tus ingresos hasta 35% con herramientas de análisis y optimización.",
      metric: "+35%",
      icon: TrendingUp,
    },
    {
      title: "Reduce Errores",
      description: "Elimina 90% de errores humanos con automatización y validaciones inteligentes.",
      metric: "-90%",
      icon: Target,
    },
    {
      title: "Ahorra Tiempo",
      description: "Reduce 60% el tiempo en tareas administrativas con procesos automatizados.",
      metric: "-60%",
      icon: Clock,
    },
    {
      title: "Mejora Control",
      description: "Obtén 100% visibilidad de tu negocio con reportes en tiempo real.",
      metric: "100%",
      icon: Award,
    },
    {
      title: "Reduce Costos",
      description: "Disminuye gastos operativos hasta 25% optimizando recursos y procesos.",
      metric: "-25%",
      icon: Shield,
    },
    {
      title: "Satisfacción Cliente",
      description: "Mejora 40% la experiencia del cliente con atención más rápida y eficiente.",
      metric: "+40%",
      icon: Star,
    },
  ]

  const testimonials = [
    {
      name: "María González",
      business: "Restaurante El Sabor",
      content:
        "Desde que implementamos CNID POS, nuestras ventas aumentaron 40% y los errores desaparecieron completamente. La gestión de comandas es increíble.",
      rating: 5,
      results: "40% más ventas, 0 errores",
      image: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Carlos Mendoza",
      business: "Supermercado Central",
      content:
        "El control de inventario es excepcional. Ahora sabemos exactamente qué tenemos en stock y las alertas nos ayudan a nunca quedarnos sin productos.",
      rating: 5,
      results: "95% menos faltantes de stock",
      image: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Ana Rodríguez",
      business: "Farmacia San Rafael",
      content:
        "La facturación electrónica y el control de vencimientos nos ahorraron horas de trabajo diario. Excelente inversión para nuestra farmacia.",
      rating: 5,
      results: "5 horas diarias ahorradas",
      image: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Luis Paredes",
      business: "Tienda Fashion Style",
      content:
        "El sistema multi-sucursal nos permitió expandirnos sin perder control. Los reportes nos muestran exactamente dónde estamos ganando más.",
      rating: 5,
      results: "3 sucursales nuevas abiertas",
      image: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Patricia Silva",
      business: "Panadería Doña Paty",
      content:
        "La facilidad de uso es impresionante. Mis empleados aprendieron en un día y ahora atendemos 50% más clientes en el mismo tiempo.",
      rating: 5,
      results: "50% más clientes atendidos",
      image: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Roberto Jiménez",
      business: "Ferretería El Tornillo",
      content:
        "Los códigos QR y el scanner nos revolucionaron. Ya no perdemos tiempo buscando precios y el inventario siempre está actualizado.",
      rating: 5,
      results: "70% más rápido en ventas",
      image: "/placeholder.svg?height=60&width=60",
    },
  ]

  const plans = [
    {
      name: "Básico",
      price: "₲ 450.000",
      period: "/mes",
      description: "Perfect para pequeños negocios",
      features: [
        "1 Terminal POS",
        "Hasta 1,000 productos",
        "Reportes básicos",
        "Facturación electrónica",
        "Soporte por email",
        "Backup diario",
        "1 usuario",
      ],
      popular: false,
    },
    {
      name: "Profesional",
      price: "₲ 750.000",
      period: "/mes",
      description: "Ideal para negocios en crecimiento",
      features: [
        "3 Terminales POS",
        "Productos ilimitados",
        "Reportes avanzados",
        "Multi-sucursal",
        "Soporte prioritario",
        "Backup en tiempo real",
        "5 usuarios",
        "Integración API",
        "Códigos QR",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "₲ 1.200.000",
      period: "/mes",
      description: "Para grandes empresas",
      features: [
        "Terminales ilimitadas",
        "Todo incluido",
        "BI y Analytics",
        "Soporte 24/7",
        "Gerente de cuenta",
        "Personalización",
        "Usuarios ilimitados",
        "Integración ERP",
        "SLA 99.9%",
        "Capacitación on-site",
      ],
      popular: false,
    },
  ]

  const faqs = [
    {
      question: "¿Qué incluye la implementación del sistema?",
      answer:
        "La implementación incluye instalación completa, migración de datos existentes, capacitación del personal, configuración personalizada y soporte durante los primeros 30 días sin costo adicional.",
    },
    {
      question: "¿El sistema funciona sin internet?",
      answer:
        "Sí, CNID POS funciona completamente offline. Todas las ventas se guardan localmente y se sincronizan automáticamente cuando se restaura la conexión a internet.",
    },
    {
      question: "¿Puedo integrar con mi sistema contable actual?",
      answer:
        "Absolutamente. Ofrecemos integraciones con los principales sistemas contables del Paraguay y APIs personalizadas para cualquier sistema específico que manejes.",
    },
    {
      question: "¿Qué tipo de soporte técnico ofrecen?",
      answer:
        "Brindamos soporte técnico 24/7 por teléfono, chat y email. Incluye actualizaciones automáticas, mantenimiento preventivo y resolución de incidencias en tiempo real.",
    },
    {
      question: "¿Cómo funciona la facturación electrónica?",
      answer:
        "Nuestro sistema genera automáticamente facturas electrónicas válidas según normativas de la SET, con numeración correlativa, timbrado digital y respaldo en la nube.",
    },
    {
      question: "¿Puedo probar el sistema antes de comprarlo?",
      answer:
        "Sí, ofrecemos una demo gratuita de 15 días con todas las funcionalidades incluidas. También brindamos capacitación gratuita durante el período de prueba.",
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CNID POS
              </span>
            </div>

            {/* Desktop Menu */}
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
              <Link href="/login">
                <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/pos">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Probar Demo
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
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
                <div className="flex flex-col space-y-2 pt-4">
                  <Link href="/login">
                    <Button
                      variant="outline"
                      className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
                    >
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link href="/pos">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Probar Demo
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-200">
              🚀 Líder en Sistemas POS en Paraguay
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              El Sistema POS que
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Revoluciona tu Negocio
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Potencia tu empresa con la solución POS más completa del Paraguay. Gestión integral, reportes inteligentes
              y crecimiento garantizado.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">1,000+</div>
                <div className="text-gray-600">Empresas Confían</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">99.9%</div>
                <div className="text-gray-600">Uptime Garantizado</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">24/7</div>
                <div className="text-gray-600">Soporte Técnico</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">15 días</div>
                <div className="text-gray-600">Prueba Gratuita</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pos">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4"
                >
                  Probar Demo Gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-2 bg-transparent">
                Ver Video Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">✨ Características Principales</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para hacer crecer tu negocio
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Descubre las herramientas que han ayudado a más de 1,000 empresas paraguayas a aumentar sus ventas y
              optimizar sus operaciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:scale-105"
              >
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-600">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700">🛠️ Herramientas Incluidas</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Más de 50 herramientas profesionales</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Cada funcionalidad diseñada para maximizar tu productividad y rentabilidad
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tools.map((tool, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-center border hover:border-blue-200 hover:scale-105"
              >
                <div className="text-sm font-medium text-gray-700">{tool}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700">🎯 Soluciones por Industria</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Adaptado a tu tipo de negocio</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Configuraciones especializadas para cada industria con las mejores prácticas del mercado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {solutions.map((solution, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
                <CardHeader>
                  <div className="text-4xl mb-4">{solution.icon}</div>
                  <CardTitle className="text-xl font-bold text-gray-900">{solution.title}</CardTitle>
                  <CardDescription className="text-gray-600">{solution.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {solution.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
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
      <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-100 text-orange-700">📈 Resultados Comprobados</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Beneficios que transforman tu negocio</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Métricas reales de nuestros clientes que demuestran el impacto positivo en sus operaciones
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card
                key={index}
                className="text-center group hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <benefit.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">{benefit.metric}</div>
                  <CardTitle className="text-xl font-bold text-gray-900">{benefit.title}</CardTitle>
                  <CardDescription className="text-gray-600">{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-yellow-100 text-yellow-700">⭐ Testimonios Reales</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Lo que dicen nuestros clientes</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Historias de éxito de empresarios paraguayos que transformaron sus negocios con CNID POS
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={testimonial.image || "/placeholder.svg"}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.business}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm font-semibold text-green-700">Resultado:</div>
                    <div className="text-sm text-green-600">{testimonial.results}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700">💰 Planes y Precios</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Elige el plan perfecto para tu negocio
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Precios transparentes en guaraníes paraguayos. Sin costos ocultos, sin sorpresas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${plan.popular ? "ring-2 ring-blue-600 scale-105" : ""} hover:shadow-xl transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">Más Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <CardDescription className="text-gray-600 mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
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
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700">❓ Preguntas Frecuentes</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Resolvemos tus dudas</h2>
            <p className="text-xl text-gray-600">Las preguntas más comunes sobre nuestro sistema POS</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold text-gray-900">{faq.question}</CardTitle>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transition-transform ${openFaq === index ? "rotate-180" : ""}`}
                    />
                  </div>
                </CardHeader>
                {openFaq === index && (
                  <CardContent className="pt-0">
                    <p className="text-gray-700">{faq.answer}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">📞 Contacto</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">¿Listo para transformar tu negocio?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Contáctanos hoy y descubre cómo CNID POS puede revolucionar tu empresa
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Teléfono</h3>
                    <p className="text-gray-600">+595 21 123-4567</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Email</h3>
                    <p className="text-gray-600">ventas@cnidpos.com.py</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Dirección</h3>
                    <p className="text-gray-600">Av. Mariscal López 1234, Asunción</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Horarios</h3>
                    <p className="text-gray-600">Lun - Vie: 8:00 - 18:00</p>
                    <p className="text-gray-600">Sáb: 8:00 - 12:00</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="p-8">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl font-bold text-gray-900">Solicita una Demo</CardTitle>
                <CardDescription className="text-gray-600">
                  Completa el formulario y te contactaremos en menos de 24 horas
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                      <Input placeholder="Tu nombre completo" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                      <Input placeholder="+595 xxx xxx xxx" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input type="email" placeholder="tu@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
                    <Input placeholder="Nombre de tu empresa" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Negocio</label>
                    <Input placeholder="Ej: Restaurante, Tienda, Farmacia" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje</label>
                    <Textarea placeholder="Cuéntanos sobre tu negocio y necesidades..." rows={4} />
                  </div>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-3">
                    Solicitar Demo Gratuita
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">CNID POS</span>
              </div>
              <p className="text-gray-400 mb-6">
                La solución POS más completa del Paraguay. Transformamos negocios desde 2020.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                  <span className="text-sm">f</span>
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                  <span className="text-sm">ig</span>
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer">
                  <span className="text-sm">tw</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-6">Producto</h3>
              <ul className="space-y-3 text-gray-400">
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
              <h3 className="font-semibold text-lg mb-6">Soporte</h3>
              <ul className="space-y-3 text-gray-400">
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
                    Capacitación
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Estado del Sistema
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-6">Empresa</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Sobre Nosotros
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
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Partners
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Términos
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">© 2024 CNID POS. Todos los derechos reservados.</p>
            <p className="text-gray-400 mt-4 md:mt-0">Hecho con ❤️ en Paraguay</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
