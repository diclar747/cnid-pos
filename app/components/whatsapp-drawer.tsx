"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Maximize2, MessageCircle, Wifi, WifiOff, X } from "lucide-react"
import { useAuth } from "@/app/context/auth-context"
import { apiRequest } from "@/lib/api-client"
import { useLiveTables } from "@/lib/use-live"
import { WhatsAppInbox } from "./whatsapp-inbox"

// Chat de WhatsApp integrado: se abre como panel sobre el POS, Pedidos, Cocina u Órdenes, sin salir de la pantalla.

const OPEN_EVENT = "restopos:open-chat"
const HIDDEN_ON = ["/table/", "/landing", "/login", "/card/", "/welcome", "/admin/whatsapp", "/receipt/", "/kitchen/print", "/cash/report"]

/** Abre el chat desde cualquier botón (opcionalmente en una conversación). */
export const openWhatsAppChat = (conversationId?: number) => window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { conversationId } }))

type Summary = { connected: boolean; unread: number }

/** Mensajes sin leer y estado de la conexión, en vivo. */
export function useWhatsAppSummary(enabled = true) {
  const [summary, setSummary] = useState<Summary>({ connected: false, unread: 0 })
  const load = useCallback(async () => {
    if (!enabled) return
    try {
      const result = await apiRequest<{ session: { status: string }; counts: { unread: number } }>("/api/whatsapp")
      setSummary({ connected: result.session.status === "connected", unread: Number(result.counts.unread) })
    } catch { /* sin permiso o sin conexión */ }
  }, [enabled])
  useEffect(() => { void load() }, [load])
  useLiveTables(enabled ? ["wa_conversations", "whatsapp_session"] : ["__none__"], () => void load(), 20000)
  return summary
}

export function WhatsAppDrawer() {
  const { user, hasPermission } = useAuth()
  const pathname = usePathname() ?? ""
  const allowed = Boolean(user) && user?.role !== "superadmin" && hasPermission("access_pos") && !HIDDEN_ON.some((prefix) => pathname.startsWith(prefix))
  const [open, setOpen] = useState(false)
  const [conversation, setConversation] = useState<number | null>(null)
  useEffect(() => {
    const handler = (event: Event) => { setConversation((event as CustomEvent).detail?.conversationId ?? null); setOpen(true) }
    window.addEventListener(OPEN_EVENT, handler)
    return () => window.removeEventListener(OPEN_EVENT, handler)
  }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])
  if (!allowed || !open) return null
  return <DrawerBody conversation={conversation} onClose={() => setOpen(false)} />
}

function DrawerBody({ conversation, onClose }: { conversation: number | null; onClose: () => void }) {
  const summary = useWhatsAppSummary(true)
  return <div className="fixed inset-0 z-[65] flex justify-end bg-slate-950/40 backdrop-blur-[1px] print:hidden" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Chat de WhatsApp" onClick={(event) => event.stopPropagation()}
      className="flex h-dvh w-full max-w-[1100px] flex-col bg-white shadow-2xl animate-in slide-in-from-right-8 dark:bg-slate-900">
      <header className="flex items-center justify-between gap-3 border-b bg-emerald-700 px-4 py-2.5 text-white">
        <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /><h2 className="font-bold">WhatsApp</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">{summary.connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{summary.connected ? "Conectado" : "Desconectado"}</span>
          {summary.unread > 0 && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-emerald-700">{summary.unread} sin leer</span>}</div>
        <div className="flex items-center gap-1">
          <Link href="/admin/whatsapp" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm hover:bg-white/15" title="Abrir en pantalla completa"><Maximize2 className="h-4 w-4" /><span className="hidden sm:inline">Pantalla completa</span></Link>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Cerrar chat"><X className="h-5 w-5" /></button>
        </div>
      </header>
      <div className="min-h-0 flex-1"><WhatsAppInbox connected={summary.connected} initialConversation={conversation} compact /></div>
    </section>
  </div>
}
