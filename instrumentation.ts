// Al arrancar el servidor (Node.js), reanuda las sesiones de WhatsApp que estaban conectadas.
// El import va dentro de la condición para que el runtime Edge no intente empaquetar Baileys.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleWhatsAppBoot } = await import("./lib/whatsapp/boot")
    scheduleWhatsAppBoot()
  }
}
