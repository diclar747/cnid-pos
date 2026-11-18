"use client"

import Link from "next/link"
import { ChefHat, ClipboardList, QrCode, Armchair, Banknote, KanbanSquare, MessageCircle, ShoppingCart } from "lucide-react"
import { usePathname } from "next/navigation"
import { useWhatsAppSummary } from "./whatsapp-drawer"
import { useAuth } from "@/app/context/auth-context"

type Destination = { href: string; label: string; detail: string; icon: typeof ChefHat; color: string; iconColor: string; permission?: string; chat?: boolean }

const destinations: Destination[] = [
  {
    href: "/pos",
    label: "Punto de venta",
    detail: "Vender y cobrar",
    icon: ShoppingCart,
    color: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
    iconColor: "bg-blue-600 text-white",
  },
  {
    href: "/whatsapp",
    label: "WhatsApp",
    detail: "Chats y pedidos",
    icon: MessageCircle,
    color: "border-green-200 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200",
    iconColor: "bg-green-600 text-white",
    chat: true,
  },
  {
    href: "/crm",
    label: "Pedidos",
    detail: "Tablero en vivo",
    icon: KanbanSquare,
    color: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200",
    iconColor: "bg-indigo-600 text-white",
  },
  {
    href: "/orders",
    label: "Órdenes",
    detail: "Cuentas y cobros",
    icon: ClipboardList,
    color: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
    iconColor: "bg-violet-600 text-white",
  },
  {
    href: "/kitchen",
    label: "Cocina",
    detail: "Comandas y entrega",
    icon: ChefHat,
    color: "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
    iconColor: "bg-orange-500 text-white",
  },
  {
    href: "/orders/cards",
    label: "Tarjetas QR",
    detail: "Crear e imprimir",
    icon: QrCode,
    color: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
    iconColor: "bg-emerald-600 text-white",
  },
  {
    href: "/mesas",
    label: "Mesas",
    detail: "Salones y QR",
    icon: Armchair,
    color: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
    iconColor: "bg-sky-600 text-white",
    permission: "manage_company",
  },
  {
    href: "/cash",
    label: "Caja",
    detail: "Apertura y arqueo",
    icon: Banknote,
    color: "border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200",
    iconColor: "bg-teal-600 text-white",
    permission: "manage_sales",
  },
]

export default function RestaurantNavigation({ variant = "toolbar" }: { variant?: "toolbar" | "sidebar" | "rail" }) {
  const { hasPermission } = useAuth()
  const whatsapp = useWhatsAppSummary(hasPermission("access_pos"))
  const isSidebar = variant === "sidebar"
  const isRail = variant === "rail"
  const pathname = usePathname() ?? ""

  return (
    <nav aria-label="Opciones del restaurante" className={isRail ? "grid justify-items-center gap-2" : isSidebar ? "grid gap-2" : "grid w-full grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7 2xl:max-w-[1250px]"}>
      {destinations.filter((item) => !item.permission || hasPermission(item.permission)).map(({ href, label, detail, icon: Icon, color, iconColor, chat }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          title={isRail ? label : undefined}
          className={`group flex min-w-0 items-center rounded-xl border shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${color} ${pathname === href ? "ring-2 ring-slate-900/25 ring-offset-1 font-semibold shadow-md dark:ring-white/40 dark:ring-offset-slate-900" : ""} ${isRail ? "h-11 w-11 justify-center p-1" : isSidebar ? "gap-2.5 px-2.5 py-2" : "flex-col gap-1 px-1 py-2 text-center sm:flex-row sm:gap-2 sm:px-2 sm:py-3 sm:text-left"}`}
        >
          <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {chat && whatsapp.unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white" aria-label={`${whatsapp.unread} mensajes sin leer`}>{whatsapp.unread > 99 ? "99+" : whatsapp.unread}</span>}
          </span>
          <span className={isRail ? "sr-only" : "min-w-0"}>
            <span className={`block truncate font-semibold ${isSidebar ? "text-sm" : "text-[11px] sm:text-sm"}`}>{label}</span>
            <span className={`block truncate text-[11px] opacity-75 ${isSidebar ? "" : "hidden 2xl:block"}`}>{detail}</span>
          </span>
        </Link>
      ))}
    </nav>
  )
}
