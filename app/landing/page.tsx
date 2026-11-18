"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowRight, Armchair, BarChart3, Bot, Building2, Camera, ChefHat, ChevronDown, ClipboardList, CreditCard,
  KanbanSquare, Mail, MapPinned, Menu, MessageCircle, PackageSearch, Printer, QrCode, ReceiptText, ShieldCheck,
  Smartphone, Sparkles, Truck, UserRound, Wallet, X,
} from "lucide-react"
import DemoPlayer, { type DemoChapter } from "../components/landing/demo-player"
import { LaptopFrame, PhoneFrame } from "../components/landing/device-frame"

const WHATSAPP = "https://wa.me/595994854167?text=Hola%2C%20quiero%20conocer%20RestoPOS."

const chapters: DemoChapter[] = [
  {
    id: "pos", title: "Tomar el pedido", summary: "Carta con fotos, variantes, agregados y precios por tipo de pedido.",
    frames: [
      { src: "/landing/pos.webp", alt: "Punto de venta de RestoPOS con la categoría Pastas y el carrito con tres platos", caption: "Elegís la categoría, tocás «Agregar» y el carrito suma al instante.", focus: { x: 92, y: 40, zoom: 1.32 }, highlight: { x: 78.5, y: 15.5, w: 20.5, h: 55 } },
      { src: "/landing/pos-agregados.webp", alt: "Cuadro para elegir agregados de un plato con su precio", caption: "Agregados y opciones obligatorias con su precio: el total se calcula solo.", focus: { x: 50, y: 50, zoom: 1.18 }, highlight: { x: 32.5, y: 7.5, w: 35.5, h: 85 } },
    ],
  },
  {
    id: "cocina", title: "Cocina en tiempo real", summary: "Cada comanda avanza de Pendiente a Entregado.",
    frames: [
      { src: "/landing/cocina.webp", alt: "Tablero de cocina con columnas Pendiente, Preparando, Listo, En reparto y Entregado", caption: "Las comandas llegan solas al tablero, con mesa, cliente y notas para cocina.", focus: { x: 30, y: 45, zoom: 1.28 }, highlight: { x: 21.2, y: 27.5, w: 18.5, h: 47 } },
      { src: "/landing/cocina.webp", alt: "Pedido de delivery en la columna En reparto", caption: "Delivery y retiro siguen su propio recorrido hasta la entrega.", focus: { x: 70, y: 45, zoom: 1.28 }, highlight: { x: 60.5, y: 27.5, w: 18.5, h: 47 } },
    ],
  },
  {
    id: "cuentas", title: "Mesas, mesero y precuenta", summary: "Cuentas abiertas por mesa o tarjeta QR, con mesero asignado.",
    frames: [
      { src: "/landing/ordenes.webp", alt: "Órdenes abiertas por mesa con mesero y estado de precuenta", caption: "Cada mesa tiene su cuenta: se suman consumos, se sigue la comanda y se imprime la precuenta.", focus: { x: 35, y: 55, zoom: 1.2 } },
      { src: "/landing/precuenta.webp", alt: "Precuenta impresa de 75 mm con mesa, mesero, detalle y total", caption: "Precuenta de 75 mm para el cliente; al cobrar, el comprobante con vuelto.", device: "ticket" },
    ],
  },
  {
    id: "qr", title: "El cliente pide desde su mesa", summary: "Escanea el QR, elige y el pedido llega a cocina.",
    frames: [
      { src: "/landing/mesa-qr.webp", alt: "Menú en el teléfono del cliente para pedir desde la mesa", caption: "Sin instalar nada: el cliente escanea el QR de la mesa, arma su pedido y consulta su cuenta.", device: "phone", focus: { x: 50, y: 30, zoom: 1.08 } },
      { src: "/landing/salones.webp", alt: "Administración de salones y mesas con códigos QR", caption: "Salones y mesas con QR propio, listos para imprimir.", focus: { x: 50, y: 45, zoom: 1.15 } },
    ],
  },
  {
    id: "control", title: "Ventas y control", summary: "Panel con ingresos, ticket promedio y productos.",
    frames: [
      { src: "/landing/panel.webp", alt: "Panel de control con ventas de hoy, ingresos, operaciones y ticket promedio", caption: "Ventas del día, ingresos, ticket promedio y compras en un solo lugar.", focus: { x: 60, y: 60, zoom: 1.2 }, highlight: { x: 19.5, y: 54, w: 78.5, h: 25 } },
      { src: "/landing/productos.webp", alt: "Administración de productos con precios y categorías", caption: "Productos, precios, stock y proveedores administrados desde el panel.", focus: { x: 55, y: 40, zoom: 1.15 } },
    ],
  },
  {
    id: "multi", title: "Varios restaurantes", summary: "Cada restaurante con sus datos, usuarios y carta separados.",
    frames: [
      { src: "/landing/superadmin.webp", alt: "Superadministración con la lista de restaurantes", caption: "Desde la superadministración creás restaurantes, cada uno con su propio administrador y datos aislados.", focus: { x: 50, y: 45, zoom: 1.15 } },
    ],
  },
]

const features = [
  { icon: Camera, title: "Venta rápida", text: "Buscador, lector de código o cámara del teléfono. Cobro en efectivo, tarjeta o transferencia." },
  { icon: Sparkles, title: "Variantes y agregados", text: "Tamaños, opciones obligatorias y agregados con precio. Precios distintos para local, delivery y retiro." },
  { icon: ChefHat, title: "Tablero de cocina", text: "Pendiente, preparando, listo, en reparto y entregado. Comandas impresas de 80 mm." },
  { icon: Armchair, title: "Salones y mesas", text: "Mesas con QR propio, cuentas abiertas y cambio de mesa sin perder consumos." },
  { icon: QrCode, title: "Pedido desde la mesa", text: "El cliente pide desde su teléfono y el pedido llega directo a cocina." },
  { icon: ReceiptText, title: "Precuenta y comprobante", text: "Tickets de 75 mm con mesa, mesero, agregados, vuelto y total." },
  { icon: UserRound, title: "Meseros y roles", text: "Administrador, gerente, cajero y mesero: cada uno ve y hace solo lo suyo." },
  { icon: PackageSearch, title: "Compras y stock", text: "Proveedores, órdenes de compra, recepción y descuento de stock en cada venta." },
  { icon: BarChart3, title: "Reportes", text: "Ventas por período, medios de pago, productos más vendidos y gastos." },
  { icon: Building2, title: "Multi-restaurante", text: "Cada restaurante con su base de datos separada, sus usuarios y su carta." },
  { icon: Smartphone, title: "Funciona en el teléfono", text: "Se instala como aplicación desde el navegador, en Android o iPhone." },
  { icon: ShieldCheck, title: "Datos protegidos", text: "Accesos por usuario, sesiones seguras y respaldos de PostgreSQL." },
]

const flow = [
  { icon: Armchair, title: "Mesa", text: "Se abre la cuenta y se asigna el mesero." },
  { icon: ClipboardList, title: "Comanda", text: "Los platos van a cocina con sus agregados y notas." },
  { icon: ChefHat, title: "Cocina", text: "Prepara y marca listo; el salón lo ve al instante." },
  { icon: ReceiptText, title: "Precuenta", text: "El cliente revisa su cuenta impresa." },
  { icon: CreditCard, title: "Cobro", text: "Comprobante con vuelto y la mesa queda libre." },
]

const upcoming = [
  { icon: MessageCircle, title: "WhatsApp por restaurante", text: "Cada restaurante conecta su número con un QR y recibe pedidos por WhatsApp." },
  { icon: Bot, title: "Asistente con IA", text: "Atiende, arma el pedido con la carta y los precios reales, y avisa cada cambio de estado." },
  { icon: KanbanSquare, title: "Tablero de pedidos", text: "Todos los pedidos en columnas, en tiempo real, con historial de estados." },
  { icon: Truck, title: "Delivery por zonas", text: "Tarifas por zona, envío gratis desde un monto y repartidores asignados." },
  { icon: Wallet, title: "Caja", text: "Apertura y cierre, ingresos, egresos y pagos por QR." },
  { icon: MapPinned, title: "Ficha del restaurante", text: "Logo, horarios, ubicación, sucursales y datos comerciales." },
]

const faqs = [
  { q: "¿Necesito instalar algo?", a: "No. RestoPOS funciona en el navegador de la computadora, la tablet o el teléfono, y se puede instalar como aplicación desde el mismo navegador." },
  { q: "¿Puedo manejar varios restaurantes?", a: "Sí. Desde la superadministración se crean restaurantes; cada uno tiene su propia carta, ventas, mesas y usuarios, sin mezclarse con los demás." },
  { q: "¿Imprime comandas y tickets?", a: "Sí. Las comandas de cocina, las precuentas y los comprobantes se imprimen en papel térmico de 75 u 80 mm desde el navegador." },
  { q: "¿Puedo traer la carta de mi sistema anterior?", a: "Sí. Importamos artículos, variantes, precios por tipo de pedido y agregados; así se cargó la carta completa de De la Casa." },
  { q: "¿Mis clientes pueden pedir desde el teléfono?", a: "Sí. Cada mesa tiene su QR: el cliente ve la carta, elige y el pedido llega a cocina. El cobro se hace en el local." },
  { q: "¿Cuándo llega WhatsApp con IA?", a: "Está en desarrollo. Escribinos y te avisamos cuando esté disponible para tu restaurante." },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const nav = [["#demo", "Demo"], ["#funciones", "Funciones"], ["#restaurantes", "Multi-restaurante"], ["#proximamente", "Próximamente"], ["#preguntas", "Preguntas"]]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="RestoPOS, inicio">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30"><Sparkles className="h-5 w-5" /></span>
            <span className="text-xl font-black tracking-tight">Resto<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">POS</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex dark:text-slate-300" aria-label="Secciones">
            {nav.map(([href, label]) => <a key={href} href={href} className="hover:text-indigo-600 dark:hover:text-indigo-300">{label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 sm:inline-flex dark:bg-white dark:text-slate-900">Ingresar</Link>
            <button onClick={() => setMenuOpen((v) => !v)} className="rounded-lg p-2 md:hidden" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen}>
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950" aria-label="Secciones">
            {nav.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 font-medium hover:bg-slate-100 dark:hover:bg-slate-900">{label}</a>)}
            <Link href="/login" className="mt-2 block rounded-lg bg-slate-900 px-3 py-2.5 text-center font-semibold text-white dark:bg-white dark:text-slate-900">Ingresar</Link>
          </nav>
        )}
      </header>

      <main>
        {/* Portada */}
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_0%,rgba(99,102,241,.45),transparent),radial-gradient(50%_45%_at_90%_30%,rgba(168,85,247,.35),transparent)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-200">
                <ChefHat className="h-3.5 w-3.5" /> Sistema para restaurantes
              </span>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                De la mesa a la caja, <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">todo en un solo sistema.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-slate-300">
                RestoPOS une el punto de venta, las mesas, la cocina, la precuenta y el cobro. Tus clientes piden desde el QR de la mesa y cada restaurante trabaja con sus propios datos.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#demo" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-slate-900 shadow-xl shadow-indigo-500/20 hover:bg-indigo-50">
                  Ver la demo <ArrowRight className="h-4 w-4" />
                </a>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 font-semibold text-white hover:bg-white/10">
                  <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
                {["Funciona en el navegador", "Pedidos desde el QR de la mesa", "Varios restaurantes"].map((item) => (
                  <li key={item} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />{item}</li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <LaptopFrame className="lg:translate-x-6">
                <img src="/landing/pos.webp" alt="Punto de venta de RestoPOS" className="h-full w-full object-cover object-top" />
              </LaptopFrame>
              <div className="absolute -bottom-12 -left-2 hidden w-32 motion-safe:animate-[float_6s_ease-in-out_infinite] sm:block lg:-left-10 lg:w-40">
                <PhoneFrame>
                  <img src="/landing/mesa-qr.webp" alt="Pedido desde el QR de la mesa en el teléfono" className="h-full w-full object-cover object-top" />
                </PhoneFrame>
              </div>
              <img src="/landing/precuenta.webp" alt="Precuenta impresa" className="absolute -right-2 -top-8 hidden w-28 rotate-3 rounded-md shadow-2xl shadow-black/50 motion-safe:animate-[float_7s_ease-in-out_infinite_1s] md:block lg:w-32" />
            </div>
          </div>
        </section>

        {/* Demo */}
        <section id="demo" className="scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Recorrido</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Mirá RestoPOS funcionando</h2>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Pantallas reales del sistema, con la carta y los pedidos de un restaurante. Usá los capítulos o las flechas del teclado.</p>
            </div>
            <div className="mt-12"><DemoPlayer chapters={chapters} /></div>
          </div>
        </section>

        {/* Flujo */}
        <section className="bg-white px-4 py-16 sm:px-6 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-2xl font-black tracking-tight sm:text-3xl">Así se mueve un pedido</h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {flow.map((step, index) => (
                <li key={step.title} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><step.icon className="h-5 w-5" /></span>
                    <span className="text-xs font-bold text-slate-400">PASO {index + 1}</span>
                  </span>
                  <h3 className="mt-4 font-bold">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Funciones */}
        <section id="funciones" className="scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Funciones</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Lo que tu restaurante usa todos los días</h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-none">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-950 dark:text-indigo-300"><feature.icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 font-bold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Multi-restaurante */}
        <section id="restaurantes" className="scroll-mt-20 bg-slate-950 px-4 py-20 text-white sm:px-6">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">Multi-restaurante</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Un sistema, todos tus restaurantes</h2>
              <p className="mt-4 text-slate-300">La superadministración crea cada restaurante con su administrador. Cada uno trabaja con su propia base de datos: carta, ventas, mesas, cocina y usuarios nunca se cruzan.</p>
              <ul className="mt-6 space-y-3 text-slate-200">
                {["Alta de restaurantes con su administrador inicial", "Suspensión y reactivación del acceso", "Avisos generales o para un restaurante", "Datos aislados por restaurante"].map((item) => (
                  <li key={item} className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />{item}</li>
                ))}
              </ul>
            </div>
            <LaptopFrame>
              <img src="/landing/superadmin.webp" alt="Superadministración de restaurantes en RestoPOS" loading="lazy" className="h-full w-full object-cover object-top" />
            </LaptopFrame>
          </div>
        </section>

        {/* Próximamente */}
        <section id="proximamente" className="scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300">En desarrollo</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Lo que viene</h2>
              <p className="mt-3 text-slate-600 dark:text-slate-400">Estas funciones están en desarrollo y todavía no están disponibles.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((item) => (
                <article key={item.title} className="relative rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 p-6 dark:border-violet-800 dark:bg-violet-950/20">
                  <span className="absolute right-4 top-4 rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Próximamente</span>
                  <item.icon className="h-6 w-6 text-violet-600 dark:text-violet-300" />
                  <h3 className="mt-4 font-bold">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Preguntas */}
        <section id="preguntas" className="scroll-mt-20 bg-white px-4 py-20 sm:px-6 dark:bg-slate-900">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-black tracking-tight sm:text-4xl">Preguntas frecuentes</h2>
            <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
              {faqs.map((faq, index) => {
                const open = openFaq === index
                return (
                  <div key={faq.q}>
                    <button onClick={() => setOpenFaq(open ? null : index)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold">
                      {faq.q}
                      <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && <p className="px-5 pb-5 text-slate-600 dark:text-slate-400">{faq.a}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-2xl shadow-indigo-500/30 sm:p-12">
            <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">¿Querés RestoPOS en tu restaurante?</h2>
                <p className="mt-3 text-indigo-100">Escribinos y te mostramos el sistema con tu carta.</p>
              </div>
              <div className="flex flex-col gap-3">
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50"><MessageCircle className="h-5 w-5" /> +595 994 854 167</a>
                <a href="mailto:info@cnid.com.py" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-6 py-3 font-semibold hover:bg-white/10"><Mail className="h-5 w-5" /> info@cnid.com.py</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-8 text-sm text-slate-500 sm:px-6 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} RestoPOS · CNID</p>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-indigo-600">Ingresar</Link>
            <Link href="/photo-credits" className="hover:text-indigo-600">Créditos de fotos</Link>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">WhatsApp</a>
          </div>
        </div>
      </footer>

      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/40 hover:bg-emerald-600">
        <MessageCircle className="h-7 w-7" />
      </a>

      <style jsx global>{`
        @keyframes float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        html { scroll-behavior: smooth }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }
      `}</style>
    </div>
  )
}
