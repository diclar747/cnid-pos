import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { currentSchema } from "@/lib/db"
import { subscribeLive, type LiveEvent } from "@/lib/realtime"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Eventos en vivo del restaurante (Server-Sent Events): avisa qué tabla cambió para que la pantalla recargue.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const schema = await currentSchema()
  const encoder = new TextEncoder()
  let cleanup = () => {}
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let pending = new Map<string, LiveEvent>()
      let flushTimer: ReturnType<typeof setTimeout> | null = null
      const send = (chunk: string) => { try { controller.enqueue(encoder.encode(chunk)) } catch { cleanup() } }
      // Agrupa ráfagas (una venta toca varias tablas) en un solo envío.
      const flush = () => {
        flushTimer = null
        const events = [...pending.values()]
        pending = new Map()
        if (events.length) send(`event: change\ndata: ${JSON.stringify({ tables: [...new Set(events.map((event) => event.t))], events: events.slice(0, 50) })}\n\n`)
      }
      const unsubscribe = subscribeLive(schema, (event) => {
        pending.set(`${event.t}:${event.id}`, event)
        if (!flushTimer) flushTimer = setTimeout(flush, 250)
      })
      const heartbeat = setInterval(() => send(`: ping ${Date.now()}\n\n`), 25_000)
      send(`retry: 3000\nevent: ready\ndata: {}\n\n`)
      cleanup = () => {
        unsubscribe()
        clearInterval(heartbeat)
        if (flushTimer) clearTimeout(flushTimer)
        cleanup = () => {}
        try { controller.close() } catch { /* ya cerrado */ }
      }
      request.signal.addEventListener("abort", () => cleanup())
    },
    cancel() { cleanup() },
  })
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  } })
}
