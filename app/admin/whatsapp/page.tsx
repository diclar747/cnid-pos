"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Bot, CheckCheck, Clock3, Hand, KanbanSquare, LogOut, MessageCircle, Phone, Plug, PlugZap, QrCode, RefreshCw, RotateCcw, Search, Send,
  ShieldAlert, Smartphone, Sparkles, UserRound, Wifi, WifiOff } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiRequest } from "@/lib/api-client"
import { useLiveTables } from "@/lib/use-live"
import { sourceLabel, typeLabel } from "@/lib/order-labels"
import type { ServiceOrder } from "@/lib/service-order-types"

type Status = { session: { enabled: boolean; status: string; live: boolean; phone: string; pushName: string; qr: string | null; qrAt: string | null; connectedAt: string | null; lastError: string }
  logs: { event: string; detail: string; createdAt: string }[]; ai: { enabled: boolean; instructions: string; greeting: string; configured: boolean }
  usage: { replies: number; errors: number; transcriptions: number; tokens: number; latencyMs: number }; counts: { conversations: number; unread: number; handoffs: number }; canManage: boolean }
type Conversation = { id: number; phone: string; name: string; botEnabled: boolean; handoffRequested: boolean; assignedName: string; unread: number; lastMessage: string
  lastMessageAt: string | null; cartItems: number; openOrders: number }
type Message = { id: number; direction: "in" | "out"; author: string; authorName: string; kind: string; body: string; status: string; orderId: number | null; createdAt: string }

const STATUS: Record<string, { label: string; tone: string }> = {
  connected: { label: "Conectado", tone: "bg-emerald-100 text-emerald-800" }, qr: { label: "Esperando escaneo", tone: "bg-amber-100 text-amber-800" },
  connecting: { label: "Conectando…", tone: "bg-sky-100 text-sky-800" }, disconnected: { label: "Desconectado", tone: "bg-slate-200 text-slate-700" },
  logged_out: { label: "Desvinculado", tone: "bg-slate-200 text-slate-700" }, error: { label: "Con error", tone: "bg-red-100 text-red-800" },
}
const time = (iso: string | null) => iso ? new Date(iso).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""

export default function WhatsAppPage() {
  const [tab, setTab] = useState<"inbox" | "connection" | "ai">("inbox")
  const [status, setStatus] = useState<Status | null>(null)
  const load = useCallback(async () => { try { setStatus(await apiRequest<Status>("/api/whatsapp")) } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo cargar WhatsApp") } }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get("tab") === "connection" || params.get("tab") === "ai") setTab(params.get("tab") as "connection" | "ai") }, [])
  useLiveTables(["whatsapp_session", "wa_conversations"], () => void load(), 10000)
  const state = STATUS[status?.session.status ?? "disconnected"] ?? STATUS.disconnected

  return <div className="space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight"><MessageCircle className="h-8 w-8 text-green-600" /> WhatsApp e IA</h1>
        <p className="text-muted-foreground">Conectá el número del restaurante, atendé conversaciones y configurá el asistente Niro que toma pedidos.</p></div>
      {status && <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${state.tone}`}>{status.session.status === "connected" ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}{state.label}{status.session.phone ? ` · +${status.session.phone}` : ""}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${status.ai.enabled && status.ai.configured ? "bg-violet-100 text-violet-800" : "bg-slate-200 text-slate-700"}`}><Bot className="h-4 w-4" />Asistente {status.ai.enabled && status.ai.configured ? "activo" : "inactivo"}</span>
      </div>}
    </header>
    <div className="flex gap-1 rounded-xl border bg-white p-1 dark:bg-slate-900 sm:w-fit">
      {([["inbox", "Conversaciones", MessageCircle], ["connection", "Conexión", Plug], ["ai", "Asistente IA", Sparkles]] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setTab(id)}
        className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${tab === id ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
        <Icon className="h-4 w-4" />{label}{id === "inbox" && status && status.counts.unread > 0 && <span className="rounded-full bg-green-600 px-1.5 text-[11px] text-white">{status.counts.unread}</span>}</button>)}
    </div>
    {!status ? <p className="py-16 text-center text-muted-foreground">Cargando…</p>
      : tab === "connection" ? <ConnectionPanel status={status} onChanged={load} />
      : tab === "ai" ? <AssistantPanel status={status} onChanged={load} />
      : <Inbox connected={status.session.status === "connected"} />}
  </div>
}

function ConnectionPanel({ status, onChanged }: { status: Status; onChanged: () => Promise<void> }) {
  const [qrImage, setQrImage] = useState("")
  const [busy, setBusy] = useState(false)
  const { session } = status
  useEffect(() => {
    if (!session.qr) { setQrImage(""); return }
    void import("qrcode").then(({ default: QRCode }) => (QRCode as unknown as { toDataURL: (text: string, options: object) => Promise<string> }).toDataURL(session.qr!, { width: 320, margin: 1, errorCorrectionLevel: "L" })).then(setQrImage).catch(() => setQrImage(""))
  }, [session.qr])
  const act = async (action: "connect" | "disconnect" | "logout") => {
    if (action === "logout" && !window.confirm("¿Desvincular el WhatsApp del restaurante? Vas a tener que escanear el QR de nuevo.")) return
    setBusy(true)
    try { await apiRequest("/api/whatsapp/session", { method: "POST", body: JSON.stringify({ action }) }); await onChanged() }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo completar") }
    finally { setBusy(false) }
  }
  if (!status.canManage) return <p className="rounded-2xl border bg-white p-6 text-sm text-muted-foreground dark:bg-slate-900">Solo la administración del restaurante puede conectar o desconectar WhatsApp.</p>
  return <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
    <section className="rounded-2xl border bg-white p-6 dark:bg-slate-900">
      <h2 className="text-lg font-bold">Número del restaurante</h2>
      {session.status === "connected" ? <div className="mt-4 space-y-4">
        <div className="flex items-center gap-4 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30"><div className="rounded-full bg-emerald-600 p-3 text-white"><Smartphone className="h-6 w-6" /></div>
          <div><p className="font-bold text-emerald-900 dark:text-emerald-200">+{session.phone} {session.pushName ? `· ${session.pushName}` : ""}</p><p className="text-sm text-emerald-800 dark:text-emerald-300">Conectado desde {time(session.connectedAt)}. Los mensajes llegan a Conversaciones.</p></div></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void act("disconnect")}><Plug className="mr-2 h-4 w-4" />Pausar conexión</Button>
          <Button variant="outline" disabled={busy} onClick={() => void act("logout")} className="border-red-200 text-red-700"><LogOut className="mr-2 h-4 w-4" />Desvincular</Button></div>
      </div> : session.status === "qr" && qrImage ? <div className="mt-4 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        <img src={qrImage} alt="Código QR para vincular WhatsApp" className="h-64 w-64 rounded-xl border bg-white p-2" />
        <ol className="list-decimal space-y-2 pl-5 text-sm"><li>Abrí WhatsApp (o WhatsApp Business) en el teléfono del local.</li><li>Tocá <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong>.</li>
          <li>Escaneá este código. Se renueva solo cada ~20 segundos.</li><li className="text-muted-foreground">Si nadie lo escanea en 2 minutos, se detiene: volvé a tocar «Conectar».</li></ol>
      </div> : <div className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">{session.status === "connecting" ? "Conectando con WhatsApp…" : "Todavía no hay un número conectado o la conexión está pausada."}</p>
        {session.lastError && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{session.lastError}</p>}
        <Button disabled={busy || session.status === "connecting"} onClick={() => void act("connect")} className="bg-green-600 hover:bg-green-700"><PlugZap className="mr-2 h-4 w-4" />{session.status === "connecting" ? "Conectando…" : "Conectar WhatsApp"}</Button>
      </div>}
      <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        La conexión usa WhatsApp Web (Baileys), una integración no oficial: puede desconectarse y WhatsApp puede restringir números con envíos masivos. Para una operación crítica conviene evaluar la API oficial de WhatsApp Business. Cada restaurante usa su propia sesión.</p>
    </section>
    <section className="rounded-2xl border bg-white p-6 dark:bg-slate-900">
      <h2 className="text-lg font-bold">Actividad de la sesión</h2>
      <ol className="mt-3 max-h-96 space-y-2 overflow-y-auto text-sm">{status.logs.length ? status.logs.map((log, index) => <li key={index} className="border-l-2 border-slate-200 pl-3">
        <p className="font-medium">{log.detail || log.event}</p><p className="text-xs text-muted-foreground">{time(log.createdAt)} · {log.event}</p></li>) : <li className="text-muted-foreground">Sin actividad todavía.</li>}</ol>
    </section>
  </div>
}

function AssistantPanel({ status, onChanged }: { status: Status; onChanged: () => Promise<void> }) {
  const [enabled, setEnabled] = useState(status.ai.enabled)
  const [instructions, setInstructions] = useState(status.ai.instructions)
  const [greeting, setGreeting] = useState(status.ai.greeting)
  const [saving, setSaving] = useState(false)
  const [chat, setChat] = useState<{ author: string; body: string }[]>([])
  const [draft, setDraft] = useState("")
  const [thinking, setThinking] = useState(false)
  const [models, setModels] = useState<string>("")
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }) }, [chat, thinking])
  useEffect(() => {
    if (!status.ai.configured || !status.canManage) return
    void apiRequest<{ models: { name: string }[] }>("/api/whatsapp/ai").then((result) => setModels(result.models.map((model) => model.name).join(", "))).catch(() => undefined)
  }, [status.ai.configured, status.canManage])
  const save = async () => {
    setSaving(true)
    try { await apiRequest("/api/whatsapp/ai", { method: "PUT", body: JSON.stringify({ enabled, instructions, greeting }) }); toast.success("Asistente guardado"); await onChanged() }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar") }
    finally { setSaving(false) }
  }
  const simulate = async (body: Record<string, unknown>) => {
    setThinking(true)
    if (typeof body.message === "string") setChat((current) => [...current, { author: "customer", body: body.message as string }])
    try {
      const result = await apiRequest<{ messages: { author: string; body: string }[] }>("/api/whatsapp/simulate", { method: "POST", body: JSON.stringify(body) })
      setChat(result.messages)
    } catch (error) { toast.error(error instanceof Error ? error.message : "El asistente no respondió") }
    finally { setThinking(false) }
  }
  if (!status.canManage) return <p className="rounded-2xl border bg-white p-6 text-sm text-muted-foreground dark:bg-slate-900">Solo la administración configura el asistente.</p>
  return <div className="grid gap-5 lg:grid-cols-2">
    <section className="space-y-4 rounded-2xl border bg-white p-6 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-violet-600" />Asistente Niro</h2>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-4 w-4" />Responder automáticamente</label></div>
      {!status.ai.configured && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Falta la variable <code className="rounded bg-white/70 px-1">NIRO_API_KEY</code> en el servidor (panel del hosting → Variables). Sin ella el asistente no responde y los mensajes quedan para el personal.</span></p>}
      <p className="text-sm text-muted-foreground">El asistente usa siempre la carta, precios, opciones, zonas de delivery y horarios cargados en el sistema. No puede cambiar precios, confirmar pagos ni avanzar estados: los pedidos entran como <strong>Nuevos</strong> en el tablero para que el local los confirme.</p>
      <label className="block text-sm font-semibold">Saludo inicial
        <Input value={greeting} onChange={(event) => setGreeting(event.target.value)} maxLength={600} placeholder="¡Hola! Bienvenido a … ¿Qué te gustaría pedir hoy?" className="mt-1" /></label>
      <label className="block text-sm font-semibold">Instrucciones del restaurante
        <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={4000} rows={7}
          placeholder={"Ej.: Recomendá el menú del día. Los lunes no hay delivery después de las 22. Ofrecé bebida con cada combo."} className="mt-1 w-full rounded-md border bg-background p-2 text-sm font-normal" /></label>
      <Button onClick={() => void save()} disabled={saving}>Guardar asistente</Button>
      <div className="grid grid-cols-2 gap-2 border-t pt-4 text-sm sm:grid-cols-4">
        <Usage label="Respuestas (30 d)" value={status.usage.replies} /><Usage label="Audios transcriptos" value={status.usage.transcriptions} />
        <Usage label="Tokens" value={status.usage.tokens} /><Usage label="Errores" value={status.usage.errors} />
      </div>
      {status.usage.latencyMs > 0 && <p className="text-xs text-muted-foreground">Tiempo medio de respuesta: {(status.usage.latencyMs / 1000).toFixed(1)} s{models ? ` · modelos de chat disponibles: ${models}` : ""}</p>}
    </section>
    <section className="flex h-[36rem] flex-col rounded-2xl border bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-bold">Probar asistente</h2><p className="text-xs text-muted-foreground">Conversación de prueba: no envía WhatsApp ni registra pedidos.</p></div>
        <Button variant="outline" size="sm" onClick={() => void simulate({ reset: true })}><RotateCcw className="mr-1 h-4 w-4" />Reiniciar</Button></div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#efeae2] p-4 dark:bg-slate-950">
        {!chat.length && <p className="rounded-xl bg-white/80 p-3 text-center text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">Escribí como si fueras un cliente: «Hola, ¿qué tienen hoy?», «Quiero dos empanadas para delivery»…</p>}
        {chat.map((message, index) => <Bubble key={index} mine={message.author !== "customer"} body={message.body} meta={message.author === "customer" ? "Cliente (prueba)" : "Asistente"} />)}
        {thinking && <p className="text-xs text-slate-500">El asistente está escribiendo…</p>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t p-3" onSubmit={(event) => { event.preventDefault(); const text = draft.trim(); if (text && !thinking) { setDraft(""); void simulate({ message: text }) } }}>
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={status.ai.configured ? "Mensaje de prueba…" : "Configurá NIRO_API_KEY para probar"} disabled={!status.ai.configured} maxLength={1000} />
        <Button type="submit" disabled={!draft.trim() || thinking || !status.ai.configured}><Send className="h-4 w-4" /></Button>
      </form>
    </section>
  </div>
}

function Usage({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[11px] text-muted-foreground">{label}</p><strong className="text-lg">{value.toLocaleString("es-PY")}</strong></div>
}

function Bubble({ mine, body, meta }: { mine: boolean; body: string; meta: string }) {
  return <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "rounded-tr-sm bg-[#d9fdd3] text-slate-900 dark:bg-emerald-900 dark:text-white" : "rounded-tl-sm bg-white text-slate-900 dark:bg-slate-800 dark:text-white"}`}>
      {body.replace(/\*(.+?)\*/g, "$1")}<p className="mt-1 text-right text-[10px] text-slate-500 dark:text-slate-400">{meta}</p></div></div>
}

function Inbox({ connected }: { connected: boolean }) {
  const [items, setItems] = useState<Conversation[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState<{ conversation: Conversation & { cart: any }; messages: Message[]; orders: ServiceOrder[] } | null>(null)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const loadList = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("q", search.trim())
      const phone = new URLSearchParams(window.location.search).get("phone")
      if (phone && !search) params.set("phone", phone)
      const result = await apiRequest<{ items: Conversation[] }>(`/api/whatsapp/conversations?${params}`)
      setItems(result.items)
      const wanted = Number(new URLSearchParams(window.location.search).get("c"))
      setSelected((current) => current ?? (wanted || (phone && result.items[0]?.id) || null))
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudieron cargar las conversaciones") }
  }, [search])
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
  return <div className="grid h-[calc(100dvh-15rem)] min-h-[32rem] overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 md:grid-cols-[20rem_1fr]">
    <aside className={`flex min-h-0 flex-col border-r ${selected ? "hidden md:flex" : "flex"}`}>
      <div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, número o mensaje" className="h-9 pl-9" /></div>
        {!connected && <p className="mt-2 text-xs text-amber-700">WhatsApp no está conectado: no llegan mensajes nuevos.</p>}</div>
      <ul className="min-h-0 flex-1 divide-y overflow-y-auto">{items.map((item) => <li key={item.id}>
        <button type="button" onClick={() => setSelected(item.id)} className={`flex w-full items-start gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${selected === item.id ? "bg-green-50 dark:bg-green-950/30" : ""}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800"><UserRound className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{item.name || (item.phone ? `+${item.phone}` : "Contacto")}</p><span className="shrink-0 text-[10px] text-muted-foreground">{time(item.lastMessageAt)}</span></div>
            <p className="truncate text-xs text-muted-foreground">{item.lastMessage}</p>
            <div className="mt-1 flex flex-wrap gap-1">{item.handoffRequested && <span className="rounded bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">Pide persona</span>}
              {!item.botEnabled && !item.handoffRequested && <span className="rounded bg-slate-100 px-1.5 text-[10px] text-slate-700">{item.assignedName ? `Atiende ${item.assignedName}` : "Asistente pausado"}</span>}
              {item.openOrders > 0 && <span className="rounded bg-indigo-100 px-1.5 text-[10px] text-indigo-700">{item.openOrders} pedido(s)</span>}
              {item.cartItems > 0 && <span className="rounded bg-amber-100 px-1.5 text-[10px] text-amber-800">armando pedido</span>}
              {item.unread > 0 && <span className="rounded-full bg-green-600 px-1.5 text-[10px] font-bold text-white">{item.unread}</span>}</div></div>
        </button></li>)}
        {!items.length && <li className="p-6 text-center text-sm text-muted-foreground">Sin conversaciones todavía.</li>}</ul>
    </aside>
    <section className={`min-h-0 flex-col ${selected ? "flex" : "hidden md:flex"}`}>
      {!current ? <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">Elegí una conversación para ver los mensajes.</div> : <>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelected(null)}>←</Button>
            <div><p className="font-bold">{current.name || "Contacto"}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{current.phone ? `+${current.phone}` : "número oculto"} · {current.botEnabled ? "responde el asistente" : current.assignedName ? `atiende ${current.assignedName}` : "asistente pausado"}</p></div></div>
          <div className="flex gap-2">{current.botEnabled ? <Button size="sm" variant="outline" disabled={sending} onClick={() => void act("take")}><Hand className="mr-1 h-4 w-4" />Tomar conversación</Button>
            : <Button size="sm" variant="outline" disabled={sending} onClick={() => void act("release")}><Bot className="mr-1 h-4 w-4" />Devolver al asistente</Button>}</div>
        </div>
        {openOrders.length > 0 && <div className="flex flex-wrap gap-2 border-b bg-indigo-50/60 px-3 py-2 text-xs dark:bg-indigo-950/20">{openOrders.map((order) => <Link key={order.id} href={`/crm?q=${order.id}`}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-semibold text-indigo-700 shadow-sm dark:bg-slate-800"><KanbanSquare className="h-3.5 w-3.5" />#{order.id} · {typeLabel[order.orderType]} · {order.confirmation === "pending" ? "por confirmar" : sourceLabel[order.source]}</Link>)}</div>}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#efeae2] p-4 dark:bg-slate-950">
          {detail.messages.map((message) => message.author === "system" && message.status === "simulated"
            ? <p key={message.id} className="mx-auto w-fit rounded-lg bg-white/80 px-3 py-1 text-center text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{message.body} · {time(message.createdAt)}</p>
            : <div key={message.id} className={`flex ${message.direction === "out" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${message.direction === "out" ? "rounded-tr-sm bg-[#d9fdd3] text-slate-900 dark:bg-emerald-900 dark:text-white" : "rounded-tl-sm bg-white text-slate-900 dark:bg-slate-800 dark:text-white"}`}>
                {message.body.replace(/\*(.+?)\*/g, "$1")}
                <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-400">{message.direction === "out" && (message.author === "bot" ? <Bot className="h-3 w-3" /> : message.author === "staff" ? <UserRound className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />)}
                  {message.direction === "out" ? message.authorName || message.author : ""} {time(message.createdAt)} {message.status === "failed" ? "· no enviado" : message.direction === "out" ? <CheckCheck className="h-3 w-3" /> : null}</p></div></div>)}
          <div ref={end} />
        </div>
        <form className="flex gap-2 border-t p-3" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) void act("send", draft.trim()) }}>
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={connected ? "Escribí una respuesta (pausa el asistente en esta conversación)" : "WhatsApp desconectado"} maxLength={4000} />
          <Button type="submit" disabled={!draft.trim() || sending} className="bg-green-600 hover:bg-green-700"><Send className="h-4 w-4" /></Button>
        </form>
      </>}
    </section>
  </div>
}
