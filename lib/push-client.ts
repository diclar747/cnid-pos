"use client"

// Suscripción a notificaciones push desde el navegador (clientes en la mesa y personal del local).

export type PushSupport = "supported" | "ios-install" | "unsupported" | "insecure"

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
export const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** En iPhone las notificaciones web solo funcionan con la app agregada a la pantalla de inicio. */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported"
  if (!window.isSecureContext) return "insecure"
  if (isIos() && !isStandalone()) return "ios-install"
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported"
  return "supported"
}

function keyToBytes(base64url: string) {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob(padded)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

/** Pide permiso y devuelve la suscripción lista para enviar al servidor (o null si no se pudo). */
export async function subscribePush(): Promise<PushSubscriptionJSON | null> {
  if (pushSupport() !== "supported") return null
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission
  if (permission !== "granted") return null
  const registration = await navigator.serviceWorker.register("/sw.js")
  await navigator.serviceWorker.ready
  const { publicKey } = await fetch("/api/push/public-key").then((response) => response.json()) as { publicKey: string }
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) })
  return subscription.toJSON()
}

/** Pitido corto para avisos en pantalla, sin archivos de audio. */
export function beep(times = 2) {
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    for (let i = 0; i < times; i++) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = "sine"
      oscillator.frequency.value = i % 2 ? 660 : 880
      gain.gain.setValueAtTime(0.0001, context.currentTime + i * 0.35)
      gain.gain.exponentialRampToValueAtTime(0.4, context.currentTime + i * 0.35 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + i * 0.35 + 0.3)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(context.currentTime + i * 0.35)
      oscillator.stop(context.currentTime + i * 0.35 + 0.32)
    }
    window.setTimeout(() => void context.close(), times * 400 + 200)
  } catch { /* algunos navegadores bloquean el audio hasta que el usuario toca la pantalla */ }
}
