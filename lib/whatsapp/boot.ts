// Arranque diferido de las sesiones de WhatsApp (lo llama instrumentation.ts solo en Node.js).
export function scheduleWhatsAppBoot() {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.WHATSAPP_AUTOSTART === "false" || !process.env.DATABASE_URL) return
  setTimeout(() => {
    void import("./session").then(({ bootSessions }) => bootSessions())
      .catch((error) => console.error("WhatsApp: no se pudieron reanudar las sesiones", error instanceof Error ? error.message : error))
  }, 3000)
}
