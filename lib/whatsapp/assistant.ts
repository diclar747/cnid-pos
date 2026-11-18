import "server-only"

import type { PoolClient } from "pg"
import { authDb, schemaQuery, type SchemaQuery } from "../db"
import { NiroError, niroChat, type ChatMessage } from "../niro"
import { ticketLabel, typeLabel } from "../order-labels"
import { deliveryFeeFor, loadOrder, logOrderEvent, makeOrderLines, saveOrderItems, ServiceOrderError, upsertCustomer } from "../service-order-server"
import type { OrderLine, ServiceOrderType } from "../service-order-types"
import { notifyStaff } from "../web-push"
import { sendText } from "./session"

// Asistente de pedidos por WhatsApp con Niro IA.
// La IA conversa y propone acciones; el servidor valida cada acción contra la carta, las opciones y las zonas reales,
// calcula precios y totales, y registra el pedido. La IA nunca fija precios, confirma pagos ni cambia estados.

export type CartItem = { productId: number; quantity: number; optionIds: number[]; note: string }
export type Cart = { items: CartItem[]; orderType?: ServiceOrderType; address?: string; zoneId?: number | null; name?: string; notes?: string }
type Action = { type: string; [key: string]: unknown }
type Product = { id: number; name: string; category: string; price: number; description: string; modifierGroups: any[]; pricesByOrderType?: Record<string, number> }

const money = (value: number) => `Gs ${value.toLocaleString("es-PY")}`
const MAX_HISTORY = 14

async function withSchema<T>(schema: string, work: (client: PoolClient) => Promise<T>, commit = false): Promise<T> {
  const client = await authDb.connect()
  try {
    await client.query("BEGIN")
    await client.query(`SET LOCAL search_path TO "${schema}"`)
    const result = await work(client)
    await client.query(commit ? "COMMIT" : "ROLLBACK")
    return result
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally { client.release() }
}

/** Opciones elegidas (ids de opción) → formato del sistema { groupId, optionId }. */
function modifiersFor(product: Product | undefined, optionIds: number[]) {
  const selected: { groupId: number; optionId: number }[] = []
  for (const optionId of optionIds) {
    const group = product?.modifierGroups?.find((entry: any) => entry.options?.some((option: any) => option.legacyId === optionId))
    if (!group) throw new ServiceOrderError(`La opción ${optionId} no corresponde a ${product?.name ?? "ese producto"}.`)
    selected.push({ groupId: group.legacyId, optionId })
  }
  return selected
}

/** Precios reales del carrito: usa la misma validación que el POS (opciones obligatorias, disponibilidad, precio por modalidad). */
export async function priceCart(schema: string, cart: Cart, products: Map<number, Product>) {
  const orderType = cart.orderType ?? "pickup"
  return withSchema(schema, async (client) => {
    const lines: OrderLine[] = cart.items.length ? await makeOrderLines(client, cart.items.map((item) => ({ id: item.productId, quantity: item.quantity,
      selectedModifiers: modifiersFor(products.get(item.productId), item.optionIds) })), orderType) : []
    const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
    const zone = orderType === "delivery" && cart.zoneId ? await deliveryFeeFor(client, cart.zoneId, subtotal).catch(() => null) : null
    return { lines, subtotal, zone, deliveryFee: zone?.fee ?? 0, total: subtotal + (zone?.fee ?? 0) }
  })
}

export function cartSummary(priced: Awaited<ReturnType<typeof priceCart>>, cart: Cart) {
  if (!priced.lines.length) return ""
  const rows = priced.lines.map((line, index) => {
    const extras = line.modifiers.map((modifier) => modifier.name).join(", ")
    const note = cart.items[index]?.note
    return `• ${line.quantity} × ${line.productName}${extras ? ` (${extras})` : ""}${note ? ` — ${note}` : ""}: ${money(line.subtotal)}`
  })
  const parts = ["*Tu pedido:*", ...rows, `Subtotal: ${money(priced.subtotal)}`]
  if (cart.orderType === "delivery") parts.push(priced.zone ? `Envío (${priced.zone.name}): ${priced.deliveryFee ? money(priced.deliveryFee) : "gratis"}` : "Envío: a confirmar según la zona")
  parts.push(`*Total: ${money(priced.total)}*`)
  if (cart.orderType) parts.push(`Modalidad: ${typeLabel[cart.orderType]}${cart.orderType === "delivery" && cart.address ? ` · ${cart.address}` : ""}`)
  return parts.join("\n")
}

function menuText(products: Product[]) {
  const byCategory = new Map<string, Product[]>()
  for (const product of products) byCategory.set(product.category || "Otros", [...(byCategory.get(product.category || "Otros") ?? []), product])
  const lines: string[] = []
  for (const [category, items] of byCategory) {
    lines.push(`## ${category}`)
    for (const product of items) {
      const groups = (product.modifierGroups ?? []).map((group: any) => `${group.name}${group.required ? "*" : ""}${group.multiple ? " (varias)" : ""}: ${(group.options ?? [])
        .map((option: any) => `[${option.legacyId}] ${option.name}${option.price ? ` +${option.price}` : ""}`).join(", ")}`).join(" | ")
      const delivery = product.pricesByOrderType?.delivery && product.pricesByOrderType.delivery !== product.price ? ` (delivery Gs ${product.pricesByOrderType.delivery})` : ""
      lines.push(`[${product.id}] ${product.name} — Gs ${product.price}${delivery}${product.description ? ` · ${product.description.slice(0, 70)}` : ""}${groups ? ` · Opciones: ${groups}` : ""}`)
    }
  }
  return lines.join("\n")
}

function extractJson(content: string): { reply?: unknown; actions?: unknown } | null {
  const cleaned = content.replace(/```(?:json)?/gi, "").trim()
  const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { return null }
}

async function loadContext(schema: string, query: SchemaQuery, conversationId: number) {
  const conversation = (await query("SELECT * FROM wa_conversations WHERE id = $1", [conversationId])).rows[0]
  if (!conversation) throw new Error("Conversación inexistente.")
  const [settings, company, restaurant, zones, productRows, history, orders] = await Promise.all([
    query("SELECT * FROM ai_settings WHERE id = 1").then((result) => result.rows[0] ?? {}),
    query("SELECT data FROM company_config WHERE id = 1").then((result) => result.rows[0]?.data ?? {}),
    authDb.query("SELECT name FROM public.restaurants WHERE schema_name = $1", [schema]).then((result) => result.rows[0]?.name ?? "el restaurante"),
    query("SELECT id, name, areas, fee, free_over, eta_minutes FROM delivery_zones WHERE is_active ORDER BY sort_order, name"),
    query("SELECT id, data FROM products WHERE COALESCE((data->>'isActive')::boolean, TRUE) ORDER BY data->>'category', data->>'name'"),
    query(`SELECT author, body FROM (SELECT author, body, created_at, id FROM wa_messages WHERE conversation_id = $1 ORDER BY created_at DESC, id DESC LIMIT ${MAX_HISTORY}) recent ORDER BY created_at, id`, [conversationId]),
    query(`SELECT o.id, o.status, o.confirmation, o.order_type, o.total, o.delivery_fee, o.created_at,
        (SELECT string_agg(t.status, ',' ORDER BY t.id) FROM kitchen_tickets t WHERE t.order_id = o.id) AS tickets
      FROM service_orders o WHERE (o.wa_conversation_id = $1 OR ($2 <> '' AND regexp_replace(o.customer_phone, '\\D', '', 'g') = $2))
        AND (o.status = 'open' OR o.updated_at > NOW() - INTERVAL '1 day') ORDER BY o.id DESC LIMIT 5`, [conversationId, conversation.phone ?? ""]),
  ])
  const products: Product[] = productRows.rows.map((row) => ({ ...row.data, id: Number(row.id) }))
    .filter((product: any) => product.trackStock === false || Number(product.stock) > 0)
    .map((product: any) => ({ id: product.id, name: product.name, category: product.category ?? "", price: Number(product.price), description: product.description ?? "",
      modifierGroups: product.modifierGroups ?? [], pricesByOrderType: product.pricesByOrderType }))
  return { conversation, settings, company, restaurant: String(restaurant), zones: zones.rows, products, history: history.rows, orders: orders.rows }
}

function orderStatusText(order: any) {
  if (order.status === "cancelled" || order.confirmation === "rejected") return "cancelado"
  if (order.confirmation === "pending") return "recibido, esperando que el local lo confirme"
  if (order.status === "paid" && !order.tickets) return "cobrado"
  const tickets = String(order.tickets ?? "").split(",").filter(Boolean)
  if (!tickets.length) return "confirmado, todavía no enviado a cocina"
  return tickets.map((status) => ticketLabel[status] ?? status).join(" / ")
}

function systemPrompt(ctx: Awaited<ReturnType<typeof loadContext>>, cartText: string) {
  const company = ctx.company ?? {}
  const modes = company.serviceModes ?? { dineIn: true, delivery: true, pickup: true }
  const hours = Array.isArray(company.openingHours) ? company.openingHours.map((day: any) => `${day.day}: ${day.closed ? "cerrado" : `${day.open} a ${day.close}`}`).join("; ") : ""
  const zones = ctx.zones.map((zone: any) => `[${zone.id}] ${zone.name}${zone.areas ? ` (${zone.areas})` : ""}: envío Gs ${zone.fee}${zone.free_over != null ? `, gratis desde Gs ${zone.free_over}` : ""}${zone.eta_minutes ? `, ~${zone.eta_minutes} min` : ""}`).join("\n")
  const orders = ctx.orders.map((order: any) => `#${order.id} (${typeLabel[order.order_type] ?? order.order_type}, ${new Date(order.created_at).toLocaleString("es-PY", { timeZone: "America/Asuncion" })}): ${orderStatusText(order)} · total Gs ${Number(order.total) + Number(order.delivery_fee ?? 0)}`).join("\n")
  return [
    `Sos el asistente virtual de WhatsApp de "${ctx.restaurant}". Atendés con amabilidad y mensajes breves (máximo 6 líneas), en español de Paraguay, con algún emoji ocasional.`,
    "Tu trabajo: saludar, mostrar la carta, recomendar, tomar el pedido (productos, cantidades y opciones), preguntar la modalidad (delivery, retiro o en el local), pedir dirección y zona para delivery y el nombre del cliente, mostrar el resumen y pedir confirmación.",
    "",
    "REGLAS ESTRICTAS",
    "- Usá SOLO los productos, precios, opciones y zonas de los datos de abajo. Nunca inventes productos, precios, promociones, tiempos ni costos de envío.",
    "- No escribas subtotales ni totales: el sistema agrega solo el resumen con los precios reales.",
    "- Nunca digas que un pedido está confirmado, en cocina, listo o entregado salvo que figure así en PEDIDOS DEL CLIENTE.",
    "- Usá confirm_order únicamente cuando el cliente confirmó explícitamente el pedido después de ver el resumen, y ya están la modalidad, el nombre y, para delivery, la dirección y la zona.",
    "- No confirmes pagos ni transferencias: el local los verifica.",
    "- Si un producto tiene opciones obligatorias (marcadas con *), preguntá cuál prefiere antes de agregarlo. Usá los números entre corchetes como ids.",
    "- Para delivery elegí la zona según el barrio o ciudad; si no coincide con ninguna, decí que no llegamos y ofrecé retiro.",
    "- Si el cliente pide hablar con una persona, tiene un reclamo o no podés resolverlo, usá handoff.",
    "",
    'RESPONDÉ SOLO con un objeto JSON válido, sin texto antes ni después: {"reply": "mensaje para el cliente", "actions": []}',
    "Acciones posibles (podés usar varias):",
    '{"type":"add_item","productId":123,"quantity":1,"optionIds":[45],"note":"sin cebolla"}',
    '{"type":"remove_item","productId":123}',
    '{"type":"set_quantity","productId":123,"quantity":2}',
    '{"type":"clear_cart"}',
    '{"type":"set_order_type","value":"delivery" | "pickup" | "dineIn"}',
    '{"type":"set_address","address":"Calle y número, barrio"}',
    '{"type":"set_zone","zoneId":3}',
    '{"type":"set_name","name":"Nombre del cliente"}',
    '{"type":"set_notes","notes":"Observaciones generales"}',
    '{"type":"confirm_order"}',
    '{"type":"handoff","reason":"motivo"}',
    "",
    "DATOS DEL LOCAL",
    `Nombre: ${ctx.restaurant}${company.description ? `\nDescripción: ${company.description}` : ""}${company.address ? `\nDirección: ${company.address}${company.city ? `, ${company.city}` : ""}` : ""}${company.phone ? `\nTeléfono: ${company.phone}` : ""}`,
    `Modalidades: ${[modes.delivery && "delivery", modes.pickup && "retiro en el local", modes.dineIn && "consumo en el local"].filter(Boolean).join(", ") || "consultar"}`,
    hours ? `Horarios: ${hours}` : "",
    company.mapsUrl ? `Ubicación: ${company.mapsUrl}` : "",
    "",
    "ZONAS DE DELIVERY",
    zones || "(sin zonas configuradas: no ofrezcas delivery)",
    "",
    "CARTA (precios en guaraníes)",
    menuText(ctx.products) || "(sin productos disponibles)",
    "",
    "CARRITO ACTUAL (calculado por el sistema)",
    cartText || "(vacío)",
    "",
    "PEDIDOS DEL CLIENTE (estados reales del sistema)",
    orders || "(ninguno)",
    ctx.conversation.name ? `\nNombre en WhatsApp: ${ctx.conversation.name}` : "",
    ctx.settings.greeting ? `\nSALUDO DEL LOCAL (usalo en el primer mensaje): ${ctx.settings.greeting}` : "",
    ctx.settings.instructions ? `\nINSTRUCCIONES DEL RESTAURANTE:\n${ctx.settings.instructions}` : "",
  ].filter((line) => line !== null).join("\n")
}

/** Aplica las acciones propuestas validando cada una. Devuelve el nuevo carrito y los avisos para el cliente. */
function applyActions(cart: Cart, actions: Action[], ctx: Awaited<ReturnType<typeof loadContext>>) {
  const products = new Map(ctx.products.map((product) => [product.id, product]))
  const notes: string[] = []
  const next: Cart = { ...cart, items: cart.items.map((item) => ({ ...item })) }
  let confirm = false, handoff: string | null = null, changed = false
  for (const action of actions.slice(0, 20)) {
    const productId = Number(action.productId)
    switch (action.type) {
      case "add_item": {
        const product = products.get(productId)
        const quantity = Math.min(30, Math.max(1, Math.round(Number(action.quantity) || 1)))
        if (!product) { notes.push("Uno de los productos no está disponible en este momento."); break }
        const optionIds = Array.isArray(action.optionIds) ? action.optionIds.map(Number).filter(Number.isSafeInteger).slice(0, 12) : []
        const note = typeof action.note === "string" ? action.note.trim().slice(0, 120) : ""
        const same = next.items.find((item) => item.productId === productId && item.note === note && item.optionIds.join() === [...optionIds].sort((a, b) => a - b).join())
        if (same) same.quantity = Math.min(30, same.quantity + quantity)
        else next.items.push({ productId, quantity, optionIds: optionIds.sort((a, b) => a - b), note })
        changed = true
        break
      }
      case "remove_item": next.items = next.items.filter((item) => item.productId !== productId); changed = true; break
      case "set_quantity": {
        const quantity = Math.round(Number(action.quantity))
        const items = next.items.filter((item) => item.productId === productId)
        if (!items.length) break
        if (!Number.isSafeInteger(quantity) || quantity <= 0) next.items = next.items.filter((item) => item.productId !== productId)
        else { items[0].quantity = Math.min(30, quantity); next.items = next.items.filter((item) => item.productId !== productId || item === items[0]) }
        changed = true
        break
      }
      case "clear_cart": next.items = []; changed = true; break
      case "set_order_type": {
        const modes = ctx.company?.serviceModes ?? { dineIn: true, delivery: true, pickup: true }
        const value = action.value === "delivery" || action.value === "pickup" || action.value === "dineIn" ? action.value : null
        if (value && modes[value] !== false) { next.orderType = value; changed = true }
        else if (value) notes.push(`Por ahora no ofrecemos ${typeLabel[value].toLowerCase()}.`)
        break
      }
      case "set_address": if (typeof action.address === "string" && action.address.trim()) { next.address = action.address.trim().slice(0, 300); changed = true } break
      case "set_zone": {
        const zone = ctx.zones.find((entry: any) => Number(entry.id) === Number(action.zoneId))
        if (zone) { next.zoneId = Number(zone.id); changed = true } else notes.push("No encontramos esa zona de delivery.")
        break
      }
      case "set_name": if (typeof action.name === "string" && action.name.trim()) next.name = action.name.trim().slice(0, 80); break
      case "set_notes": if (typeof action.notes === "string") next.notes = action.notes.trim().slice(0, 300); break
      case "confirm_order": confirm = true; break
      case "handoff": handoff = typeof action.reason === "string" ? action.reason.slice(0, 200) : "El cliente pidió hablar con una persona"; break
    }
  }
  return { cart: next, notes, confirm, handoff, changed }
}

async function createOrder(schema: string, conversation: any, cart: Cart, products: Map<number, Product>) {
  if (!cart.items.length) throw new ServiceOrderError("Tu pedido está vacío.")
  if (!cart.orderType) throw new ServiceOrderError("Falta elegir si es delivery, retiro o en el local.")
  if (cart.orderType === "delivery" && (!cart.address || !cart.zoneId)) throw new ServiceOrderError("Para delivery necesito la dirección y la zona.")
  const name = (cart.name || conversation.name || "Cliente WhatsApp").slice(0, 120)
  return withSchema(schema, async (client) => {
    const customerId = await upsertCustomer(client, { name, phone: conversation.phone, address: cart.orderType === "delivery" ? cart.address : undefined })
    const zone = cart.orderType === "delivery" ? await deliveryFeeFor(client, cart.zoneId ?? null, 0) : null
    const inserted = await client.query(`INSERT INTO service_orders (order_type, customer_name, customer_phone, notes, source, confirmation, customer_id,
        delivery_zone_id, delivery_zone_name, delivery_address, wa_conversation_id)
      VALUES ($1,$2,$3,$4,'whatsapp','pending',$5,$6,$7,$8,$9) RETURNING id`,
      [cart.orderType, name, conversation.phone ?? "", cart.notes ?? "", customerId, zone?.id ?? null, zone?.name ?? "", cart.orderType === "delivery" ? cart.address : "", conversation.id])
    let order = await loadOrder(client, Number(inserted.rows[0].id), true)
    const lines = await makeOrderLines(client, cart.items.map((item) => ({ id: item.productId, quantity: item.quantity, selectedModifiers: modifiersFor(products.get(item.productId), item.optionIds) })), cart.orderType!)
    lines.forEach((line, index) => { const note = cart.items[index]?.note; if (note) line.productName = `${line.productName} (${note})` })
    order = await saveOrderItems(client, order, lines)
    const actor = { id: 0, name: "Asistente WhatsApp" }
    await logOrderEvent(client, order.id, "created", { status: cart.orderType, note: "Pedido por WhatsApp (asistente Niro)", actor })
    await logOrderEvent(client, order.id, "items_added", { note: lines.map((line) => `${line.quantity} × ${line.productName}`).join(", "), actor })
    await client.query("UPDATE wa_conversations SET cart = '{}'::jsonb, customer_id = COALESCE(customer_id, $2), updated_at = NOW() WHERE id = $1", [conversation.id, customerId])
    return order
  }, true)
}

export type AssistantResult = { replies: string[]; orderId: number | null; handoff: boolean; error: string | null }

/** Responde al último mensaje de la conversación. En modo «simulator» no envía WhatsApp ni registra pedidos. */
export async function runAssistant(schema: string, conversationId: number, options: { mode: "live" | "simulator" }): Promise<AssistantResult> {
  const query = await schemaQuery(schema)
  const ctx = await loadContext(schema, query, conversationId)
  const products = new Map(ctx.products.map((product) => [product.id, product]))
  const cart: Cart = { items: [], ...(ctx.conversation.cart ?? {}) }
  cart.items = Array.isArray(cart.items) ? cart.items : []
  const replies: string[] = []
  const send = async (text: string, orderId: number | null = null) => {
    replies.push(text)
    await sendText(schema, conversationId, text, { author: "bot", authorName: "Asistente", orderId })
  }
  // Freno ante ráfagas: más de 10 mensajes por minuto no se responden con IA.
  const burst = Number((await query(`SELECT COUNT(*) AS n FROM wa_messages WHERE conversation_id = $1 AND direction = 'in' AND created_at > NOW() - INTERVAL '1 minute'`, [conversationId])).rows[0].n)
  if (burst > 10 && options.mode === "live") return { replies, orderId: null, handoff: false, error: "rate_limited" }

  let priced = await priceCart(schema, cart, products).catch(() => null)
  const chat: ChatMessage[] = [{ role: "system", content: systemPrompt(ctx, priced ? cartSummary(priced, cart) : "") },
    ...ctx.history.map((row: any) => ({ role: row.author === "customer" ? "user" as const : "assistant" as const, content: String(row.body).slice(0, 1500) }))]
  const started = Date.now()
  let result
  try { result = await niroChat(chat) }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await query(`INSERT INTO ai_interactions (conversation_id, kind, status, latency_ms, error) VALUES ($1, $2, 'error', $3, $4)`,
      [conversationId, options.mode === "simulator" ? "simulator" : "chat", Date.now() - started, message.slice(0, 300)])
    if (options.mode === "live") {
      await query("UPDATE wa_conversations SET bot_enabled = FALSE, handoff_requested = TRUE, updated_at = NOW() WHERE id = $1", [conversationId])
      await send("Gracias por escribirnos 🙌 En un momento te atiende una persona del local.")
      void notifyStaff(query, { title: "WhatsApp: el asistente no pudo responder", body: `${ctx.conversation.name || ctx.conversation.phone}: ${message}`.slice(0, 160), url: `/admin/whatsapp?c=${conversationId}` })
    }
    return { replies, orderId: null, handoff: true, error: error instanceof NiroError ? message : "Niro IA no respondió." }
  }
  const parsed = extractJson(result.content)
  const actions: Action[] = Array.isArray(parsed?.actions) ? (parsed!.actions as unknown[]).filter((item): item is Action => Boolean(item) && typeof (item as Action).type === "string") : []
  let reply = typeof parsed?.reply === "string" ? parsed.reply.trim().slice(0, 1500) : ""
  if (!parsed) reply = "Disculpá, no te entendí bien. ¿Me lo podés escribir de otra forma? 🙏"
  const applied = applyActions(cart, actions, ctx)
  let orderId: number | null = null
  const extra: string[] = [...applied.notes]
  // Validar el carrito con precios reales: si algo no se puede (opción obligatoria, sin stock), se descarta ese cambio.
  const repriced = await priceCart(schema, applied.cart, products).catch((error) => error as Error)
  let finalCart = applied.cart
  if (repriced instanceof Error) {
    extra.push(repriced instanceof ServiceOrderError ? repriced.message : "No pude agregar ese producto.")
    finalCart = cart
  } else priced = repriced

  if (applied.confirm && !(repriced instanceof Error)) {
    // El texto de confirmación lo arma el sistema según el resultado real, no la IA.
    reply = ""
    if (options.mode === "simulator") {
      extra.push("🧪 (Prueba) Acá se registraría el pedido como pendiente de confirmación y se vaciaría el carrito.")
      finalCart = { items: [] }
    } else {
      try {
        const order = await createOrder(schema, ctx.conversation, finalCart, products)
        orderId = order.id
        finalCart = { items: [] }
        reply = `✅ ¡Listo! Registramos tu pedido *#${order.id}*.`
        extra.push(cartSummary(priced!, applied.cart), "El local lo va a confirmar en breve y te avisamos por acá cada novedad.")
        void notifyStaff(query, { title: `Nuevo pedido por WhatsApp #${order.id}`, body: `${order.customerName} · ${typeLabel[order.orderType]} · Gs ${order.grandTotal.toLocaleString("es-PY")}`, url: "/crm", tag: `wa-order-${order.id}` })
      } catch (error) {
        extra.push(error instanceof ServiceOrderError ? error.message : "No pude registrar el pedido; te atiende una persona del local.")
      }
    }
  } else if (applied.changed && priced && priced.lines.length) extra.push(cartSummary(priced, finalCart))

  if (applied.handoff && options.mode === "live") {
    await query("UPDATE wa_conversations SET bot_enabled = FALSE, handoff_requested = TRUE, updated_at = NOW() WHERE id = $1", [conversationId])
    void notifyStaff(query, { title: `WhatsApp: ${ctx.conversation.name || "un cliente"} pide una persona`, body: applied.handoff, url: `/admin/whatsapp?c=${conversationId}` })
  }
  await query("UPDATE wa_conversations SET cart = $2::jsonb, updated_at = NOW() WHERE id = $1", [conversationId, JSON.stringify(finalCart)])
  await query(`INSERT INTO ai_interactions (conversation_id, kind, status, model, prompt_tokens, completion_tokens, latency_ms, actions)
    VALUES ($1, $2, 'ok', $3, $4, $5, $6, $7::jsonb)`, [conversationId, options.mode === "simulator" ? "simulator" : "chat", result.model.slice(0, 80),
    result.promptTokens, result.completionTokens, result.latencyMs, JSON.stringify(actions.slice(0, 20))])
  const text = [reply, ...extra].filter(Boolean).join("\n\n")
  if (text) await send(text, orderId)
  return { replies, orderId, handoff: Boolean(applied.handoff), error: null }
}
