// Prueba del QR del restaurante: el cliente entra sin registrarse (invitado), la sesión se mantiene,
// elige su mesa, pide desde ella (queda en «Mis pedidos») y después guarda su cuenta con su teléfono.
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000) y la base local con De la Casa.
// Crea registros temporales y los elimina al terminar.
import fs from "node:fs/promises"
import { randomBytes } from "node:crypto"
import pg from "pg"

const origin = process.env.POS_ORIGIN ?? "http://127.0.0.1:3000"
const env = await fs.readFile(".env.local", "utf8").catch(() => "")
const db = new pg.Client({ connectionString: process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() })
await db.connect()
const check = (condition, message) => { if (!condition) throw new Error(message) }
const session = () => {
  let cookie = ""
  const call = async (path, method = "GET", body) => {
    const response = await fetch(origin + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const setCookie = response.headers.get("set-cookie") ?? ""
    const token = setCookie.split(";")[0]
    if (token) cookie = token.endsWith("=") ? "" : token
    const text = await response.text()
    let parsed = {}; try { parsed = JSON.parse(text) } catch { parsed = { text } }
    return { status: response.status, body: parsed, setCookie }
  }
  call.cookie = () => cookie
  return call
}
const code = "CNID-TABLE-" + randomBytes(12).toString("hex").toUpperCase()
const phone = `0981${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`
const created = { accounts: [], room: null, table: null }

try {
  const restaurant = (await db.query("SELECT id, slug FROM public.restaurants WHERE schema_name = 'public'")).rows[0]
  created.room = (await db.query("INSERT INTO dining_rooms (name) VALUES ('Salón prueba invitado') RETURNING id")).rows[0].id
  created.table = (await db.query("INSERT INTO dining_tables (room_id, label, seats, shape, code) VALUES ($1, 'Mesa 6', 4, 'round', $2) RETURNING id", [created.room, code])).rows[0].id
  await db.query("INSERT INTO public.table_directory (code, restaurant_id) VALUES ($1, $2)", [code, restaurant.id])

  // 1. Escanear el QR del restaurante: la página carga y lista la mesa.
  const page = await fetch(`${origin}/r/${restaurant.slug}`)
  check(page.status === 200, `/r/${restaurant.slug} respondió ${page.status}`)
  check((await page.text()).includes(code), "La página del QR no lista la mesa nueva")
  console.log("✓ QR del restaurante: la página lista las mesas")

  // 2. Entrar sin registrarse; la sesión se mantiene (y se renueva) al volver.
  const guest = session()
  const first = await guest("/api/customer/session", "POST", { mode: "guest" })
  check(first.status === 201 && first.body.account?.isGuest && !first.body.account.phone, `Invitado no creado: ${first.status} ${JSON.stringify(first.body)}`)
  created.accounts.push(first.body.account.id)
  check(/max-age=345\d{5}/i.test(first.setCookie), `La cookie no dura 400 días: ${first.setCookie}`)
  const again = await guest("/api/customer/session", "POST", { mode: "guest" })
  check(again.status === 200 && again.body.account.id === first.body.account.id, "Al volver se creó otro invitado")
  check(/max-age=/i.test(again.setCookie), "Al volver no se renovó la sesión")
  const me = await guest("/api/customer/session")
  check(me.body.account?.id === first.body.account.id, "GET de la sesión no reconoce al invitado")
  console.log("✓ Invitado: entra solo con el QR y la sesión queda abierta")

  // 3. Elige la Mesa 6 y pide: queda en su historial y llega como pedido por aceptar.
  const menu = await guest(`/api/table/${code}`)
  check(menu.status === 200, `La mesa no abre: ${menu.status}`)
  const product = menu.body.products.find((item) => !item.modifierGroups?.some((group) => group.required || group.minSelect > 0))
  check(product, "No hay producto sin opciones obligatorias")
  const ordered = await guest(`/api/table/${code}`, "POST", { items: [{ productId: product.id, quantity: 1 }], customerName: "" })
  check(ordered.status === 201, `El pedido de la mesa falló: ${ordered.status} ${JSON.stringify(ordered.body)}`)
  const history = await guest("/api/customer/orders")
  check(history.body.items?.some((order) => order.id === ordered.body.orderId), `El pedido no aparece en «Mis pedidos»: ${JSON.stringify(history.body).slice(0, 300)}`)
  const order = (await db.query("SELECT customer_name, table_id FROM service_orders WHERE id = $1", [ordered.body.orderId])).rows[0]
  check(order.table_id === created.table && order.customer_name !== "Invitado", "El pedido no quedó en la mesa o con el nombre «Invitado»")
  console.log(`✓ Pedido desde la Mesa 6 (${ordered.body.pendingApproval ? "por aceptar" : "a cocina"}) y en «Mis pedidos»`)

  // 4. Retiro o delivery necesitan teléfono; el invitado guarda su cuenta y conserva sus pedidos.
  const web = await guest("/api/customer/orders", "POST", { slug: restaurant.slug, orderType: "pickup", items: [{ id: product.id, quantity: 1 }] })
  check(web.status >= 400 && /teléfono/i.test(web.body.error ?? ""), `El invitado sin teléfono pudo pedir para retirar: ${web.status} ${JSON.stringify(web.body)}`)
  const claimed = await guest("/api/customer/session", "POST", { mode: "claim", name: "Cliente Prueba QR", phone, password: "prueba123" })
  check(claimed.status === 200 && !claimed.body.account.isGuest && claimed.body.account.phone, `No se pudo guardar la cuenta: ${JSON.stringify(claimed.body)}`)
  check(claimed.body.account.id === first.body.account.id, "Guardar la cuenta creó otra cuenta")
  const twice = await guest("/api/customer/session", "POST", { mode: "claim", name: "Otro", phone, password: "prueba123" })
  check(twice.status === 409, "Se pudo volver a «guardar» una cuenta ya guardada")
  const login = session()
  const loggedIn = await login("/api/customer/session", "POST", { phone, password: "prueba123" })
  check(loggedIn.status === 200 && loggedIn.body.account.id === first.body.account.id, "No ingresa con el teléfono guardado")
  const loginHistory = await login("/api/customer/orders")
  check(loginHistory.body.items?.some((order) => order.id === ordered.body.orderId), "Desde otro teléfono no ve el pedido de la mesa")
  console.log("✓ Guardar cuenta: conserva los pedidos y entra desde otro teléfono")

  // 5. Otro teléfono que escanea es otro invitado; el que tiene cuenta no puede pisar ese teléfono.
  const other = session()
  const second = await other("/api/customer/session", "POST", { mode: "guest" })
  check(second.status === 201 && second.body.account.id !== first.body.account.id, "Otro teléfono reusó el mismo invitado")
  created.accounts.push(second.body.account.id)
  const steal = await other("/api/customer/session", "POST", { mode: "claim", name: "Intruso", phone, password: "prueba123" })
  check(steal.status === 409, "Un invitado pudo guardar su cuenta con un teléfono ajeno")
  console.log("✓ Cada teléfono tiene su propio ID; no se puede usar un teléfono ya registrado")
  console.log("Prueba del QR del restaurante: OK")
} finally {
  const orders = created.table ? (await db.query("SELECT id FROM service_orders WHERE table_id = $1", [created.table])).rows.map((row) => row.id) : []
  for (const id of orders) {
    await db.query("DELETE FROM public.customer_order_links WHERE order_id = $1 AND restaurant_id = (SELECT id FROM public.restaurants WHERE schema_name = 'public')", [id]).catch(() => undefined)
    await db.query("DELETE FROM kitchen_tickets WHERE order_id = $1", [id]); await db.query("DELETE FROM order_status_history WHERE order_id = $1", [id]).catch(() => undefined)
    await db.query("DELETE FROM service_orders WHERE id = $1", [id])
  }
  if (created.table) { await db.query("DELETE FROM table_calls WHERE table_id = $1", [created.table]); await db.query("DELETE FROM guest_order_requests WHERE table_id = $1", [created.table]).catch(() => undefined) }
  await db.query("DELETE FROM public.table_directory WHERE code = $1", [code])
  if (created.table) await db.query("DELETE FROM dining_tables WHERE id = $1", [created.table])
  if (created.room) await db.query("DELETE FROM dining_rooms WHERE id = $1", [created.room])
  for (const id of created.accounts) {
    await db.query("DELETE FROM public.customer_order_links WHERE account_id = $1", [id]).catch(() => undefined)
    await db.query("DELETE FROM public.customer_sessions WHERE account_id = $1", [id]); await db.query("DELETE FROM public.customer_push WHERE account_id = $1", [id]).catch(() => undefined)
    await db.query("DELETE FROM public.customer_accounts WHERE id = $1", [id])
  }
  await db.end()
}
