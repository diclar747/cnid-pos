"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bot, CheckCheck, ChevronLeft, ChevronRight, Clock3, Download, FileText, Hand, ImagePlus, KanbanSquare, Loader2, Mic, PanelLeftClose, PanelLeftOpen, PanelRightOpen, Paperclip,
  Pause, Play, Search, Send, Smile, Square, Trash2, UserRound, X } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/api-client"
import { useLiveTables } from "@/lib/use-live"
import { typeLabel } from "@/lib/order-labels"
import { STAGE_TONE, type CrmStage } from "@/lib/order-stage"
import type { ServiceOrder } from "@/lib/service-order-types"
import { ContactPanel, type ContactProfile } from "./whatsapp-contact-panel"

// Bandeja de WhatsApp tipo WhatsApp Web: contactos con foto (lista minimizable), mensajes con audio, imágenes (visor),
// videos y documentos; responder con texto, emojis, archivos o notas de voz grabadas en el navegador.

export type Conversation = { id: number; phone: string; name: string; botEnabled: boolean; handoffRequested: boolean; assignedName: string; unread: number; lastMessage: string
  lastMessageAt: string | null; cartItems: number; openOrders: number; avatar: number | null
  /** Pedido en curso (o el último de las 12 h) del contacto, con su etapa del tablero. */
  order?: { orderId: number; stage: CrmStage; label: string; orderType: string; tableLabel: string; active: number } | null }
type Media = { id: number; mime: string; seconds: number | null; fileName?: string; size?: number | null }
type Message = { id: number; direction: "in" | "out"; author: string; authorName: string; kind: string; body: string; status: string; orderId: number | null; createdAt: string; media: Media | null }

const time = (iso: string | null) => {
  if (!iso) return ""
  const date = new Date(iso), today = new Date()
  return date.toDateString() === today.toDateString() ? date.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit" })
}
const stamp = (iso: string) => new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
const fileSize = (bytes?: number | null) => !bytes ? "" : bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
export const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("595") && digits.length >= 11) return `+595 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`.trim()
  return `+${digits}`
}
const COLORS = ["bg-emerald-600", "bg-sky-600", "bg-violet-600", "bg-amber-600", "bg-rose-600", "bg-teal-600", "bg-indigo-600"]
const initials = (name: string, phone: string) => (name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("") || phone.slice(-2) || "?").toUpperCase()
const EMOJIS = ["😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘", "😉", "😎", "🤩", "🙂", "🤗", "🤔", "😅", "😢", "😭", "😡", "😴", "🙄", "😮", "🥳", "😋", "🤤",
  "👍", "👎", "👌", "🙏", "👏", "🙌", "💪", "✌️", "🤝", "👋", "❤️", "🧡", "💛", "💚", "💙", "💜", "🔥", "✨", "⭐", "✅", "❌", "⚠️", "⏰", "📍",
  "🍕", "🍔", "🍟", "🌭", "🥪", "🌮", "🍝", "🍖", "🍗", "🥩", "🥗", "🍲", "🍛", "🍜", "🥟", "🍰", "🎂", "🍦", "🍩", "☕", "🥤", "🍺", "🍷", "🧉",
  "🛵", "🚗", "🏠", "💵", "💳", "🧾", "📞", "📸", "🎉", "🎁", "😇", "🤑"]

export function ContactAvatar({ conversation, size = 44 }: { conversation: Pick<Conversation, "id" | "name" | "phone" | "avatar">; size?: number }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [conversation.avatar])
  const style = { width: size, height: size }
  if (conversation.avatar && !failed) return <img src={`/api/whatsapp/avatar/${conversation.id}?v=${conversation.avatar}`} alt="" style={style} onError={() => setFailed(true)}
    className="shrink-0 rounded-full object-cover ring-1 ring-black/5" />
  return <div style={style} className={`flex shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${COLORS[conversation.id % COLORS.length]}`}>
    {conversation.name || conversation.phone ? initials(conversation.name, conversation.phone) : <UserRound className="h-5 w-5" />}</div>
}

/** Reproductor de audio estilo WhatsApp: botón, barra de avance tocable y duración. */
function VoicePlayer({ src, seconds, mine }: { src: string; seconds: number | null; mine: boolean }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(seconds ?? 0)
  const toggle = () => { const el = audio.current; if (!el) return; if (el.paused) void el.play().catch(() => toast.error("No se pudo reproducir el audio")); else el.pause() }
  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = audio.current; if (!el || !duration) return
    const rect = event.currentTarget.getBoundingClientRect()
    el.currentTime = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * duration
  }
  const progress = duration ? Math.min(100, (position / duration) * 100) : 0
  return <div className="flex w-64 max-w-full items-center gap-3 py-1">
    <audio ref={audio} src={src} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPosition(0) }}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} onLoadedMetadata={(event) => { if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration) }} />
    <button type="button" onClick={toggle} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow ${mine ? "bg-emerald-600" : "bg-slate-600"}`} aria-label={playing ? "Pausar" : "Reproducir"}>
      {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}</button>
    <div className="min-w-0 flex-1">
      <div className="relative h-6 cursor-pointer" onClick={seek} role="slider" aria-label="Avance del audio" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center gap-[2px]">{Array.from({ length: 28 }, (_, i) => <span key={i}
          className={`w-[3px] rounded-full ${(i / 28) * 100 < progress ? (mine ? "bg-emerald-600" : "bg-sky-600") : "bg-slate-300 dark:bg-slate-600"}`} style={{ height: `${6 + ((i * 37) % 13)}px` }} />)}</div>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{clock(playing || position ? position : duration)}</p>
    </div>
    <Mic className={`h-4 w-4 shrink-0 ${mine ? "text-emerald-600" : "text-sky-600"}`} />
  </div>
}

function MessageContent({ message, onOpenImage }: { message: Message; onOpenImage: (id: number) => void }) {
  const text = message.body.replace(/\*(.+?)\*/g, "$1")
  const src = message.media ? `/api/whatsapp/media/${message.media.id}` : ""
  const mine = message.direction === "out"
  if (message.media?.mime.startsWith("audio/")) {
    const transcript = text.replace(/^🎤\s*/, "")
    const pending = transcript.startsWith("[")
    return <div className="space-y-1">
      <VoicePlayer src={src} seconds={message.media.seconds} mine={mine} />
      {!pending && transcript && <p className="text-sm"><span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Transcripción</span>{transcript}</p>}
    </div>
  }
  if (message.media && (message.media.mime.startsWith("image/") || message.kind === "sticker")) {
    const caption = text.replace(/^🖼️\s*\[imagen\]\s*/, "").replace(/^🏷️\s*\[sticker\]\s*/, "")
    return <div className="space-y-1.5">
      <button type="button" onClick={() => onOpenImage(message.media!.id)} className="block overflow-hidden rounded-lg" aria-label="Ampliar imagen">
        <img src={src} alt={caption || "Imagen"} loading="lazy" className={`${message.kind === "sticker" ? "h-32 w-32 object-contain" : "max-h-72 max-w-[18rem] object-cover"} transition hover:brightness-95`} /></button>
      {caption && <p className="text-sm">{caption}</p>}</div>
  }
  if (message.media?.mime.startsWith("video/")) {
    const caption = text.replace(/^🎬\s*\[video\]\s*/, "")
    return <div className="space-y-1.5"><video src={src} controls preload="metadata" playsInline className="max-h-80 w-72 max-w-full rounded-lg bg-black" />{caption && <p className="text-sm">{caption}</p>}</div>
  }
  if (message.media && message.kind === "document") {
    const name = message.media.fileName || text.replace(/^📄\s*/, "")
    const pdf = message.media.mime === "application/pdf"
    return <div className="flex w-72 max-w-full items-center gap-3 rounded-xl bg-black/5 p-2.5 dark:bg-white/10">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white"><FileText className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="text-[11px] text-slate-500">{(message.media.mime.split("/")[1] ?? "archivo").toUpperCase()} · {fileSize(message.media.size)}</p></div>
      <a href={pdf ? src : `${src}?download=1`} target="_blank" rel="noreferrer" className="rounded-full p-2 hover:bg-black/10" aria-label="Descargar"><Download className="h-4 w-4" /></a>
    </div>
  }
  if (message.kind === "location") {
    const url = text.match(/https:\/\/maps\.google\.com\/\?q=[^\s]+/)?.[0]
    return <p className="text-sm">{text.replace(url ?? "", "").trim()} {url && <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-sky-700 underline">Abrir mapa</a>}</p>
  }
  return <p className="whitespace-pre-wrap break-words text-sm">{text}</p>
}

/** Visor de imágenes de la conversación: ampliar, pasar entre imágenes y descargar, sin salir del chat. */
function Lightbox({ ids, current, onChange, onClose }: { ids: number[]; current: number; onChange: (id: number) => void; onClose: () => void }) {
  const index = ids.indexOf(current)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key === "ArrowRight" && index < ids.length - 1) onChange(ids[index + 1])
      if (event.key === "ArrowLeft" && index > 0) onChange(ids[index - 1])
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [ids, index, onChange, onClose])
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose} role="dialog" aria-label="Imagen ampliada">
    <div className="absolute right-3 top-3 flex gap-2" onClick={(event) => event.stopPropagation()}>
      <a href={`/api/whatsapp/media/${current}?download=1`} className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="Descargar"><Download className="h-5 w-5" /></a>
      <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="Cerrar"><X className="h-5 w-5" /></button>
    </div>
    {index > 0 && <button type="button" onClick={(event) => { event.stopPropagation(); onChange(ids[index - 1]) }} className="absolute left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Anterior"><ChevronLeft className="h-6 w-6" /></button>}
    <img src={`/api/whatsapp/media/${current}`} alt="" onClick={(event) => event.stopPropagation()} className="max-h-[90dvh] max-w-[92vw] rounded-lg object-contain shadow-2xl" />
    {index < ids.length - 1 && <button type="button" onClick={(event) => { event.stopPropagation(); onChange(ids[index + 1]) }} className="absolute right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Siguiente"><ChevronRight className="h-6 w-6" /></button>}
    {ids.length > 1 && <p className="absolute bottom-4 text-sm text-white/70">{index + 1} / {ids.length}</p>}
  </div>
}

export function WhatsAppInbox({ connected, initialConversation, compact = false }: { connected: boolean; initialConversation?: number | null; compact?: boolean }) {
  const [items, setItems] = useState<Conversation[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<number | null>(initialConversation ?? null)
  const [detail, setDetail] = useState<{ conversation: Conversation & { cart: any }; messages: Message[]; orders: ServiceOrder[]; profile?: ContactProfile } | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [viewer, setViewer] = useState<number | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [attachment, setAttachment] = useState<{ file: File; preview: string; caption: string } | null>(null)
  const [recording, setRecording] = useState<{ startedAt: number; seconds: number } | null>(null)
  const recorder = useRef<{ media: MediaRecorder; chunks: Blob[]; stream: MediaStream; cancel: boolean } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const textInput = useRef<HTMLInputElement>(null)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { if (initialConversation) setSelected(initialConversation) }, [initialConversation])
  useEffect(() => { try { setCollapsed(localStorage.getItem("restopos:wa-list-collapsed") === "1") } catch { /* opcional */ } }, [])
  // Ficha del cliente: abierta por defecto en pantallas anchas; se recuerda la última elección.
  useEffect(() => {
    let stored: string | null = null
    try { stored = localStorage.getItem("restopos:wa-profile") } catch { /* opcional */ }
    setProfileOpen(stored ? stored === "1" : !compact && window.innerWidth >= 1536)
  }, [compact])
  const toggleProfile = (open: boolean) => { setProfileOpen(open); try { localStorage.setItem("restopos:wa-profile", open ? "1" : "0") } catch { /* opcional */ } }
  const toggleList = () => setCollapsed((value) => { try { localStorage.setItem("restopos:wa-list-collapsed", value ? "0" : "1") } catch { /* opcional */ } return !value })
  const loadList = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("q", search.trim())
      const phone = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("phone") : null
      if (phone && !search) params.set("phone", phone)
      const result = await apiRequest<{ items: Conversation[] }>(`/api/whatsapp/conversations?${params}`)
      setItems(result.items)
      const wanted = typeof window !== "undefined" ? Number(new URLSearchParams(window.location.search).get("c")) : 0
      setSelected((current) => current ?? (wanted || (phone && result.items[0]?.id) || null))
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron cargar las conversaciones") }
  }, [search])
  const loadDetail = useCallback(async () => {
    if (!selected) { setDetail(null); return }
    try { setDetail(await apiRequest(`/api/whatsapp/conversations/${selected}`)) } catch { setDetail(null) }
  }, [selected])
  useEffect(() => { const timer = window.setTimeout(() => void loadList(), search ? 300 : 0); return () => window.clearTimeout(timer) }, [loadList, search])
  useEffect(() => { void loadDetail() }, [loadDetail])
  useLiveTables(["wa_conversations", "wa_messages", "service_orders", "kitchen_tickets"], () => { void loadList(); void loadDetail() }, 8000)
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }) }, [detail?.messages.length])
  useEffect(() => { setEmojiOpen(false); setAttachment(null) }, [selected])
  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setRecording((current) => current ? { ...current, seconds: Math.floor((Date.now() - current.startedAt) / 1000) } : current), 250)
    return () => window.clearInterval(timer)
  }, [recording?.startedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action: "send" | "take" | "release", text?: string) => {
    if (!selected) return
    setSending(true)
    try { await apiRequest(`/api/whatsapp/conversations/${selected}`, { method: "POST", body: JSON.stringify({ action, text }) }); if (action === "send") setDraft(""); await loadDetail(); await loadList() }
    catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar"
      // Sin conexión el mensaje queda guardado como «no enviado»: se limpia la caja igual.
      if (action === "send" && message.includes("guardado")) { setDraft(""); void loadDetail() }
      toast.error(message)
    }
    finally { setSending(false) }
  }
  const upload = async (file: Blob, fields: Record<string, string>, name: string) => {
    if (!selected) return
    setSending(true)
    try {
      const form = new FormData()
      form.append("file", file, name)
      for (const [key, value] of Object.entries(fields)) form.append(key, value)
      const response = await fetch(`/api/whatsapp/conversations/${selected}/media`, { method: "POST", body: form })
      const body = await response.json().catch(() => ({}))
      if (response.status === 409) { setAttachment(null); await loadDetail(); toast.error(body.error || "WhatsApp no está conectado"); return }
      if (!response.ok) throw new Error(body.error || "No se pudo enviar el archivo")
      setAttachment(null); await loadDetail(); await loadList()
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo enviar el archivo") }
    finally { setSending(false) }
  }
  const pickFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 16 * 1024 * 1024) { toast.error("El archivo supera 16 MB"); return }
    setAttachment({ file, preview: /^(image|video)\//.test(file.type) ? URL.createObjectURL(file) : "", caption: "" })
    if (fileInput.current) fileInput.current.value = ""
  }
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { toast.error("Este navegador no puede grabar audio"); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const type = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/mp4"].find((value) => MediaRecorder.isTypeSupported(value))
      const media = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      const state = { media, chunks: [] as Blob[], stream, cancel: false }
      media.ondataavailable = (event) => { if (event.data.size) state.chunks.push(event.data) }
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const seconds = Math.max(1, Math.round((Date.now() - started) / 1000))
        setRecording(null)
        if (state.cancel || !state.chunks.length) return
        const blob = new Blob(state.chunks, { type: (media.mimeType || "audio/webm").split(";")[0] })
        void upload(blob, { voice: "1", seconds: String(seconds) }, `nota-de-voz.${blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm"}`)
      }
      const started = Date.now()
      recorder.current = state
      media.start(250)
      setRecording({ startedAt: started, seconds: 0 })
    } catch { toast.error("Permití el micrófono para grabar una nota de voz") }
  }
  const stopRecording = (cancel: boolean) => { const state = recorder.current; if (!state) return; state.cancel = cancel; state.media.stop(); recorder.current = null }
  const insertEmoji = (emoji: string) => {
    const input = textInput.current
    const start = input?.selectionStart ?? draft.length, finish = input?.selectionEnd ?? draft.length
    setDraft((current) => current.slice(0, start) + emoji + current.slice(finish))
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + emoji.length, start + emoji.length) })
  }

  const current = detail?.conversation
  const activeOrders = useMemo(() => (detail?.profile?.orders ?? []).filter((order) => order.status === "open" ? order.stage !== "cancelled" : order.stage !== "done" && order.stage !== "cancelled"), [detail?.profile?.orders])
  const imageIds = useMemo(() => (detail?.messages ?? []).filter((m) => m.media && (m.media.mime.startsWith("image/") || m.kind === "sticker")).map((m) => m.media!.id), [detail?.messages])
  const listWidth = collapsed ? "md:grid-cols-[4.75rem_1fr]" : compact ? "md:grid-cols-[18rem_1fr]" : "md:grid-cols-[22rem_1fr]"

  return <div className={`grid h-full min-h-0 overflow-hidden bg-white transition-[grid-template-columns] dark:bg-slate-900 ${listWidth}`}>
    <aside className={`flex min-h-0 flex-col border-r ${selected ? "hidden md:flex" : "flex"}`}>
      {collapsed ? <>
        <div className="flex justify-center border-b p-2"><Button variant="ghost" size="icon" onClick={toggleList} title="Mostrar la lista" aria-label="Mostrar la lista de chats"><PanelLeftOpen className="h-5 w-5" /></Button></div>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto py-2">{items.map((item) => <li key={item.id} className="flex justify-center">
          <button type="button" onClick={() => setSelected(item.id)} title={item.name || formatPhone(item.phone)}
            className={`relative rounded-full p-1 transition ${selected === item.id ? "bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-950" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
            <ContactAvatar conversation={item} size={44} />
            {item.unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">{item.unread}</span>}
            {item.handoffRequested ? <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
              : item.order && <span title={item.order.label} className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${STAGE_TONE[item.order.stage].split(" ")[0]}`} />}
          </button></li>)}</ul>
      </> : <>
        <div className="border-b p-3"><div className="flex items-center gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, número o mensaje" className="h-9 rounded-full bg-slate-50 pl-9 dark:bg-slate-800" /></div>
          <Button variant="ghost" size="icon" className="hidden shrink-0 md:inline-flex" onClick={toggleList} title="Minimizar la lista" aria-label="Minimizar la lista de chats"><PanelLeftClose className="h-5 w-5" /></Button></div>
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
                {item.order ? <span title={`Pedido #${item.order.orderId}`} className={`rounded px-1.5 text-[10px] font-semibold ${STAGE_TONE[item.order.stage]}`}>#{item.order.orderId} · {item.order.label}{item.order.active > 1 ? ` · +${item.order.active - 1}` : ""}</span>
                  : item.openOrders > 0 && <span className="rounded bg-indigo-100 px-1.5 text-[10px] text-indigo-700">{item.openOrders} pedido(s)</span>}
                {item.order?.tableLabel && <span className="rounded bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{item.order.tableLabel}</span>}
                {item.cartItems > 0 && <span className="rounded bg-amber-100 px-1.5 text-[10px] text-amber-800">armando pedido</span>}</div>
            </div>
          </button></li>)}
          {!items.length && <li className="p-6 text-center text-sm text-muted-foreground">Sin conversaciones todavía.</li>}</ul>
      </>}
    </aside>
    <section className={`relative min-h-0 ${selected ? "flex" : "hidden md:flex"}`}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {!current ? <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#f0f2f5] p-6 text-center text-sm text-muted-foreground dark:bg-slate-950">
        <p className="text-base font-semibold text-slate-700 dark:text-slate-200">WhatsApp de RestoPOS</p><p>Elegí una conversación para ver los mensajes, escuchar audios y responder.</p></div> : <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-[#f0f2f5] px-3 py-2 dark:bg-slate-800">
          <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelected(null)} aria-label="Volver a la lista"><ArrowLeft className="h-5 w-5" /></Button>
            <ContactAvatar conversation={current} size={40} />
            <div className="min-w-0"><p className="truncate font-bold">{current.name || formatPhone(current.phone) || "Contacto"}</p>
              <p className="truncate text-xs text-muted-foreground">{current.phone ? formatPhone(current.phone) : "número oculto"} · {current.botEnabled ? "responde el asistente" : current.assignedName ? `atiende ${current.assignedName}` : "asistente pausado"}</p></div></div>
          <div className="flex gap-2">
            {!profileOpen && <Button size="sm" variant="outline" onClick={() => toggleProfile(true)} title="Ver la ficha del cliente"><PanelRightOpen className="mr-1 h-4 w-4" />Ficha</Button>}
            {current.botEnabled ? <Button size="sm" variant="outline" disabled={sending} onClick={() => void act("take")}><Hand className="mr-1 h-4 w-4" />Tomar conversación</Button>
            : <Button size="sm" variant="outline" disabled={sending} onClick={() => void act("release")}><Bot className="mr-1 h-4 w-4" />Devolver al asistente</Button>}</div>
        </div>
        {activeOrders.length > 0 && <div className="flex flex-wrap gap-2 border-b bg-indigo-50/60 px-3 py-2 text-xs dark:bg-indigo-950/20">{activeOrders.map((order) => <Link key={order.id} href={`/crm?q=${order.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 font-semibold text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300"><KanbanSquare className="h-3.5 w-3.5" />#{order.id} · {typeLabel[order.orderType]}{order.orderType === "dineIn" && order.tableLabel ? ` · ${order.tableLabel}` : ""}
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${STAGE_TONE[order.stage]}`}>{order.stageLabel}</span></Link>)}</div>}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#efeae2] p-4 dark:bg-slate-950">
          {detail.messages.map((message) => message.author === "system" && message.status === "simulated"
            ? <p key={message.id} className="mx-auto w-fit rounded-lg bg-white/80 px-3 py-1 text-center text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{message.body} · {stamp(message.createdAt)}</p>
            : <div key={message.id} className={`flex ${message.direction === "out" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${message.direction === "out" ? "rounded-tr-sm bg-[#d9fdd3] text-slate-900 dark:bg-emerald-900 dark:text-white" : "rounded-tl-sm bg-white text-slate-900 dark:bg-slate-800 dark:text-white"}`}>
                <MessageContent message={message} onOpenImage={setViewer} />
                <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-400">{message.direction === "out" && (message.author === "bot" ? <Bot className="h-3 w-3" /> : message.author === "staff" ? <UserRound className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />)}
                  {message.direction === "out" ? message.authorName || message.author : ""} {stamp(message.createdAt)} {message.status === "failed" ? "· no enviado" : message.direction === "out" ? <CheckCheck className="h-3 w-3" /> : null}</p></div></div>)}
          <div ref={end} />
        </div>

        {attachment && <div className="border-t bg-white p-3 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            {attachment.file.type.startsWith("image/") ? <img src={attachment.preview} alt="" className="h-20 w-20 rounded-lg object-cover" />
              : attachment.file.type.startsWith("video/") ? <video src={attachment.preview} className="h-20 w-28 rounded-lg bg-black object-cover" muted />
              : <span className="flex h-20 w-20 items-center justify-center rounded-lg bg-rose-500 text-white"><FileText className="h-8 w-8" /></span>}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="truncate text-sm font-semibold">{attachment.file.name} <span className="font-normal text-muted-foreground">· {fileSize(attachment.file.size)}</span></p>
              <Input value={attachment.caption} onChange={(event) => setAttachment({ ...attachment, caption: event.target.value })} placeholder="Agregá un comentario (opcional)" maxLength={1000} autoFocus
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void upload(attachment.file, { caption: attachment.caption }, attachment.file.name) } }} />
            </div>
            <div className="flex flex-col gap-2">
              <Button size="icon" disabled={sending} onClick={() => void upload(attachment.file, { caption: attachment.caption }, attachment.file.name)} className="rounded-full bg-emerald-600 hover:bg-emerald-700" aria-label="Enviar archivo">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
              <Button size="icon" variant="ghost" onClick={() => setAttachment(null)} aria-label="Quitar archivo"><X className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>}

        {emojiOpen && <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto border-t bg-white p-2 sm:grid-cols-12 dark:bg-slate-900">
          {EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="rounded-lg p-1.5 text-2xl leading-none hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={`Emoji ${emoji}`}>{emoji}</button>)}
        </div>}

        {recording ? <div className="flex items-center gap-3 border-t bg-[#f0f2f5] p-3 dark:bg-slate-800">
          <Button type="button" variant="ghost" size="icon" onClick={() => stopRecording(true)} className="text-red-600" aria-label="Descartar grabación"><Trash2 className="h-5 w-5" /></Button>
          <span className="flex flex-1 items-center gap-2 text-sm font-semibold text-red-600"><span className="h-3 w-3 animate-pulse rounded-full bg-red-600" />Grabando {clock(recording.seconds)}</span>
          <Button type="button" onClick={() => stopRecording(false)} className="rounded-full bg-emerald-600 hover:bg-emerald-700" aria-label="Enviar nota de voz"><Square className="mr-1 h-3.5 w-3.5 fill-current" /><Send className="h-4 w-4" /></Button>
        </div>
        : <form className="flex items-center gap-1.5 border-t bg-[#f0f2f5] p-2.5 dark:bg-slate-800" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) { setEmojiOpen(false); void act("send", draft.trim()) } }}>
          <Button type="button" variant="ghost" size="icon" onClick={() => setEmojiOpen((value) => !value)} className={emojiOpen ? "text-emerald-600" : "text-slate-500"} aria-label="Emojis"><Smile className="h-5 w-5" /></Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => fileInput.current?.click()} className="text-slate-500" aria-label="Adjuntar imagen, video o documento"><Paperclip className="h-5 w-5" /></Button>
          <input ref={fileInput} type="file" className="hidden" accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,audio/*" onChange={(event) => pickFile(event.target.files?.[0])} />
          <Input ref={textInput} value={draft} onChange={(event) => setDraft(event.target.value)} onPaste={(event) => { const file = [...event.clipboardData.files][0]; if (file) { event.preventDefault(); pickFile(file) } }}
            placeholder={connected ? "Escribí un mensaje (pausa el asistente en esta conversación)" : "WhatsApp desconectado"} maxLength={4000} className="h-10 flex-1 rounded-full bg-white dark:bg-slate-900" />
          {draft.trim() ? <Button type="submit" disabled={sending} className="h-10 w-10 rounded-full bg-emerald-600 p-0 hover:bg-emerald-700" aria-label="Enviar">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
            : <Button type="button" onClick={() => void startRecording()} disabled={sending} className="h-10 w-10 rounded-full bg-emerald-600 p-0 hover:bg-emerald-700" aria-label="Grabar nota de voz" title="Grabar nota de voz"><Mic className="h-5 w-5" /></Button>}
          <Button type="button" variant="ghost" size="icon" onClick={() => fileInput.current?.click()} className="hidden text-slate-500 sm:inline-flex" aria-label="Enviar imagen" title="Enviar imagen"><ImagePlus className="h-5 w-5" /></Button>
        </form>}
      </>}
      </div>
      {current && profileOpen && <div className="absolute inset-0 z-20 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[22rem] sm:shadow-2xl 2xl:static 2xl:z-auto 2xl:shrink-0 2xl:shadow-none">
        <ContactPanel name={current.name} phone={current.phone} phoneLabel={formatPhone(current.phone)} botEnabled={current.botEnabled} handoffRequested={current.handoffRequested} assignedName={current.assignedName}
          avatar={<ContactAvatar conversation={current} size={72} />} profile={detail?.profile ?? null} onClose={() => toggleProfile(false)} />
      </div>}
    </section>
    {viewer !== null && <Lightbox ids={imageIds.includes(viewer) ? imageIds : [viewer]} current={viewer} onChange={setViewer} onClose={() => setViewer(null)} />}
  </div>
}
