"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Expand, Shrink, Megaphone, UserRound, LogOut, Building2, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/app/context/auth-context"
import { NotificationsPanel } from "./notifications-panel"
import { apiRequest } from "@/lib/api-client"
import toast from "react-hot-toast"

type Announcement = { id: number; title: string; message: string; created_at: string }

export function HeaderActions() {
  const { user, logout, hasPermission } = useAuth()
  const router = useRouter()
  const [fullScreen, setFullScreen] = useState(false)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  useEffect(() => {
    const sync = () => setFullScreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", sync)
    return () => document.removeEventListener("fullscreenchange", sync)
  }, [])
  useEffect(() => {
    if (!user) return
    let active = true
    const check = async () => {
      if (!navigator.onLine) { if (active) setConnected(false); return }
      try { const response = await fetch("/api/auth/session", { cache: "no-store" }); if (active) setConnected(response.ok) }
      catch { if (active) setConnected(false) }
    }
    void check()
    window.addEventListener("online", check)
    window.addEventListener("offline", check)
    const interval = window.setInterval(() => void check(), 30000)
    return () => { active = false; window.removeEventListener("online", check); window.removeEventListener("offline", check); window.clearInterval(interval) }
  }, [user?.id])
  const toggleFullScreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch { toast.error("Este navegador no permite pantalla completa.") }
  }
  const loadAnnouncements = () => {
    void apiRequest<{ announcements: Announcement[] }>("/api/announcements")
      .then((result) => setAnnouncements(result.announcements)).catch(() => setAnnouncements([]))
  }
  const signOut = async () => {
    try { await logout(); router.push("/login") }
    catch { toast.error("No se pudo cerrar sesión.") }
  }
  return <div className="flex items-center gap-1.5 sm:gap-2">
    <span role="status" title={connected === false ? "Sin conexión con el sistema" : "Conectado al sistema"} className="hidden h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 lg:inline-flex dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"><span className={`h-2 w-2 rounded-full ${connected === false ? "bg-rose-500" : connected === null ? "bg-amber-400" : "bg-emerald-500"}`} />{connected === false ? "Sin conexión" : connected === null ? "Verificando" : "En línea"}</span>
    <DropdownMenu onOpenChange={(open) => { if (open) loadAnnouncements() }}>
      <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="icon" className="relative rounded-xl" aria-label="Campañas y avisos" title="Campañas y avisos"><Megaphone className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-96 w-[min(90vw,350px)] overflow-y-auto p-2">
        <p className="px-2 py-2 text-sm font-semibold">Campañas y avisos</p>
        {announcements.length ? announcements.map((item) => <div key={item.id} className="mb-2 rounded-xl border bg-muted/40 p-3"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{item.message}</p></div>) : <p className="px-2 py-4 text-sm text-muted-foreground">No hay avisos activos.</p>}
        {user?.role === "superadmin" && <DropdownMenuItem onClick={() => router.push("/superadmin#campaigns")}>Administrar campañas</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    <NotificationsPanel />
    <Button type="button" variant="outline" size="icon" className="rounded-xl" onClick={toggleFullScreen} aria-label={fullScreen ? "Salir de pantalla completa" : "Pantalla completa"} title={fullScreen ? "Salir de pantalla completa" : "Pantalla completa"}>{fullScreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}</Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button type="button" variant="ghost" className="h-10 gap-2 rounded-xl px-1.5 sm:px-2" aria-label="Abrir perfil de usuario">
        {user?.avatarData ? <img src={user.avatarData} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-bold text-white">{user?.name?.slice(0, 1).toUpperCase() || "U"}</span>}
        <span className="hidden max-w-28 truncate text-left text-xs font-semibold lg:block">{user?.name}</span>
      </Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-2"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-xs text-muted-foreground">{user?.email}</p><p className="mt-1 text-xs text-muted-foreground">{user?.restaurantName ?? "Administración general"}</p></div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}><UserRound className="mr-2 h-4 w-4" />Mi perfil</DropdownMenuItem>
        {hasPermission("view_dashboard") && <DropdownMenuItem onClick={() => router.push("/admin")}><LayoutDashboard className="mr-2 h-4 w-4" />Panel de administración</DropdownMenuItem>}
        {user?.role === "superadmin" && <DropdownMenuItem onClick={() => router.push("/superadmin")}><Building2 className="mr-2 h-4 w-4" />Restaurantes</DropdownMenuItem>}
        <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
}
