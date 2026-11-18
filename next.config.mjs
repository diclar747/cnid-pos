/** @type {import('next').NextConfig} */
const nextConfig = {
  // Baileys (WhatsApp) es ESM con módulos wasm: se carga desde node_modules en el servidor, sin empaquetar.
  serverExternalPackages: ["@whiskeysockets/baileys"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig