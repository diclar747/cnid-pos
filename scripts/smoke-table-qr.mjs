// Prueba del QR de mesa: pedido del cliente, estado en vivo, llamar al mozo / pedir la cuenta,
// atención del personal y suscripción a avisos push.
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000) y la base de De la Casa.
// Crea una mesa, un producto y cuentas temporales, y los elimina al terminar.
import fs from "node:fs/promises"
import { createECDH, randomBytes, scryptSync } from "node:crypto"
import pg from "pg"

const origin = process.env.POS_ORIGIN ?? "http://127.0.0.1:3000"
const env = await fs.readFile(".env.local", "utf8").catch(() => "")
const db = new pg.Client({ connectionString: process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() })
await db.connect()

const check = (condition, message) => { if (!condition) throw new Error(message) }
const session = () => {
  let cookie = ""
  return async (path, method = "GET", body, headers = {}) => {
    const response = await fetch(origin + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined })
    const token = response.headers.get("set-cookie")?.split(";")[0]
    if (token) cookie = token
    return { status: response.status, body: await response.json().catch(() => ({})) }
  }
}
const hash = (password) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}` }
const suffix = randomBytes(4).toString("hex")
const code = `CNID-TABLE-${randomBytes(12).toString("hex").toUpperCase()}`
// Cada corrida usa otra IP simulada para no chocar con el límite de llamados de corridas anteriores.
const guestHeaders = { "x-forwarded-for": `10.${randomBytes(1)[0]}.${randomBytes(1)[0]}.${randomBytes(1)[0]}` }
const created = { users: [], products: [], rooms: [], tables: [], orders: [] }
const fakeSubscription = (endpoint) => {
  const browser = createECDH("prime256v1"); browser.generateKeys()
  return { endpoint, keys: { p256dh: browser.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } }
}

try {
  const perms = ["access_pos", "take_orders", "manage_sales", "manage_products"]
  const user = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id)
    VALUES ($1,$2,'Mozo QR prueba','admin',$3,$4,1) RETURNING id`, [`qr-${suffix}@prueba.test`, `qr_${suffix}`, perms, hash("Prueba-2026!")])
  created.users.push(Number(user.rows[0].id))
  const staff = session(), guest = session(), anonymous = session()
  check((await staff("/api/auth/login", "POST", { email: `qr-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login personal")

  const room = await db.query("INSERT INTO dining_rooms (name) VALUES ($1) RETURNING id", [`Salón QR ${suffix}`])
  created.rooms.push(Number(room.rows[0].id))
  const table = await db.query("INSERT INTO dining_tables (room_id, label, seats, shape, code) VALUES ($1,$2,4,'square',$3) RETURNING id", [room.rows[0].id, `Mesa QR ${suffix}`, code])
  created.tables.push(Number(table.rows[0].id))
  await db.query("INSERT INTO public.table_directory (code, restaurant_id) VALUES ($1, 1)", [code])
  const product = await staff("/api/data/products", "POST", { name: `Plato QR ${suffix}`, price: 30000, category: "Pruebas", image: "", stock: 0, trackStock: false, barcode: `QR-${suffix}`, description: "", isActive: true })
  check(product.status === 201, `Producto: ${product.status}`)
  created.products.push(product.body.item.id)

  // Mesa libre: menú, sin cuenta ni llamados; manifiesto de la app instalable.
  let menu = await guest(`/api/table/${code}`)
  check(menu.status === 200 && menu.body.order === null && Array.isArray(menu.body.calls) && menu.body.calls.length === 0, `Menú: ${menu.status}`)
  const manifest = await fetch(`${origin}/api/table/${code}/manifest`)
  const manifestBody = await manifest.json()
  check(manifest.ok && manifest.headers.get("content-type")?.includes("manifest") && manifestBody.start_url === `/table/${code}` && manifestBody.name.includes(`Mesa QR ${suffix}`), "Manifiesto de la mesa")
  check((await fetch(`${origin}/api/table/CNID-TABLE-000000000000000000000000/manifest`)).status === 404, "Manifiesto de mesa inexistente")

  // Avisos: sin pedido no se puede suscribir; endpoints que no son de un servicio push se rechazan.
  check((await guest(`/api/table/${code}/push`, "POST", { subscription: fakeSubscription("https://fcm.googleapis.com/fcm/send/prueba") }, guestHeaders)).status === 409, "Push sin pedido")
  check((await guest(`/api/table/${code}/push`, "POST", { subscription: fakeSubscription("https://127.0.0.1/interno") }, guestHeaders)).status === 400, "Push a dirección interna")

  // Pedido desde el QR: queda «por aceptar» (sin comanda) y el personal recibe el aviso.
  const placed = await guest(`/api/table/${code}`, "POST", { requestId: crypto.randomUUID(), customerName: "Cliente QR", notes: "", items: [{ id: product.body.item.id, quantity: 2, selectedModifiers: [] }] })
  check(placed.status === 201 && placed.body.pendingApproval === true && placed.body.ticketId === null, `Pedido QR por aceptar: ${placed.status} ${JSON.stringify(placed.body)}`)
  created.orders.push(placed.body.orderId)
  menu = await guest(`/api/table/${code}`)
  check(menu.body.order?.items.every((item) => item.ticketId === null) && menu.body.order.tickets.length === 0, "El cliente lo ve esperando que lo acepten")
  let alerts = (await staff("/api/table-calls")).body.items
  check(alerts.some((call) => call.kind === "order" && call.orderId === placed.body.orderId && call.note.includes("2 productos")), `Aviso «por aceptar» al personal: ${JSON.stringify(alerts)}`)
  // Pedido puntual: servilletas.
  check((await guest(`/api/table/${code}/call`, "POST", { kind: "request", note: "Servilletas" }, guestHeaders)).status === 201, "Pedir servilletas")
  alerts = (await staff("/api/table-calls")).body.items
  check(alerts.some((call) => call.kind === "request" && call.note === "Servilletas"), "El personal ve qué pidió la mesa")
  const napkins = alerts.find((call) => call.kind === "request" && call.note === "Servilletas")
  check((await staff(`/api/table-calls/${napkins.id}`, "PATCH")).status === 200, "Servilletas llevadas")
  // El personal acepta: se crea la comanda y se cierra el aviso.
  const accepted = await staff(`/api/service-orders/${placed.body.orderId}`, "PATCH", { action: "send" })
  check(accepted.status === 200 && accepted.body.ticket?.id, `Aceptar el pedido: ${accepted.status} ${JSON.stringify(accepted.body).slice(0, 200)}`)
  check(!(await staff("/api/table-calls")).body.items.some((call) => call.kind === "order" && call.orderId === placed.body.orderId), "El aviso se cierra al aceptar")
  const sent = { body: { orderId: placed.body.orderId, ticketId: accepted.body.ticket.id } }
  menu = await guest(`/api/table/${code}`)
  check(menu.body.order?.id === sent.body.orderId && menu.body.order.tickets.length === 1 && menu.body.order.tickets[0].status === "pending", "Estado inicial del pedido")
  check(menu.body.order.items.every((item) => item.ticketId === sent.body.ticketId), "Ítems vinculados al ticket")

  // Con pedido, el cliente activa avisos (el envío de prueba al servicio push puede fallar: es una suscripción falsa).
  const push = await guest(`/api/table/${code}/push`, "POST", { subscription: fakeSubscription(`https://fcm.googleapis.com/fcm/send/prueba-${suffix}`) }, guestHeaders)
  check(push.status === 200, `Push con pedido: ${push.status} ${JSON.stringify(push.body)}`)

  // La cocina acepta: el cliente lo ve en el estado en vivo.
  check((await staff(`/api/kitchen-tickets/${sent.body.ticketId}`, "PATCH", { status: "preparing" })).status === 200, "Cocina acepta")
  menu = await guest(`/api/table/${code}`)
  check(menu.body.order.tickets[0].status === "preparing", "Estado en preparación visible para el cliente")

  // Llamar al mozo: un solo llamado abierto aunque se toque varias veces.
  const call = await guest(`/api/table/${code}/call`, "POST", { kind: "waiter" }, guestHeaders)
  check(call.status === 201 || call.status === 200, `Llamar al mozo: ${call.status} ${JSON.stringify(call.body)}`)
  const again = await guest(`/api/table/${code}/call`, "POST", { kind: "waiter" }, guestHeaders)
  check(again.body.call?.repeated === true, "El segundo llamado no duplica")
  check((await guest(`/api/table/${code}/call`, "POST", { kind: "otro" }, guestHeaders)).status === 400, "Tipo de llamado inválido")
  check((await guest(`/api/table/${code}/call`, "POST", { kind: "bill" }, guestHeaders)).status < 300, "Pedir la cuenta")
  menu = await guest(`/api/table/${code}`)
  check(menu.body.calls.length === 2, "El cliente ve sus llamados abiertos")

  // El personal ve los llamados de la mesa; sin sesión no.
  check((await anonymous("/api/table-calls")).status === 401, "Llamados sin sesión")
  const calls = await staff("/api/table-calls")
  const mine = calls.body.items?.filter((item) => item.tableLabel.endsWith(`Mesa QR ${suffix}`)) ?? []
  check(mine.length === 2 && mine.every((item) => item.orderId === sent.body.orderId), `Llamados para el personal: ${JSON.stringify(calls.body)}`)
  const waiterCall = mine.find((item) => item.kind === "waiter")
  check((await staff(`/api/table-calls/${waiterCall.id}`, "PATCH")).status === 200, "Atender llamado")
  check((await staff(`/api/table-calls/${waiterCall.id}`, "PATCH")).status === 409, "Llamado ya atendido")
  menu = await guest(`/api/table/${code}`)
  check(menu.body.calls.length === 1 && menu.body.calls[0].kind === "bill", "Queda solo el pedido de cuenta")

  // Límite de llamados por IP y mesa.
  const flood = guestHeaders["x-forwarded-for"].replace(/^10\./, "11.")
  let limited = false
  for (let i = 0; i < 8 && !limited; i++) limited = (await guest(`/api/table/${code}/call`, "POST", { kind: "waiter" }, { "x-forwarded-for": flood })).status === 429
  check(limited, "Límite de llamados por minuto")

  // El personal activa sus avisos.
  check((await anonymous("/api/push/subscribe", "POST", { subscription: fakeSubscription("https://fcm.googleapis.com/fcm/send/x") })).status === 401, "Push del personal sin sesión")
  const staffPush = await staff("/api/push/subscribe", "POST", { subscription: fakeSubscription(`https://fcm.googleapis.com/fcm/send/staff-${suffix}`) })
  check(staffPush.status === 200, `Push del personal: ${staffPush.status}`)
  check((await staff("/api/push/subscribe", "DELETE", { endpoint: `https://fcm.googleapis.com/fcm/send/staff-${suffix}` })).status === 200, "Desactivar push del personal")
  const key = await anonymous("/api/push/public-key")
  check(typeof key.body.publicKey === "string" && Buffer.from(key.body.publicKey, "base64url").length === 65, "Clave pública VAPID")

  console.log("OK: QR de mesa, estado en vivo, llamados al mozo y a caja, atención del personal, avisos push y manifiesto")
} finally {
  for (const id of created.orders) {
    await db.query("DELETE FROM table_calls WHERE table_id = ANY($1)", [created.tables])
    await db.query("DELETE FROM push_subscriptions WHERE order_id = $1", [id])
    await db.query("DELETE FROM kitchen_tickets WHERE order_id = $1", [id])
    await db.query("DELETE FROM service_orders WHERE id = $1", [id])
  }
  await db.query("DELETE FROM table_calls WHERE table_id = ANY($1)", [created.tables])
  await db.query("DELETE FROM push_subscriptions WHERE endpoint LIKE $1", [`%${suffix}`])
  await db.query("DELETE FROM guest_order_requests WHERE table_id = ANY($1)", [created.tables])
  await db.query("DELETE FROM public.table_directory WHERE code = $1", [code])
  await db.query("DELETE FROM dining_tables WHERE id = ANY($1)", [created.tables])
  await db.query("DELETE FROM dining_rooms WHERE id = ANY($1)", [created.rooms])
  await db.query("DELETE FROM products WHERE id = ANY($1)", [created.products])
  await db.query("DELETE FROM app_sessions WHERE user_id = ANY($1)", [created.users]).catch(() => undefined)
  await db.query("DELETE FROM public.app_users WHERE id = ANY($1)", [created.users])
  await db.end()
}
