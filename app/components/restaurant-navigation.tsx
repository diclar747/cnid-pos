"use client"

import Link from "next/link"
import { ChefHat, ClipboardList, QrCode, Armchair } from "lucide-react"
import { useAuth } from "@/app/context/auth-context"

const destinations = [
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
    href: "/admin/dining",
    label: "Mesas",
    detail: "Salones y QR",
    icon: Armchair,
    color: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
    iconColor: "bg-sky-600 text-white",
  },
] as const

export default function RestaurantNavigation({ variant = "toolbar" }: { variant?: "toolbar" | "sidebar" | "rail" }) {
  const { hasPermission } = useAuth()
  const isSidebar = variant === "sidebar"
  const isRail = variant === "rail"

  return (
    <nav aria-label="Opciones del restaurante" className={isRail ? "grid justify-items-center gap-2" : isSidebar ? "grid gap-2" : "grid w-full grid-cols-2 gap-2 sm:grid-cols-4 2xl:max-w-[760px]"}>
      {destinations.filter((item) => item.href !== "/admin/dining" || hasPermission("manage_company")).map(({ href, label, detail, icon: Icon, color, iconColor }) => (
        <Link
          key={href}
          href={href}
          title={isRail ? label : undefined}
          className={`group flex min-w-0 items-center rounded-xl border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${color} ${isRail ? "h-11 w-11 justify-center p-1" : isSidebar ? "gap-2.5 px-2.5 py-2" : "flex-col gap-1 px-1 py-2 text-center sm:flex-row sm:gap-2 sm:px-2 sm:py-3 sm:text-left"}`}
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
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
