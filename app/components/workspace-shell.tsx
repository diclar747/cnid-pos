"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { Menu, PanelLeftClose, PanelLeftOpen, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "../context/auth-context"
import { useCompany } from "../context/company-context"
import RestaurantNavigation from "./restaurant-navigation"
import { ThemeToggle } from "./theme-toggle"
import { HeaderActions } from "./header-actions"
import { headerTheme } from "@/lib/brand-theme"

// Marco único del restaurante: el encabezado y la columna «Opciones» quedan fijos y cada sección
// (POS, WhatsApp, Pedidos, Órdenes, Cocina, Tarjetas QR, Mesas, Caja) se carga adentro, sin cambiar de pantalla.

export const WORKSPACE_ROUTES = ["/pos", "/whatsapp", "/crm", "/orders", "/orders/cards", "/kitchen", "/mesas", "/cash"]
const OPEN_CHAT = "restopos:open-chat"
const COLLAPSE_KEY = "restopos:options-collapsed"

type Slots = {
  header: HTMLElement | null; headerEnd: HTMLElement | null; sidebar: HTMLElement | null; mobile: HTMLElement | null
  collapsed: boolean; closeMobile: () => void
}
const WorkspaceContext = createContext<Slots | null>(null)
export const useWorkspace = () => useContext(WorkspaceContext)

/** Pone contenido de la sección en un lugar del marco (buscador del encabezado, categorías en «Opciones»…). */
export function WorkspaceSlot({ name, children }: { name: "header" | "headerEnd" | "sidebar" | "mobile"; children: ReactNode }) {
  const slots = useWorkspace()
  const target = slots?.[name]
  return target ? createPortal(children, target) : null
}

export function WorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ""
  const { user, hasPermission } = useAuth()
  const inside = Boolean(user) && user?.role !== "superadmin" && hasPermission("access_pos") && WORKSPACE_ROUTES.includes(pathname)
  if (!inside) return <>{children}</>
  return <Shell>{children}</Shell>
}

function Shell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const { user } = useAuth()
  const { companyConfig } = useCompany()
  const [header, setHeader] = useState<HTMLElement | null>(null)
  const [headerEnd, setHeaderEnd] = useState<HTMLElement | null>(null)
  const [sidebar, setSidebar] = useState<HTMLElement | null>(null)
  const [mobile, setMobile] = useState<HTMLElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => { try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1") } catch { /* preferencia opcional */ } }, [])
  useEffect(() => { setMobileOpen(false) }, [pathname])
  // Los botones «Abrir chat» de cualquier sección llevan a WhatsApp dentro del marco.
  useEffect(() => {
    const open = (event: Event) => { const id = (event as CustomEvent).detail?.conversationId; router.push(id ? `/whatsapp?c=${id}` : "/whatsapp") }
    window.addEventListener(OPEN_CHAT, open)
    return () => window.removeEventListener(OPEN_CHAT, open)
  }, [router])
  const toggle = () => setCollapsed((value) => { try { localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1") } catch { /* opcional */ } return !value })

  const brand = companyConfig?.name || user?.restaurantName || "RestoPOS"
  const logo = companyConfig?.logo && !companyConfig.logo.includes("placeholder") ? companyConfig.logo : ""
  const role = user?.role === "admin" ? "Administrador" : user?.role === "manager" ? "Gerente" : user?.role === "waiter" ? "Mesero" : "Caja"
  const accent = /^#[0-9a-f]{6}$/i.test(companyConfig?.colors?.primary ?? "") ? companyConfig.colors.primary : ""
  const theme = headerTheme(companyConfig?.appearance?.headerStyle, accent || "#4f46e5")

  return (
    <WorkspaceContext.Provider value={{ header, headerEnd, sidebar, mobile, collapsed, closeMobile }}>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-indigo-50 via-slate-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950"
        style={accent ? { ["--brand" as string]: accent } : undefined}>
        <header style={theme ? { background: theme.background } : undefined} className={`z-40 shrink-0 border-b shadow-sm print:hidden ${theme ? "border-transparent [&_.brand-sub]:text-white/75 [&_.brand-title]:text-white" : "border-indigo-100/80 bg-white/85 shadow-indigo-100/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85"}`}>
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 md:flex-nowrap md:gap-3 md:px-5">
            <Button variant="ghost" size="sm" className={`md:hidden ${theme ? "text-white hover:bg-white/15 hover:text-white" : ""}`} onClick={() => setMobileOpen(true)} aria-label="Abrir opciones"><Menu className="h-5 w-5" /></Button>
            <div className="flex min-w-0 items-center gap-2.5">
              {logo
                ? <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded-2xl border bg-white object-cover shadow-sm" />
                : <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-indigo-300/40 sm:flex"
                  style={{ background: accent ? `linear-gradient(135deg, ${accent}, #4f46e5)` : "linear-gradient(135deg, #4f46e5, #7c3aed, #06b6d4)" }}><Sparkles className="h-5 w-5" /></div>}
              <div className="min-w-0">
                <p className="brand-title truncate text-lg font-black leading-tight tracking-tight text-slate-900 dark:text-white">{logo || companyConfig?.name ? brand
                  : <>Resto<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">POS</span></>}</p>
                <p className="brand-sub hidden truncate text-xs text-muted-foreground sm:block">{companyConfig?.slogan ? `${companyConfig.slogan} · ` : ""}{user?.name} · {role}</p>
              </div>
            </div>
            <div ref={setHeader} className="order-last flex min-w-0 basis-full items-center md:order-none md:mx-4 md:max-w-xl md:flex-1 md:basis-auto" />
            <div className="ml-auto flex items-center gap-2">
              <div ref={setHeaderEnd} className="flex items-center gap-2" />
              <div className="hidden md:block"><ThemeToggle /></div>
              <HeaderActions />
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className={`hidden shrink-0 flex-col border-r border-indigo-100 bg-white/75 shadow-sm backdrop-blur-xl transition-[width] duration-200 print:hidden dark:border-slate-800 dark:bg-slate-900/80 md:flex ${collapsed ? "w-[68px]" : "w-64"}`}>
            <div className={`border-b ${collapsed ? "flex flex-col items-center gap-2 px-2 py-3" : "p-3"}`}>
              {collapsed
                ? <Button variant="ghost" size="icon" onClick={toggle} aria-label="Expandir opciones" title="Expandir opciones"><PanelLeftOpen className="h-5 w-5" /></Button>
                : <div className="mb-2 flex items-center justify-between pl-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opciones</h2>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggle} aria-label="Minimizar opciones" title="Minimizar opciones"><PanelLeftClose className="h-4 w-4" /></Button>
                </div>}
              <RestaurantNavigation variant={collapsed ? "rail" : "sidebar"} />
            </div>
            <div ref={setSidebar} className="flex min-h-0 flex-1 flex-col" />
          </aside>

          <main className="relative min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>

        {mobileOpen && <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r bg-background">
            <div className="flex items-center justify-between border-b p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opciones</h2>
              <Button variant="ghost" size="sm" onClick={() => setMobileOpen(false)} aria-label="Cerrar opciones"><X className="h-4 w-4" /></Button>
            </div>
            <div className="border-b p-3"><RestaurantNavigation variant="sidebar" /></div>
            <div ref={setMobile} className="flex min-h-0 flex-1 flex-col" />
          </div>
        </div>}
      </div>
    </WorkspaceContext.Provider>
  )
}
