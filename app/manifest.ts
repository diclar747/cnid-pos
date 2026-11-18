import type { MetadataRoute } from "next"

// App instalable: abre la bienvenida (solo la primera vez) y después el inicio de sesión.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "RestoPOS · Gestión de restaurantes",
    short_name: "RestoPOS",
    description: "Punto de venta, mesas con QR, cocina en tiempo real, caja, delivery y pedidos por WhatsApp para tu restaurante.",
    start_url: "/welcome",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#020617",
    theme_color: "#0f172a",
    lang: "es-PY",
    categories: ["business", "food", "productivity"],
    icons: [
      { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      { src: "/landing/panel.webp", sizes: "2880x1800", type: "image/webp", form_factor: "wide", label: "Panel con las ventas del día" },
      { src: "/landing/pos.webp", sizes: "2880x1800", type: "image/webp", form_factor: "wide", label: "Punto de venta con carrito" },
      { src: "/landing/cocina.webp", sizes: "2880x1800", type: "image/webp", form_factor: "wide", label: "Tablero de cocina en tiempo real" },
      { src: "/landing/mesa-qr.webp", sizes: "1170x2532", type: "image/webp", form_factor: "narrow", label: "Pedido desde el QR de la mesa" },
    ],
    shortcuts: [
      { name: "Punto de venta", url: "/pos", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
      { name: "Pedidos en vivo", url: "/crm", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
      { name: "Cocina", url: "/kitchen", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
      { name: "Caja", url: "/cash", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
    ],
  }
}
