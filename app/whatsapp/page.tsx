"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageCircle, Settings2, Wifi, WifiOff } from "lucide-react"
import ProtectedRoute from "../components/protected-route"
import { WhatsAppInbox } from "../components/whatsapp-inbox"
import { useWhatsAppSummary } from "../components/whatsapp-drawer"
import { useAuth } from "../context/auth-context"

// Chat de WhatsApp dentro del marco del restaurante: contactos a la izquierda y la conversación al lado.
export default function WhatsAppPage() {
  const { hasPermission } = useAuth()
  const summary = useWhatsAppSummary(hasPermission("access_pos"))
  const [initial, setInitial] = useState<number | null>(null)
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("c"))
    if (Number.isSafeInteger(id) && id > 0) setInitial(id)
  }, [])
  return <ProtectedRoute requiredPermissions={["access_pos"]}>
    <div className="flex h-full min-h-[30rem] flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-white"><MessageCircle className="h-5 w-5" /></span>
          <div><h1 className="text-xl font-bold leading-tight">WhatsApp</h1>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">{summary.connected ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5" />}
              {summary.connected ? "Conectado" : "Desconectado"}{summary.unread > 0 ? ` · ${summary.unread} sin leer` : ""}</p></div>
        </div>
        {hasPermission("manage_company") && <Link href="/admin/whatsapp" className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm hover:bg-muted">
          <Settings2 className="h-4 w-4" /> Conexión y asistente</Link>}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border shadow-sm">
        <WhatsAppInbox connected={summary.connected} initialConversation={initial} />
      </div>
    </div>
  </ProtectedRoute>
}
