// Prueba del canal de WhatsApp + asistente sin teléfono ni créditos reales:
// - Niro IA simulado: servidor HTTP local que responde como /api/v1/chat/completions (formato OpenAI de la documentación).
// - Socket de WhatsApp simulado: captura lo que se enviaría.
// Recorre: mensaje entrante → sin duplicados → IA → acciones validadas con la carta real → carrito con precios del sistema
// → pedido «Nuevo» (pendiente de confirmación) vinculado a la conversación → aviso de estado por WhatsApp → derivación a persona.
// Uso: npx tsx --conditions=react-server scripts/test-whatsapp-assistant.mts   (requiere la base local de .env.local)
import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { randomBytes } from "node:crypto"
import pg from "pg"

const env = readFileSync(".env.local", "utf8")
process.env.DATABASE_URL ||= env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
process.env.NIRO_API_KEY = "niro_prueba_local"
const check = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
const suffix = randomBytes(3).toString("hex")

// Niro simulado: decide la respuesta según el último mensaje del cliente y verifica el contrato de la API.
const seen: { auth: string; system: string; last: string }[] = []
let script: (last: string, system: string) => { status?: number; content?: string } = () => ({ content: "{}" })
const niro = createServer((request, response) => {
  let raw = ""
  request.on("data", (chunk) => { raw += chunk })
  request.on("end", () => {
    const body = JSON.parse(raw || "{}")
    const messages = body.messages ?? []
    const last = [...messages].reverse().find((message: any) => message.role === "user")?.content ?? ""
    const system = messages[0]?.role === "system" ? messages[0].content : ""
    seen.push({ auth: String(request.headers.authorization ?? ""), system, last })
    const answer = script(last, system)
    response.writeHead(answer.status ?? 200, { "Content-Type": "application/json" })
    response.end(answer.status && answer.status >= 400 ? JSON.stringify({ error: { message: "Saldo insuficiente" } })
      : JSON.stringify({ id: "chatcmpl-test", object: "chat.completion", model: "niro-test", choices: [{ index: 0, message: { role: "assistant", content: answer.content }, finish_reason: "stop" }],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } }))
  })
})
await new Promise<void>((resolve) => niro.listen(0, "127.0.0.1", resolve))
process.env.NIRO_BASE_URL = `http://127.0.0.1:${(niro.address() as { port: number }).port}/api/v1`

const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
await db.connect()
const created = { products: [] as number[], zones: [] as number[], conversations: [] as number[], orders: [] as number[] }
const sent: { jid: string; text: string }[] = []
let previousAiEnabled: boolean | null = null
let previousCompany: any = null
const fakeSock = { sendMessage: async (jid: string, content: { text: string }) => { sent.push({ jid, text: content.text }); return { key: { id: `OUT-${randomBytes(6).toString("hex")}` } } },
  readMessages: async () => undefined, sendPresenceUpdate: async () => undefined, updateMediaMessage: async () => undefined }
globalThis.restoposWhatsApp = new Map([["public", { sock: fakeSock as any, stopping: false, retries: 0, qrCount: 0, registered: true, timer: null, starting: null }]])

try {
  const { handleUpsert } = await import("../lib/whatsapp/inbox")
  const { notifyCustomer } = await import("../lib/order-flow")
  await import("../lib/whatsapp/session")
  // Producto con opción obligatoria y zona de delivery reales.
  const product = await db.query(`INSERT INTO products (data) VALUES ($1::jsonb) RETURNING id`, [JSON.stringify({ name: `Hamburguesa prueba ${suffix}`, price: 30000,
    category: "Pruebas WA", description: "Doble carne", stock: 0, trackStock: false, isActive: true, barcode: `WA-${suffix}`,
    modifierGroups: [{ legacyId: 990001, name: "Punto", required: true, multiple: false, options: [{ legacyId: 990011, name: "Jugosa", price: 0 }, { legacyId: 990012, name: "Bien cocida", price: 0 }] },
      { legacyId: 990002, name: "Extras", required: false, multiple: true, options: [{ legacyId: 990021, name: "Queso extra", price: 5000 }] }] })])
  const productId = Number(product.rows[0].id)
  created.products.push(productId)
  const zone = await db.query("INSERT INTO delivery_zones (name, areas, fee, free_over, eta_minutes) VALUES ($1, 'Barrio Prueba', 9000, NULL, 35) RETURNING id", [`Zona WA ${suffix}`])
  const zoneId = Number(zone.rows[0].id)
  created.zones.push(zoneId)
  previousAiEnabled = Boolean((await db.query("SELECT enabled FROM ai_settings WHERE id = 1")).rows[0]?.enabled)
  await db.query("UPDATE ai_settings SET enabled = TRUE WHERE id = 1")

  const jid = `595981${suffix.replace(/\D/g, "1").padEnd(6, "1").slice(0, 6)}@s.whatsapp.net`
  let counter = 0
  const incoming = async (text: string) => {
    counter += 1
    const msg = { key: { remoteJid: jid, id: `IN-${suffix}-${counter}`, fromMe: false }, pushName: "Cliente Prueba", messageTimestamp: Math.floor(Date.now() / 1000), message: { conversation: text } }
    const before = sent.length
    await handleUpsert("public", fakeSock, { type: "notify", messages: [msg] })
    // Espera la respuesta real (con la máquina ocupada puede tardar más); si no hay respuesta, sigue a los 6 s.
    for (let waited = 0; waited < 6000 && sent.length === before; waited += 100) await new Promise((resolve) => setTimeout(resolve, 100))
    await new Promise((resolve) => setTimeout(resolve, 200))
    return msg
  }

  // 1) Saludo: la IA ve la carta real, las zonas y las reglas; la key viaja como Bearer.
  script = () => ({ content: JSON.stringify({ reply: "¡Hola! ¿Qué te gustaría pedir?", actions: [] }) })
  const first = await incoming("Hola")
  const conversation = (await db.query("SELECT id, phone, name FROM wa_conversations WHERE jid = $1", [jid])).rows[0]
  check(conversation, "Se crea la conversación")
  created.conversations.push(Number(conversation.id))
  check(conversation.phone && conversation.name === "Cliente Prueba", "Teléfono y nombre del contacto")
  check(seen.at(-1)?.auth === "Bearer niro_prueba_local", "La API key se envía como Bearer")
  check(seen.at(-1)?.system.includes(`[${productId}] Hamburguesa prueba ${suffix} — Gs 30000`) && seen.at(-1)?.system.includes(`[${zoneId}] Zona WA ${suffix}`), "El prompt lleva la carta y las zonas reales")
  check(sent.at(-1)?.text === "¡Hola! ¿Qué te gustaría pedir?", `Respuesta enviada por WhatsApp: ${JSON.stringify(sent.slice(-2))} llamadas IA ${seen.length}`)
  // Mensaje repetido: no se procesa dos veces.
  const calls = seen.length
  await handleUpsert("public", fakeSock, { type: "notify", messages: [first] })
  await new Promise((resolve) => setTimeout(resolve, 300))
  check(seen.length === calls, "Un mensaje duplicado no vuelve a llamar a la IA")

  // 2) Producto con opción obligatoria sin elegir: el sistema lo rechaza y no lo agrega.
  script = () => ({ content: JSON.stringify({ reply: "Perfecto, la agrego.", actions: [{ type: "add_item", productId, quantity: 2, optionIds: [] }] }) })
  await incoming("Quiero dos hamburguesas")
  check(sent.at(-1)?.text.includes("Elegí correctamente los agregados de Punto"), `Opción obligatoria validada: ${sent.at(-1)?.text}`)
  check(((await db.query("SELECT cart FROM wa_conversations WHERE id = $1", [conversation.id])).rows[0].cart.items ?? []).length === 0, "El carrito no cambia si la opción falta")

  // 3) Con opciones válidas: el resumen usa los precios reales (la IA no los escribe). Un precio inventado no tiene efecto.
  script = () => ({ content: JSON.stringify({ reply: "¡Listo! Te cobro Gs 1.000 nomás 😉", actions: [{ type: "add_item", productId, quantity: 2, optionIds: [990011, 990021], price: 1000 }] }) })
  await incoming("Jugosas y con queso extra")
  check(sent.at(-1)?.text.includes("2 × Hamburguesa prueba") && sent.at(-1)?.text.includes("Gs 70.000"), `Precio real calculado por el sistema: ${sent.at(-1)?.text}`)
  check(seen.at(-1)?.system.includes("CARRITO ACTUAL") , "El prompt incluye el carrito")

  // 4) Confirmar sin modalidad: no se registra nada.
  script = () => ({ content: JSON.stringify({ reply: "¡Pedido confirmado y en cocina!", actions: [{ type: "confirm_order" }] }) })
  await incoming("Confirmo")
  check(sent.at(-1)?.text.includes("Falta elegir si es delivery") && !sent.at(-1)?.text.includes("en cocina"), `Sin modalidad no se registra (y no repite el texto de la IA): ${sent.at(-1)?.text}`)

  // 5) Delivery con dirección y zona → el envío sale de la zona real.
  script = () => ({ content: JSON.stringify({ reply: "Anotado para delivery.", actions: [{ type: "set_order_type", value: "delivery" }, { type: "set_address", address: "Calle Falsa 123, Barrio Prueba" },
    { type: "set_zone", zoneId }, { type: "set_name", name: "Lucía Prueba" }] }) })
  await incoming("Para delivery a Calle Falsa 123, Barrio Prueba. Soy Lucía")
  check(sent.at(-1)?.text.includes(`Envío (Zona WA ${suffix}): Gs 9.000`) && sent.at(-1)?.text.includes("Total: Gs 79.000"), `Envío por zona: ${sent.at(-1)?.text}`)

  // 6) Confirmar: se registra un pedido «Nuevo» pendiente de confirmación, vinculado a la conversación.
  // Pedido completo: un solo resumen y las opciones 1 / 2.
  check(sent.at(-1)?.text.includes("Respondé *1* para confirmar") && (sent.at(-1)?.text.match(/Tu pedido/g) ?? []).length === 1, `Resumen único con opciones: ${sent.at(-1)?.text}`)
  check((await db.query("SELECT cart FROM wa_conversations WHERE id = $1", [conversation.id])).rows[0].cart.awaitingConfirm === true, "Queda esperando 1 o 2")
  script = () => ({ content: JSON.stringify({ reply: "¡Ya está en cocina!", actions: [{ type: "confirm_order" }] }) })
  const aiCalls = seen.length
  await incoming("Sí, confirmo")
  check(seen.length === aiCalls, "«Sí, confirmo» cierra la venta sin pasar por la IA")
  const order = (await db.query("SELECT * FROM service_orders WHERE wa_conversation_id = $1 ORDER BY id DESC LIMIT 1", [conversation.id])).rows[0]
  check(order, "Se registró el pedido")
  created.orders.push(Number(order.id))
  check(order.source === "whatsapp" && order.confirmation === "pending" && order.order_type === "delivery" && Number(order.total) === 70000 && Number(order.delivery_fee) === 9000
    && order.delivery_address.includes("Calle Falsa") && order.customer_name === "Lucía Prueba", `Datos del pedido: ${JSON.stringify(order).slice(0, 300)}`)
  check(sent.at(-1)?.text.includes(`Registramos tu pedido *#${order.id}*`) && !sent.at(-1)?.text.includes("en cocina"), `Confirmación generada por el sistema: ${sent.at(-1)?.text}`)
  check(((await db.query("SELECT cart FROM wa_conversations WHERE id = $1", [conversation.id])).rows[0].cart.items ?? []).length === 0, "Carrito vacío tras registrar")
  check(seen.at(-1) && (await import("../lib/whatsapp/assistant")) && true, "")

  // 7) El local confirma: el cliente recibe el aviso por WhatsApp con el nombre del restaurante y el número.
  const before = sent.length
  await notifyCustomer("public", Number(order.id), "confirmed")
  check(sent.length === before + 1 && sent.at(-1)?.jid === jid && sent.at(-1)?.text.includes(`Pedido #${order.id} confirmado`), `Aviso de estado por WhatsApp: ${sent.at(-1)?.text}`)
  const nextOrderInfo = (await db.query("SELECT 1 FROM wa_messages WHERE conversation_id = $1 AND author = 'system' AND order_id = $2", [conversation.id, order.id])).rows[0]
  check(nextOrderInfo, "El aviso queda en la conversación")

  // 8) La IA ve los estados reales del pedido en el siguiente mensaje.
  script = () => ({ content: JSON.stringify({ reply: "Tu pedido está confirmado.", actions: [] }) })
  await incoming("¿Cómo va mi pedido?")
  check(seen.at(-1)?.system.includes(`#${order.id} (Delivery`) && seen.at(-1)?.system.includes("confirmado"), "Estados reales en el contexto")

  // 8b) Opción 2: cancela el pedido armado sin registrar nada.
  script = () => ({ content: JSON.stringify({ reply: "Anotado.", actions: [{ type: "add_item", productId, quantity: 1, optionIds: [990012] }, { type: "set_order_type", value: "pickup" }] }) })
  await incoming("Una hamburguesa bien cocida para retirar")
  check(sent.at(-1)?.text.includes("Respondé *1* para confirmar"), `Retiro completo pide 1 o 2: ${sent.at(-1)?.text}`)
  const ordersBefore = Number((await db.query("SELECT COUNT(*) AS n FROM service_orders WHERE wa_conversation_id = $1", [conversation.id])).rows[0].n)
  await incoming("2")
  check(sent.at(-1)?.text.includes("cancelé el pedido") && ((await db.query("SELECT cart FROM wa_conversations WHERE id = $1", [conversation.id])).rows[0].cart.items ?? []).length === 0, `Opción 2 cancela: ${sent.at(-1)?.text}`)
  check(Number((await db.query("SELECT COUNT(*) AS n FROM service_orders WHERE wa_conversation_id = $1", [conversation.id])).rows[0].n) === ordersBefore, "Cancelar no registra pedido")

  // 9) Pide una persona: el asistente se pausa en esa conversación.
  script = () => ({ content: JSON.stringify({ reply: "Te paso con una persona del local.", actions: [{ type: "handoff", reason: "Quiere hablar con alguien" }] }) })
  await incoming("Quiero hablar con una persona")
  let state = (await db.query("SELECT bot_enabled, handoff_requested FROM wa_conversations WHERE id = $1", [conversation.id])).rows[0]
  check(state.bot_enabled === false && state.handoff_requested === true, "Derivación a persona")
  const calls2 = seen.length
  await incoming("Hola? sigo esperando")
  check(seen.length === calls2, "Con el asistente pausado no responde la IA")

  // 10) Error de Niro (sin saldo): se deriva al personal y se registra el error.
  await db.query("UPDATE wa_conversations SET bot_enabled = TRUE, handoff_requested = FALSE WHERE id = $1", [conversation.id])
  // La prueba manda muchos mensajes seguidos: se «envejecen» para no activar el freno de ráfagas (10 por minuto).
  await db.query("UPDATE wa_messages SET created_at = created_at - INTERVAL '5 minutes' WHERE conversation_id = $1", [conversation.id])
  script = () => ({ status: 402 })
  await incoming("Hola de nuevo")
  state = (await db.query("SELECT bot_enabled FROM wa_conversations WHERE id = $1", [conversation.id])).rows[0]
  check(state.bot_enabled === false && sent.at(-1)?.text.includes("te atiende una persona"), `Sin créditos: deriva a una persona (bot ${state.bot_enabled}, último: ${sent.at(-1)?.text})`)
  const errors = (await db.query("SELECT COUNT(*) FILTER (WHERE status = 'error') AS e, COUNT(*) FILTER (WHERE status = 'ok') AS ok FROM ai_interactions WHERE conversation_id = $1", [conversation.id])).rows[0]
  check(Number(errors.e) === 1 && Number(errors.ok) >= 6 && JSON.stringify((await db.query("SELECT actions FROM ai_interactions WHERE conversation_id = $1 AND status = 'ok' ORDER BY id DESC LIMIT 1", [conversation.id])).rows[0]?.actions) !== undefined, "Registro de consumo de IA")

  // Freno antirráfagas: con más de 10 mensajes por minuto la IA no responde.
  const calls3 = seen.length
  await db.query("UPDATE wa_conversations SET bot_enabled = TRUE WHERE id = $1", [conversation.id])
  await db.query(`INSERT INTO wa_messages (conversation_id, wa_id, direction, author, author_name, kind, body, status, created_at)
    SELECT $1, $2 || n, 'in', 'customer', 'Cliente Prueba', 'text', 'spam', 'received', NOW() FROM generate_series(1, 11) AS n`, [conversation.id, `SPAM-${suffix}-`])
  await incoming("hola?")
  check(seen.length === calls3, "Ráfaga de mensajes: no se llama a la IA")
  await db.query("UPDATE wa_messages SET created_at = created_at - INTERVAL '2 minutes' WHERE conversation_id = $1", [conversation.id])

  // 10b) JSON con saltos de línea sin escapar dentro del texto: se interpreta igual.
  script = () => ({ content: '{"reply": "Tenemos:\n- Hamburguesas\n- Bebidas", "actions": []}' })
  await incoming("¿Qué tienen?")
  check(sent.at(-1)?.text.includes("- Hamburguesas"), `JSON con saltos de línea: ${sent.at(-1)?.text}`)

  // 10c) Primera respuesta inválida, el reintento la corrige.
  script = (last) => last.includes("no era un JSON válido")
    ? { content: JSON.stringify({ reply: "Perdón, acá va: tenemos hamburguesas.", actions: [] }) }
    : { content: "Tenemos hamburguesas (sin formato)" }
  await incoming("¿Y hamburguesas?")
  check(sent.at(-1)?.text === "Perdón, acá va: tenemos hamburguesas.", `Reintento de formato: ${sent.at(-1)?.text}`)
  await db.query("UPDATE wa_messages SET created_at = created_at - INTERVAL '2 minutes' WHERE conversation_id = $1", [conversation.id])

  // 11) Respuesta no JSON aun después del reintento: no se envía texto sin validar.
  script = () => ({ content: "Claro, la hamburguesa sale Gs 5.000" })
  await incoming("¿Cuánto sale?")
  check(sent.at(-1)?.text.includes("no te entendí bien") && !sent.at(-1)?.text.includes("5.000"), "Una respuesta inválida de la IA no se reenvía")

  // 12) Delivery con ubicación de WhatsApp: la zona se elige por distancia al local y el pedido guarda las coordenadas.
  const company = (await db.query("SELECT data FROM company_config WHERE id = 1")).rows[0]?.data ?? {}
  previousCompany = company
  await db.query("UPDATE company_config SET data = data || $1::jsonb WHERE id = 1", [JSON.stringify({ latitude: "-25.2867", longitude: "-57.6470", serviceModes: { dineIn: true, delivery: true, pickup: true } })])
  const near = await db.query("INSERT INTO delivery_zones (name, areas, fee, max_km) VALUES ($1, '', 7000, 5) RETURNING id", [`Radio WA ${suffix}`])
  created.zones.push(Number(near.rows[0].id))
  const jid2 = `595982${suffix.replace(/\D/g, "3").padEnd(6, "3").slice(0, 6)}@s.whatsapp.net`
  let counter2 = 0
  const send2 = async (message: any) => {
    counter2 += 1
    await handleUpsert("public", fakeSock, { type: "notify", messages: [{ key: { remoteJid: jid2, id: `LOC-${suffix}-${counter2}`, fromMe: false }, pushName: "Cliente Ubicación", messageTimestamp: Math.floor(Date.now() / 1000), message }] })
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  script = () => ({ content: JSON.stringify({ reply: "¡Dale! Pasame tu ubicación 📍", actions: [{ type: "add_item", productId, quantity: 1, optionIds: [990012] }, { type: "set_order_type", value: "delivery" }, { type: "set_name", name: "Cliente Ubicación" }] }) })
  await send2({ conversation: "Quiero una hamburguesa bien cocida por delivery" })
  const conversation2 = (await db.query("SELECT id FROM wa_conversations WHERE jid = $1", [jid2])).rows[0]
  created.conversations.push(Number(conversation2.id))
  script = () => ({ content: JSON.stringify({ reply: "¡Gracias! Ya tengo tu ubicación.", actions: [] }) })
  await send2({ locationMessage: { degreesLatitude: -25.2900, degreesLongitude: -57.6400, name: "Casa", address: "Barrio Jara" } })
  const cart2 = (await db.query("SELECT cart FROM wa_conversations WHERE id = $1", [conversation2.id])).rows[0].cart
  check(cart2.location?.lat === -25.29 && cart2.zoneId === Number(near.rows[0].id), `Ubicación y zona por distancia: ${JSON.stringify(cart2)}`)
  check(seen.at(-1)?.system.includes("UBICACIÓN DEL CLIENTE: compartida") && seen.at(-1)?.system.includes(`zona [${near.rows[0].id}]`), "La IA ve la ubicación y la zona")
  check(sent.at(-1)?.text.includes(`Envío (Radio WA ${suffix}): Gs 7.000`) && sent.at(-1)?.text.includes("ubicación compartida"), `Resumen con envío por distancia: ${sent.at(-1)?.text}`)
  script = () => ({ content: JSON.stringify({ reply: "Listo", actions: [{ type: "confirm_order" }] }) })
  await send2({ conversation: "Confirmo" })
  const order2 = (await db.query("SELECT * FROM service_orders WHERE wa_conversation_id = $1 ORDER BY id DESC LIMIT 1", [conversation2.id])).rows[0]
  check(order2, "Pedido con ubicación")
  created.orders.push(Number(order2.id))
  check(Number(order2.delivery_lat) === -25.29 && Number(order2.delivery_lng) === -57.64 && Number(order2.delivery_fee) === 7000, `Coordenadas en el pedido: ${order2.delivery_lat},${order2.delivery_lng}`)
  // Ubicación lejana: fuera de zona.
  script = () => ({ content: JSON.stringify({ reply: "Veamos.", actions: [{ type: "add_item", productId, quantity: 1, optionIds: [990011] }, { type: "set_order_type", value: "delivery" }] }) })
  await send2({ conversation: "Otra para delivery" })
  script = () => ({ content: JSON.stringify({ reply: "Recibido.", actions: [] }) })
  await send2({ locationMessage: { degreesLatitude: -25.7000, degreesLongitude: -57.6400 } })
  check(sent.at(-1)?.text.includes("fuera de nuestras zonas de delivery"), `Fuera de zona: ${sent.at(-1)?.text}`)

  console.log("OK: WhatsApp + Niro: contexto real, sin duplicados, opciones y precios validados, delivery por zona y por ubicación, pedido pendiente, avisos de estado, derivación y errores")
} finally {
  for (const id of created.orders) { await db.query("DELETE FROM kitchen_tickets WHERE order_id = $1", [id]); await db.query("DELETE FROM service_orders WHERE id = $1", [id]) }
  if (previousCompany) await db.query("UPDATE company_config SET data = $1::jsonb WHERE id = 1", [JSON.stringify(previousCompany)])
  if (previousAiEnabled !== null) await db.query("UPDATE ai_settings SET enabled = $1 WHERE id = 1", [previousAiEnabled])
  for (const id of created.conversations) { await db.query("DELETE FROM ai_interactions WHERE conversation_id = $1", [id]); await db.query("DELETE FROM wa_conversations WHERE id = $1", [id]) }
  await db.query("DELETE FROM customers WHERE name IN ('Lucía Prueba', 'Cliente Ubicación')")
  if (created.zones.length) await db.query("DELETE FROM delivery_zones WHERE id = ANY($1::bigint[])", [created.zones])
  if (created.products.length) await db.query("DELETE FROM products WHERE id = ANY($1::bigint[])", [created.products])
  await db.query("DELETE FROM ai_interactions WHERE conversation_id IS NULL AND created_at > NOW() - INTERVAL '10 minutes' AND model = 'niro-test'")
  await db.end()
  niro.close()
  const { authDb } = await import("../lib/db")
  await authDb.end().catch(() => undefined)
}
