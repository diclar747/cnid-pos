"use client"

import { useEffect, useRef, useState } from "react"

// Una sola conexión SSE por pestaña, compartida por todos los componentes que escuchan cambios.

type Listener = (tables: string[]) => void
const listeners = new Set<Listener>()
const statusListeners = new Set<(online: boolean) => void>()
let source: EventSource | null = null
let online = false

function setOnline(value: boolean) {
  online = value
  for (const listener of statusListeners) listener(value)
}

function ensureSource() {
  if (source || typeof window === "undefined" || !("EventSource" in window)) return
  source = new EventSource("/api/events")
  source.addEventListener("ready", () => setOnline(true))
  source.addEventListener("change", (event) => {
    try {
      const { tables } = JSON.parse((event as MessageEvent).data) as { tables: string[] }
      for (const listener of listeners) listener(tables)
    } catch { /* aviso mal formado */ }
  })
  source.onerror = () => {
    setOnline(false)
    // Sesión vencida o sin permiso: no reintentar en bucle.
    if (source?.readyState === EventSource.CLOSED) { source = null; window.setTimeout(() => { if (listeners.size) ensureSource() }, 10_000) }
  }
}

function release() {
  if (listeners.size || !source) return
  source.close()
  source = null
  setOnline(false)
}

/**
 * Llama a `onChange` cuando cambia alguna de las tablas indicadas (con un pequeño retardo para agrupar).
 * Si el tiempo real no está disponible, `fallbackMs` mantiene un sondeo periódico.
 */
export function useLiveTables(tables: string[], onChange: () => void, fallbackMs = 15_000) {
  const callback = useRef(onChange)
  callback.current = onChange
  const key = tables.join(",")
  const [connected, setConnected] = useState(online)
  useEffect(() => {
    const wanted = new Set(key.split(","))
    let timer: ReturnType<typeof setTimeout> | null = null
    const listener: Listener = (changed) => {
      if (!changed.some((table) => wanted.has(table))) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => callback.current(), 150)
    }
    listeners.add(listener)
    statusListeners.add(setConnected)
    ensureSource()
    setConnected(online)
    const poll = window.setInterval(() => { if (!online && document.visibilityState === "visible") callback.current() }, fallbackMs)
    const visible = () => { if (document.visibilityState === "visible") callback.current() }
    document.addEventListener("visibilitychange", visible)
    return () => {
      listeners.delete(listener)
      statusListeners.delete(setConnected)
      if (timer) clearTimeout(timer)
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", visible)
      release()
    }
  }, [key, fallbackMs])
  return connected
}
