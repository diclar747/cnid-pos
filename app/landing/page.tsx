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
  CreditCard,
  FileText,
  Settings,
  Shield,
  TrendingUp,
  Star,
  Check,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  QrCode,
  Printer,
  Calculator,
  Clock,
  Database,
  Wifi,
  Lock,
  Headphones,
  Award,
  Target,
  DollarSign,
  PieChart,
  BarChart,
  LineChart,
  Calendar,
  Bell,
  Search,
  Filter,
  Download,
  Upload,
  FolderSyncIcon as Sync,
  Globe,
  MessageSquare,
  ThumbsUp,
  Eye,
  Edit,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
  Save,
  Share2,
  Copy,
  ExternalLink,
  Home,
  Building,
  Store,
  Truck,
  Box,
  Tag,
  Percent,
  Hash,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  Menu,
  X,
  MessageCircle,
  Moon,
  Sun,
} from "lucide-react"

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const features = [
    {
      icon: ShoppingCart,
      title: "Punto de Venta Completo",
      description:
        "Sistema POS intuitivo con procesamiento rápido de ventas, múltiples métodos de pago, y gestión de descuentos automáticos.",
      details: ["Interfaz táctil optimizada", "Múltiples formas de pago", "Descuentos y promociones", "Ventas offline"],
    },
    {
      icon: Package,
      title: "Gestión de Inventario",
      description:
        "Control total de stock con alertas automáticas, códigos de barras, y seguimiento en tiempo real de productos.",
      details: ["Alertas de stock bajo", "Códigos QR y barras", "Categorización avanzada", "Control de lotes"],
    },
    {
      icon: BarChart3,
      title: "Reportes y Analytics",
      description:
        "Dashboards interactivos con métricas de ventas, análisis de tendencias, y reportes personalizables en PDF.",
      details: ["Reportes en tiempo real", "Gráficos interactivos", "Exportación PDF/Excel", "Análisis predictivo"],
    },
    {
      icon: Users,
      title: "Gestión de Clientes",
      description:
        "Base de datos completa de clientes con historial de compras, programas de fidelidad, y comunicación automatizada.",
      details: ["Perfiles detallados", "Historial de compras", "Programa de puntos", "Marketing directo"],
    },
    {
      icon: CreditCard,
      title: "Facturación Electrónica",
      description:
        "Generación automática de facturas conformes a normativas paraguayas con numeración correlativa y timbrado fiscal.",
      details: ["Cumple normativas SET", "Numeración automática", "Timbrado fiscal", "Envío por email"],
    },
    {
      icon: FileText,
      title: "Gestión Financiera",
      description:
        "Control completo de gastos, ingresos, flujo de caja, y conciliación bancaria con reportes financieros detallados.",
      details: ["Control de gastos", "Flujo de caja", "Conciliación bancaria", "Estados financieros"],
    },
    {
      icon: Truck,
      title: "Gestión de Proveedores",
      description:
        "Administración completa de proveedores con órdenes de compra automáticas, evaluación de desempeño, y comunicación integrada.",
      details: ["Órdenes automáticas", "Evaluación de proveedores", "Comunicación integrada", "Historial de compras"],
    },
    {
      icon: Shield,
      title: "Seguridad y Respaldos",
      description:
        "Sistema seguro con encriptación de datos, respaldos automáticos en la nube, y control de acceso por roles.",
      details: ["Encriptación de datos", "Respaldos automáticos", "Control de acceso", "Auditoría completa"],
    },
  ]

  const additionalFeatures = [
    { icon: QrCode, name: "Códigos QR" },
    { icon: Printer, name: "Impresión Térmica" },
    { icon: Calculator, name: "Calculadora Integrada" },
    { icon: Clock, name: "Control de Horarios" },
    { icon: Database, name: "Base de Datos Robusta" },
    { icon: Wifi, name: "Sincronización Online" },
    { icon: Lock, name: "Acceso Seguro" },
    { icon: Headphones, name: "Soporte 24/7" },
    { icon: Award, name: "Certificaciones" },
    { icon: Target, name: "Metas de Ventas" },
    { icon: DollarSign, name: "Multi-Moneda" },
    { icon: PieChart, name: "Análisis de Rentabilidad" },
    { icon: BarChart, name: "Comparativas" },
    { icon: LineChart, name: "Tendencias" },
    { icon: Calendar, name: "Programación" },
    { icon: Bell, name: "Notificaciones" },
    { icon: Search, name: "Búsqueda Avanzada" },
    { icon: Filter, name: "Filtros Inteligentes" },
    { icon: Download, name: "Exportación" },
    { icon: Upload, name: "Importación" },
    { icon: Sync, name: "Sincronización" },
    { icon: Globe, name: "Multi-Idioma" },
    { icon: MessageSquare, name: "Chat Integrado" },
    { icon: ThumbsUp, name: "Feedback" },
    { icon: Eye, name: "Monitoreo" },
    { icon: Edit, name: "Personalización" },
    { icon: Trash2, name: "Eliminación Segura" },
    { icon: Plus, name: "Agregar Rápido" },
    { icon: Minus, name: "Descuentos" },
    { icon: RefreshCw, name: "Actualizaciones" },
    { icon: Save, name: "Guardado Auto" },
    { icon: Share2, name: "Compartir" },
    { icon: Copy, name: "Duplicar" },
    { icon: ExternalLink, name: "Integraciones" },
    { icon: Home, name: "Dashboard" },
    { icon: Building, name: "Multi-Sucursal" },
    { icon: Store, name: "E-commerce" },
    { icon: Box, name: "Almacenes" },
    { icon: Tag, name: "Etiquetas" },
    { icon: Percent, name: "Comisiones" },
    { icon: Hash, name: "Numeración" },
    { icon: AlertTriangle, name: "Alertas" },
    { icon: CheckCircle, name: "Validaciones" },
    { icon: XCircle, name: "Cancelaciones" },
    { icon: Info, name: "Información" },
    { icon: HelpCircle, name: "Ayuda Contextual" },
  ]

  const businessSolutions = [
    {
      icon: Store,
      title: "Supermercados y Minimarkets",
      description: "Gestión completa para retail con control de perecederos, promociones, y múltiples cajas.",
      features: ["Control de vencimientos", "Promociones 2x1", "Múltiples cajas", "Balanzas integradas"],
    },
    {
      icon: Building,
      title: "Restaurantes y Cafeterías",
      description: "Sistema especializado para food service con comandas, mesas, y gestión de cocina.",
      features: ["Gestión de mesas", "Comandas de cocina", "Modificadores", "Delivery integrado"],
    },
    {
      icon: Package,
      title: "Farmacias",
      description: "Solución específica para farmacias con control de medicamentos y recetas médicas.",
      features: ["Control de medicamentos", "Recetas médicas", "Vencimientos críticos", "Trazabilidad"],
    },
    {
      icon: Settings,
      title: "Talleres y Servicios",
      description: "Gestión de servicios con órdenes de trabajo, repuestos, y seguimiento de reparaciones.",
      features: ["Órdenes de trabajo", "Control de repuestos", "Seguimiento", "Garantías"],
    },
    {
      icon: Truck,
      title: "Distribuidoras",
      description: "Sistema para distribución con rutas, vendedores, y gestión de territorio.",
      features: ["Rutas de venta", "Vendedores móviles", "Territorio", "Comisiones"],
    },
    {
      icon: Home,
      title: "Tiendas Especializadas",
      description: "Adaptable a cualquier tipo de negocio con configuraciones personalizadas.",
      features: ["Configuración flexible", "Campos personalizados", "Reportes específicos", "Integraciones"],
    },
  ]

  const benefits = [
    {
      icon: TrendingUp,
      title: "Aumenta tus Ventas",
      description: "Incrementa hasta 35% en ventas con análisis inteligente y estrategias automatizadas.",
      metric: "+35% ventas",
    },
    {
      icon: Clock,
      title: "Ahorra Tiempo",
      description: "Reduce 80% el tiempo en tareas administrativas con automatización completa.",
      metric: "-80% tiempo",
    },
    {
      icon: DollarSign,
      title: "Reduce Costos",
      description: "Disminuye costos operativos hasta 45% optimizando procesos y recursos.",
      metric: "-45% costos",
    },
    {
      icon: Target,
      title: "Mejora Precisión",
      description: "Elimina 99% de errores humanos con validaciones automáticas y controles.",
      metric: "99% precisión",
    },
    {
      icon: BarChart3,
      title: "Decisiones Inteligentes",
      description: "Toma decisiones basadas en datos con reportes en tiempo real y analytics.",
      metric: "Datos en tiempo real",
    },
    {
      icon: Shield,
      title: "Seguridad Total",
      description: "Protege tu información con encriptación bancaria y respaldos automáticos.",
      metric: "100% seguro",
    },
  ]

  const testimonials = [
    {
      name: "María González",
      business: "Supermercado Central",
      location: "Asunción",
      rating: 5,
      comment:
        "POS CNID transformó completamente nuestro negocio. Las ventas aumentaron 40% en 6 meses y el control de inventario es perfecto.",
      results: "40% más ventas, 0% faltantes de stock",
    },
    {
      name: "Carlos Mendoza",
      business: "Restaurante El Fogón",
      location: "Ciudad del Este",
      rating: 5,
      comment:
        "La gestión de mesas y comandas es increíble. Reducimos 60% el tiempo de atención y los clientes están más satisfechos.",
      results: "60% menos tiempo de espera, 95% satisfacción",
    },
    {
      name: "Ana Rodríguez",
      business: "Farmacia San Rafael",
      location: "Encarnación",
      rating: 5,
      comment:
        "El control de medicamentos y vencimientos nos salvó de pérdidas importantes. Sistema indispensable para farmacias.",
      results: "0% medicamentos vencidos, 25% más rentabilidad",
    },
    {
      name: "Roberto Silva",
      business: "Taller Mecánico Silva",
      location: "San Lorenzo",
      rating: 5,
      comment:
        "Las órdenes de trabajo digitales y el seguimiento de reparaciones profesionalizaron nuestro servicio completamente.",
      results: "100% órdenes digitales, 50% más clientes",
    },
    {
      name: "Patricia López",
      business: "Boutique Elegancia",
      location: "Fernando de la Mora",
      rating: 5,
      comment:
        "Los reportes de ventas y el programa de fidelidad aumentaron significativamente nuestras ventas recurrentes.",
      results: "70% clientes recurrentes, 30% ticket promedio",
    },
    {
      name: "Luis Benítez",
      business: "Distribuidora Norte",
      location: "Pedro Juan Caballero",
      rating: 5,
      comment: "La gestión de rutas y vendedores móviles optimizó nuestra operación. Cobertura 100% del territorio.",
      results: "100% cobertura, 45% más eficiencia",
    },
  ]

  const pricingPlans = [
    {
      name: "Básico",
      price: "₲ 120.000",
      period: "/mes",
      description: "Todas las características para 1 local",
      features: [
        "1 Local / Sucursal",
        "Punto de venta completo",
        "Gestión de inventario",
        "Reportes y analytics",
        "Gestión de clientes",
        "Facturación electrónica",
        "Control de gastos",
        "Soporte técnico 24/7",
        "Respaldos automáticos",
        "Todas las funcionalidades",
      ],
      popular: false,
    },
    {
      name: "Profesional",
      price: "₲ 320.000",
      period: "/mes",
      description: "Todas las características para 3 sucursales",
      features: [
        "3 Locales / Sucursales",
        "Punto de venta completo",
        "Gestión de inventario",
        "Reportes y analytics",
        "Gestión de clientes",
        "Facturación electrónica",
        "Control de gastos",
        "Gestión de proveedores",
        "Multi-sucursal",
        "Soporte técnico 24/7",
        "Respaldos automáticos",
        "Todas las funcionalidades",
      ],
      popular: true,
    },
    {
      name: "Comercial",
      price: "₲ 520.000",
      period: "/mes",
      description: "Todas las características para 5 sucursales",
      features: [
        "5 Locales / Sucursales",
        "Punto de venta completo",
        "Gestión de inventario",
        "Reportes y analytics",
        "Gestión de clientes",
        "Facturación electrónica",
        "Control de gastos",
        "Gestión de proveedores",
        "Multi-sucursal avanzado",
        "API personalizada",
        "Integraciones",
        "Consultor dedicado",
        "Soporte técnico 24/7",
        "Todas las funcionalidades",
      ],
      popular: false,
    },
  ]

  const faqs = [
    {
      question: "¿Qué incluye la instalación del sistema?",
      answer:
        "La instalación incluye configuración completa del sistema, migración de datos existentes, capacitación del personal, y soporte durante los primeros 30 días sin costo adicional.",
    },
    {
      question: "¿Es compatible con impresoras fiscales paraguayas?",
      answer:
        "Sí, POS CNID es totalmente compatible con todas las impresoras fiscales homologadas por la SET en Paraguay, incluyendo marcas como Hasar, Epson, y Bixolon.",
    },
    {
      question: "¿Puedo usar el sistema sin conexión a internet?",
      answer:
        "Absolutamente. El sistema funciona completamente offline y sincroniza automáticamente cuando se restablece la conexión a internet.",
    },
    {
      question: "¿Cómo funciona el soporte técnico?",
      answer:
        "Ofrecemos soporte técnico por múltiples canales: chat en vivo, WhatsApp, teléfono, y email. El tiempo de respuesta promedio es de 15 minutos en horario comercial.",
    },
    {
      question: "¿Puedo personalizar el sistema para mi negocio?",
      answer:
        "Sí, el sistema es altamente personalizable. Podemos adaptar campos, reportes, flujos de trabajo, y funcionalidades específicas según las necesidades de tu negocio.",
    },
    {
      question: "¿Qué pasa si quiero cambiar de plan?",
      answer:
        "Puedes cambiar de plan en cualquier momento. Los upgrades son inmediatos y los downgrades se aplican en el siguiente ciclo de facturación. No hay penalidades por cambios.",
    },
  ]

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white" 
        : "bg-gradient-to-br from-blue-50 via-white to-purple-50"
    }`}>
      {/* Navigation */}
      <nav className={`backdrop-blur-md border-b sticky top-0 z-50 transition-colors duration-300 ${
        isDarkMode 
          ? "bg-gray-900/90 border-gray-700" 
          : "bg-white/80 border-gray-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                POS CNID
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className={`transition-colors ${
                isDarkMode ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"
              }`}>
                Funcionalidades
              </a>
              <a href="#solutions" className={`transition-colors ${
                isDarkMode ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"
              }`}>
                Soluciones
              </a>
              <a href="#pricing" className={`transition-colors ${
                isDarkMode ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"
              }`}>
                Precios
              </a>
              <a href="#contact" className={`transition-colors ${
                isDarkMode ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"
              }`}>
                Contacto
              </a>
              <Button
                variant="outline"
                size="sm"
                className={`p-2 border-2 bg-transparent transition-colors ${
                  isDarkMode 
                    ? "border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white" 
                    : "border-gray-300 hover:bg-blue-50"
                }`}
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                className={`border-2 bg-transparent transition-colors ${
                  isDarkMode 
                    ? "border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white" 
                    : "border-gray-300 hover:bg-blue-50"
                }`}
                onClick={() => (window.location.href = "/login")}
              >
                Acceder
              </Button>
            </div>

            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className={`md:hidden border-t transition-colors duration-300 ${
            isDarkMode 
              ? "bg-gray-900 border-gray-700" 
              : "bg-white border-gray-200"
          }`}>
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="#features" className={`block px-3 py-2 transition-colors ${
                isDarkMode ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"
              }`}>
                Funcionalidades
              </a>
              <a href="#solutions" className={`block px-3 py-2 transition-colors ${
                isDarkMode ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"
              }`}>
                Soluciones
              </a>
              <a href="#pricing" className={`block px-3 py-2 transition-colors ${
                isDarkMode ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"
              }`}>
                Precios
              </a>
              <a href="#contact" className={`block px-3 py-2 transition-colors ${
                isDarkMode ? "text-gray-300 hover:text-blue-400" : "text-gray-700 hover:text-blue-600"
              }`}>
                Contacto
              </a>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={`p-2 border-2 bg-transparent transition-colors ${
                    isDarkMode 
                      ? "border-gray-600 text-gray-300 hover:bg-gray-800" 
                      : "border-gray-300 hover:bg-blue-50"
                  }`}
                  onClick={() => setIsDarkMode(!isDarkMode)}
                >
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  className={`flex-1 border-2 bg-transparent transition-colors ${
                    isDarkMode 
                      ? "border-gray-600 text-gray-300 hover:bg-gray-800" 
                      : "border-gray-300 hover:bg-blue-50"
                  }`}
                  onClick={() => (window.location.href = "/login")}
                >
                  Acceder
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200">
            🚀 Sistema #1 en Paraguay
          </Badge>

          <h1 className={`text-4xl md:text-6xl font-bold mb-6 transition-colors ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">POS CNID</span>
            <br />
            Sistema de Gestión Integral
          </h1>

          <p className={`text-xl mb-8 max-w-3xl mx-auto transition-colors ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}>
            La solución completa para modernizar tu negocio. Más de 50 herramientas integradas para punto de venta,
            inventario, facturación, reportes y mucho más.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3"
              onClick={() => window.open('https://wa.me/595994854167', '_blank')}
            >
              Contactar por WhatsApp
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-3 border-2 bg-transparent"
              onClick={() => (window.location.href = "/login")}
            >
              Acceder al Sistema
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">500+</div>
              <div className={`transition-colors ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Negocios Activos
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">50K+</div>
              <div className={`transition-colors ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Transacciones Diarias
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">99.9%</div>
              <div className={`transition-colors ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Uptime Garantizado
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">24/7</div>
              <div className={`transition-colors ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Soporte Técnico
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section id="features" className={`py-20 transition-colors duration-300 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>
              Funcionalidades Principales
            </h2>
            <p className={`text-xl max-w-3xl mx-auto transition-colors ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}>
              Todo lo que necesitas para gestionar tu negocio de manera profesional y eficiente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2"
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 mb-4 text-center">{feature.description}</CardDescription>
                  <ul className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className={`py-20 transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Más de 50 Herramientas Integradas</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Descubre todas las funcionalidades que hacen de POS CNID el sistema más completo del mercado
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {additionalFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-center group hover:-translate-y-1"
              >
                <feature.icon className="h-8 w-8 mx-auto mb-3 text-blue-600 group-hover:text-purple-600 transition-colors" />
                <p className="text-sm font-medium text-gray-700">{feature.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Solutions */}
      <section id="solutions" className={`py-20 transition-colors duration-300 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Soluciones por Tipo de Negocio</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Adaptamos nuestro sistema a las necesidades específicas de tu industria
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {businessSolutions.map((solution, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <solution.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">{solution.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 mb-4">{solution.description}</CardDescription>
                  <ul className="space-y-2">
                    {solution.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Beneficios Comprobados</h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Resultados reales que nuestros clientes han logrado con POS CNID
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm p-6 rounded-xl hover:bg-white/20 transition-all duration-300"
              >
                <benefit.icon className="h-12 w-12 mb-4 text-yellow-300" />
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="opacity-90 mb-3">{benefit.description}</p>
                <div className="text-2xl font-bold text-yellow-300">{benefit.metric}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={`py-20 transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Lo que Dicen Nuestros Clientes</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Testimonios reales de empresarios paraguayos que transformaron sus negocios
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">{testimonial.name}</CardTitle>
                  <CardDescription className="text-blue-600 font-medium">
                    {testimonial.business} - {testimonial.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.comment}"</p>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-green-800">Resultados:</p>
                    <p className="text-sm text-green-700">{testimonial.results}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={`py-20 transition-colors duration-300 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Planes y Precios</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Elige el plan perfecto para tu negocio. Todos incluyen soporte técnico y actualizaciones
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${plan.popular ? "ring-2 ring-blue-500 scale-105" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1">
                      Más Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" : "bg-gray-900 hover:bg-gray-800"}`}
                  >
                    Comenzar Ahora
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">¿Necesitas un plan personalizado?</p>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-2 bg-transparent"
              onClick={() => window.open('https://wa.me/595994854167', '_blank')}
            >
              Contactar Ventas
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`py-20 transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Preguntas Frecuentes</h2>
            <p className="text-xl text-gray-600">Resolvemos las dudas más comunes sobre POS CNID</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <HelpCircle className="h-5 w-5 text-blue-600 mr-3" />
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={`py-20 transition-colors duration-300 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Contáctanos</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Estamos aquí para ayudarte a transformar tu negocio. Contáctanos hoy mismo
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Teléfono</h3>
                  <a href="tel:+595994854167" className="text-gray-600 hover:text-blue-600 transition-colors">
                    +595 994 854 167
                  </a>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                  <a href="mailto:info@cnid.com.py" className="text-gray-600 hover:text-blue-600 transition-colors">
                    info@cnid.com.py
                  </a>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Oficina</h3>
                  <p className="text-gray-600">Avenida Fundadores</p>
                  <p className="text-gray-600">Ciudad Bella Vista</p>
                </div>
              </div>

              <div className="pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Síguenos</h3>
                <div className="flex space-x-4">
                  <Button size="sm" variant="outline" className="p-2 bg-transparent">
                    <Facebook className="h-5 w-5" />
                  </Button>
                  <Button size="sm" variant="outline" className="p-2 bg-transparent">
                    <Twitter className="h-5 w-5" />
                  </Button>
                  <Button size="sm" variant="outline" className="p-2 bg-transparent">
                    <Instagram className="h-5 w-5" />
                  </Button>
                  <Button size="sm" variant="outline" className="p-2 bg-transparent">
                    <Linkedin className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">Solicita una Demo Gratuita</CardTitle>
                <CardDescription>Completa el formulario y te contactaremos en menos de 24 horas</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                      <Input placeholder="Tu nombre completo" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <Input placeholder="+595 981 123-456" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <Input type="email" placeholder="tu@email.com" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Negocio</label>
                    <Input placeholder="Ej: Supermercado, Restaurante, Farmacia" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                    <Textarea placeholder="Cuéntanos sobre tu negocio y cómo podemos ayudarte" rows={4} />
                  </div>

                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Solicitar Demo Gratuita
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
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">POS CNID</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                El sistema de gestión integral más completo de Paraguay. Transformamos negocios con tecnología de
                vanguardia y soporte excepcional.
              </p>
              <div className="flex space-x-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:text-white hover:border-white bg-transparent"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:text-white hover:border-white bg-transparent"
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:text-white hover:border-white bg-transparent"
                >
                  <Instagram className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:text-white hover:border-white bg-transparent"
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Enlaces Rápidos</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a href="#solutions" className="text-gray-400 hover:text-white transition-colors">
                    Soluciones
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-gray-400 hover:text-white transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Ayuda
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Soporte</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Centro de Ayuda
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Documentación
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Tutoriales
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Estado del Sistema
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Términos de Servicio
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    Política de Privacidad
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">© 2024 POS CNID. Todos los derechos reservados.</p>
              <div className="flex items-center space-x-6 mt-4 md:mt-0">
                <Badge variant="outline" className="border-green-500 text-green-400">
                  <Shield className="h-3 w-3 mr-1" />
                  SSL Seguro
                </Badge>
                <Badge variant="outline" className="border-blue-500 text-blue-400">
                  <Award className="h-3 w-3 mr-1" />
                  ISO 27001
                </Badge>
                <Badge variant="outline" className="border-purple-500 text-purple-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  SET Homologado
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/595994854167"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-50 animate-pulse"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  )
}
