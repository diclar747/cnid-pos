const CACHE = "restopos-static-v5"
const STATIC = ["/offline.html", "/pwa-192.png", "/pwa-512.png", "/landing/panel.webp", "/landing/pos.webp", "/landing/cocina.webp", "/landing/mesa-qr.webp", "/landing/ordenes.webp"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]))
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")))
    return
  }
  const url = new URL(request.url)
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) return
  if (url.pathname.startsWith("/_next/static/") || STATIC.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)) }
      return response
    })))
  }
})

// Notificaciones push: estado del pedido (clientes) y llamados de mesa (personal).
self.addEventListener("push", (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: "RestoPOS", body: event.data ? event.data.text() : "" } }
  const title = data.title || "RestoPOS"
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
  }))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const same = clients.find((client) => client.url === target) || clients.find((client) => new URL(client.url).origin === self.location.origin)
    if (same) { same.focus(); if (same.url !== target && "navigate" in same) return same.navigate(target) ; return undefined }
    return self.clients.openWindow(target)
  }))
})
