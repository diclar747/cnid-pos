"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bot, CheckCheck, Clock3, Hand, KanbanSquare, Search, Send, UserRound } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/api-client"
import { useLiveTables } from "@/lib/use-live"
import { sourceLabel, typeLabel } from "@/lib/order-labels"
import type { ServiceOrder } from "@/lib/service-order-types"

// Bandeja de WhatsApp tipo WhatsApp Web: contactos con foto, nombre y número; mensajes con audio, imágenes y transcripción.

export type Conversation = { id: number; phone: string; name: string; botEnabled: boolean; handoffRequested: boolean; assignedName: string; unread: number; lastMessage: string
  lastMessageAt: string | null; cartItems: number; openOrders: number; avatar: number | null }
type Message = { id: number; direction: "in" | "out"; author: string; authorName: string; kind: string; body: string; status: string; orderId: number | null; createdAt: string
  media: { id: number; mime: string; seconds: number | null } | null }

const time = (iso: string | null) => {
  if (!iso) return ""
  const date = new Date(iso), today = new Date()
  return date.toDateString() === today.toDateString() ? date.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit" })
}
const stamp = (iso: string) => new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
export const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("595") && digits.length >= 11) return `+595 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`.trim()
  return `+${digits}`
}
const COLORS = ["bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-teal-600", "bg-indigo-600"]
const initials = (name: string, phone: string) => (name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("") || phone.slice(-2) || "?").toUpperCase()

export function ContactAvatar({ conversation, size = 44 }: { conversation: Pick<Conversation, "id" | "name" | "phone" | "avatar">; size?: number }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [conversation.avatar])
  const style = { width: size, height: size }
  if (conversation.avatar && !failed) return <img src={`/api/whatsapp/avatar/${conversation.id}?v=${conversation.avatar}`} alt="" style={style} onError={() => setFailed(true)}
    className="shrink-0 rounded-full object-cover ring-1 ring-black/5" />
  return <div style={style} className={`flex shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${COLORS[conversation.id % COLORS.length]}`}>
    {conversation.name || conversation.phone ? initials(conversation.name, conversation.phone) : <UserRound className="h-5 w-5" />}</div>
}

function MessageContent({ message }: { message: Message }) {
  const text = message.body.replace(/\*(.+?)\*/g, "$1")
  if (message.media?.mime.startsWith("audio/")) {
    const transcript = text.replace(/^🎤\s*/, "")
    const pending = transcript.startsWith("[")
    return <div className="space-y-1.5">
      <audio controls preload="metadata" src={`/api/whatsapp/media/${message.media.id}`} className="h-10 w-64 max-w-full" />
      {pending ? <p className="text-xs italic text-slate-500">{transcript.replace(/^\[|\]$/g, "")}</p>
        : <p className="text-sm"><span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Transcripción</span>{transcript}</p>}
    </div>
  }
  if (message.media?.mime.startsWith("image/")) {
    const caption = text.replace(/^🖼️\s*\[imagen\]\s*/, "")
    return <div className="space-y-1.5"><a href={`/api/whatsapp/media/${message.media.id}`} target="_blank" rel="noreferrer">
      <img src={`/api/whatsapp/media/${message.media.id}`} alt={caption || "Imagen recibida"} loading="lazy" className="max-h-64 rounded-lg object-cover" /></a>
      {caption && <p className="text-sm">{caption}</p>}</div>
  }
  if (message.kind === "location") {
    const url = text.match(/https:\/\/maps\.google\.com\/\?q=[^\s]+/)?.[0]
    return <p className="text-sm">{text.replace(url ?? "", "").trim()} {url && <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-sky-700 underline">Abrir mapa</a>}</p>
  }
  return <p className="whitespace-pre-wrap text-sm">{text}</p>
}

export function WhatsAppInbox({ connected, initialConversation, compact = false }: { connected: boolean; initialConversation?: number | null; compact?: boolean }) {
  const [items, setItems] = useState<Conversation[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<number | null>(initialConversation ?? null)
  const [detail, setDetail] = useState<{ conversation: Conversation & { cart: any }; messages: Message[]; orders: ServiceOrder[] } | null>(null)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { if (initialConversation) setSelected(initialConversation) }, [initialConversation])
  const loadList = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("q", search.trim())
      const phone = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("phone") : null
      if (phone && !search) params.set("phone", phone)
      const result = await apiRequest<{ items: Conversation[] }>(`/api/whatsapp/conversations?${params}`)
      setItems(result.items)
      const wanted = typeof window !== "undefined" ? Number(new URLSearchParams(window.location.search).get("c")) : 0
      setSelected((current) => current ?? (wanted || (phone && result.items[0]?.id) || (compact ? null : null)))
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron cargar las conversaciones") }
  }, [search, compact])
  const loadDetail = useCallback(async () => {
    if (!selected) { setDetail(null); return }
    try { setDetail(await apiRequest(`/api/whatsapp/conversations/${selected}`)) } catch { setDetail(null) }
  }, [selected])
  useEffect(() => { const timer = window.setTimeout(() => void loadList(), search ? 300 : 0); return () => window.clearTimeout(timer) }, [loadList, search])
  useEffect(() => { void loadDetail() }, [loadDetail])
  useLiveTables(["wa_conversations", "wa_messages"], () => { void loadList(); void loadDetail() }, 8000)
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }) }, [detail?.messages.length])
  const act = async (action: "send" | "take" | "release", text?: string) => {
    if (!selected) return
    setSending(true)
    try { await apiRequest(`/api/whatsapp/conversations/${selected}`, { method: "POST", body: JSON.stringify({ action, text }) }); if (action === "send") setDraft(""); await loadDetail(); await loadList() }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo completar") }
    finally { setSending(false) }
  }
  const current = detail?.conversation
  const openOrders = useMemo(() => detail?.orders.filter((order) => order.status === "open") ?? [], [detail?.orders])
  return <div className={`grid h-full min-h-0 overflow-hidden bg-white dark:bg-slate-900 ${compact ? "md:grid-cols-[18rem_1fr]" : "md:grid-cols-[22rem_1fr]"}`}>
    <aside className={`flex min-h-0 flex-col border-r ${selected ? "hidden md:flex" : "flex"}`}>
      <div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, número o mensaje" className="h-9 rounded-full bg-slate-50 pl-9 dark:bg-slate-800" /></div>
        {!connected && <p className="mt-2 text-xs text-amber-700">WhatsApp no está conectado: no llegan mensajes nuevos.</p>}</div>
      <ul className="min-h-0 flex-1 overflow-y-auto">{items.map((item) => <li key={item.id}>
        <button type="button" onClick={() => setSelected(item.id)} className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${selected === item.id ? "bg-emerald-50 dark:bg-emerald-950/30" : ""}`}>
          <ContactAvatar conversation={item} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{item.name || formatPhone(item.phone) || "Contacto"}</p>
              <span className={`shrink-0 text-[11px] ${item.unread ? "font-semibold text-emerald-600" : "text-muted-foreground"}`}>{time(item.lastMessageAt)}</span></div>
            {item.name && item.phone && <p className="truncate text-[11px] text-muted-foreground">{formatPhone(item.phone)}</p>}
            <div className="flex items-center justify-between gap-2"><p className="truncate text-xs text-muted-foreground">{item.lastMessage}</p>
              {item.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">{item.unread}</span>}</div>
            <div className="mt-0.5 flex flex-wrap gap-1">{item.handoffRequested && <span className="rounded bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">Pide persona</span>}
              {!item.botEnabled && !item.handoffRequested && <span className="rounded bg-slate-100 px-1.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">{item.assignedName ? `Atiende ${item.assignedName}` : "Asistente pausado"}</span>}
              {item.openOrders > 0 && <span className="rounded bg-indigo-100 px-1.5 text-[10px] text-indigo-700">{item.openOrders} pedido(s)</span>}
              {item.cartItems > 0 && <span className="rounded bg-amber-100 px-1.5 text-[10px] text-amber-800">armando pedido</span>}</div>
          </div>
        </button></li>)}
        {!items.length && <li className="p-6 text-center text-sm text-muted-foreground">Sin conversaciones todavía.</li>}</ul>
    </aside>
    <section className={`min-h-0 flex-col ${selected ? "flex" : "hidden md:flex"}`}>
      {!current ? <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#f0f2f5] p-6 text-center text-sm text-muted-foreground dark:bg-slate-950">
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200">WhatsApp de RestoPOS</p><p>Elegí una conversación para ver los mensajes, escuchar audios y responder.</p></div> : <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-[#f0f2f5] px-3 py-2 dark:bg-slate-800">
          <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelected(null)} aria-label="Volver a la lista"><ArrowLeft className="h-5 w-5" /></Button>
            <ContactAvatar conversation={current} size={40} />
            <div className="min-w-0"><p className="truncate font-bold">{current.name || formatPhone(current.phone) || "Contacto"}</p>
              <p className="truncate text-xs text-muted-foreground">{current.phone ? formatPhone(current.phone) : "número oculto"} · {current.botEnabled ? "responde el asistente" : current.assignedName ? `atiende ${current.assignedName}` : "asistente pausado"}</p></div></div>
          <div className="flex gap-2">{current.botEnabled ? <Button size="sm" variant="outline" disabled={sending} onClick={() => void act("take")}><Hand className="mr-1 h-4 w-4" />Tomar conversación</Button>
            : <Button size="sm" variant="outline" disabled={sending} onClick={() => void act("release")}><Bot className="mr-1 h-4 w-4" />Devolver al asistente</Button>}</div>
        </div>
        {openOrders.length > 0 && <div className="flex flex-wrap gap-2 border-b bg-indigo-50/60 px-3 py-2 text-xs dark:bg-indigo-950/20">{openOrders.map((order) => <Link key={order.id} href={`/crm?q=${order.id}`}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-semibold text-indigo-700 shadow-sm dark:bg-slate-800"><KanbanSquare className="h-3.5 w-3.5" />#{order.id} · {typeLabel[order.orderType]} · {order.confirmation === "pending" ? "por confirmar" : sourceLabel[order.source]}</Link>)}</div>}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#efeae2] p-4 dark:bg-slate-950">
          {detail.messages.map((message) => message.author === "system" && message.status === "simulated"
            ? <p key={message.id} className="mx-auto w-fit rounded-lg bg-white/80 px-3 py-1 text-center text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{message.body} · {stamp(message.createdAt)}</p>
            : <div key={message.id} className={`flex ${message.direction === "out" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${message.direction === "out" ? "rounded-tr-sm bg-[#d9fdd3] text-slate-900 dark:bg-emerald-900 dark:text-white" : "rounded-tl-sm bg-white text-slate-900 dark:bg-slate-800 dark:text-white"}`}>
                <MessageContent message={message} />
                <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-400">{message.direction === "out" && (message.author === "bot" ? <Bot className="h-3 w-3" /> : message.author === "staff" ? <UserRound className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />)}
                  {message.direction === "out" ? message.authorName || message.author : ""} {stamp(message.createdAt)} {message.status === "failed" ? "· no enviado" : message.direction === "out" ? <CheckCheck className="h-3 w-3" /> : null}</p></div></div>)}
          <div ref={end} />
        </div>
        <form className="flex gap-2 border-t bg-[#f0f2f5] p-3 dark:bg-slate-800" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) void act("send", draft.trim()) }}>
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={connected ? "Escribí una respuesta (pausa el asistente en esta conversación)" : "WhatsApp desconectado"} maxLength={4000} className="rounded-full bg-white dark:bg-slate-900" />
          <Button type="submit" disabled={!draft.trim() || sending} className="rounded-full bg-emerald-600 hover:bg-emerald-700" aria-label="Enviar"><Send className="h-4 w-4" /></Button>
        </form>
      </>}
    </section>
  </div>
}
