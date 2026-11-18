import "server-only"

import { EventEmitter } from "node:events"
import { Client } from "pg"

// Un único oyente de PostgreSQL (LISTEN restopos_events) por proceso, compartido por todas las
// conexiones SSE. Los avisos se reparten por esquema: cada restaurante recibe solo los suyos.

export type LiveEvent = { s: string; t: string; op: string; id: string | null }

type Hub = { emitter: EventEmitter; client: Client | null; connecting: Promise<void> | null; retry: number }
declare global { var restoposLiveHub: Hub | undefined }

function hub(): Hub {
  if (!globalThis.restoposLiveHub) {
    const emitter = new EventEmitter()
    emitter.setMaxListeners(0)
    globalThis.restoposLiveHub = { emitter, client: null, connecting: null, retry: 0 }
  }
  return globalThis.restoposLiveHub
}

async function connect(state: Hub) {
  if (state.client || state.connecting) return state.connecting ?? undefined
  state.connecting = (async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL, keepAlive: true })
    const reconnect = () => {
      if (state.client !== client) return
      state.client = null
      client.removeAllListeners()
      client.end().catch(() => undefined)
      const delay = Math.min(30_000, 1000 * 2 ** state.retry++)
      setTimeout(() => { if (state.emitter.listenerCount("event") > 0) void connect(state) }, delay)
    }
    client.on("error", reconnect)
    client.on("end", reconnect)
    client.on("notification", (message) => {
      if (message.channel !== "restopos_events" || !message.payload) return
      try { state.emitter.emit("event", JSON.parse(message.payload) as LiveEvent) } catch { /* aviso mal formado */ }
    })
    await client.connect()
    await client.query("LISTEN restopos_events")
    state.client = client
    state.retry = 0
  })().catch((error) => {
    console.error("Tiempo real: no se pudo escuchar PostgreSQL", error instanceof Error ? error.message : error)
    setTimeout(() => { if (state.emitter.listenerCount("event") > 0) void connect(state) }, Math.min(30_000, 1000 * 2 ** state.retry++))
  }).finally(() => { state.connecting = null })
  return state.connecting
}

/** Suscribe a los cambios de un restaurante. Devuelve la función para cancelar. */
export function subscribeLive(schema: string, listener: (event: LiveEvent) => void) {
  const state = hub()
  const handler = (event: LiveEvent) => { if (event.s === schema) listener(event) }
  state.emitter.on("event", handler)
  void connect(state)
  return () => { state.emitter.off("event", handler) }
}

/** Emite un evento local sin pasar por la base (por ejemplo, estado de la conexión de WhatsApp). */
export function emitLive(event: LiveEvent) {
  hub().emitter.emit("event", event)
}
