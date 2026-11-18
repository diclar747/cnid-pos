import { readFile } from "node:fs/promises"
import { randomBytes, randomUUID, scryptSync } from "node:crypto"
import { resolve } from "node:path"
import pg from "pg"

const base = process.env.POS_BASE_URL || "http://127.0.0.1:3000"
let email = process.env.SUPERADMIN_EMAIL || "superadmin@cnid.local"
let password = process.env.SUPERADMIN_PASSWORD
const envFile = await readFile(resolve(".env.local"), "utf8")
const connectionString = process.env.DATABASE_URL || envFile.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
if (!connectionString) throw new Error("DATABASE_URL no configurada.")
const pool = new pg.Pool({ connectionString })
let createdId = null
let superUserId = null

async function request(path, options = {}, cookie = "") {
  const response = await fetch(`${base}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...options.headers } })
  const body = await response.json().catch(() => ({}))
  return { status: response.status, body, cookie: response.headers.get("set-cookie")?.split(";")[0] || "" }
}
function assert(condition, message) { if (!condition) throw new Error(message) }

try {
  if (!password) {
    const suffix = randomBytes(5).toString("hex")
    email = `smoke-super-${suffix}@localhost.test`
    password = randomBytes(18).toString("base64url")
    const salt = randomBytes(16).toString("hex")
    const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`
    const createdUser = await pool.query(`INSERT INTO public.app_users
      (email, username, name, role, permissions, password_hash)
      VALUES ($1, $2, 'Superadministrador temporal', 'superadmin', '{}', $3) RETURNING id`,
      [email, `smoke-super-${suffix}`, passwordHash])
    superUserId = Number(createdUser.rows[0].id)
  }
  const login = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
  assert(login.status === 200 && login.cookie, `Login superadmin: ${login.status}`)
  const superCookie = login.cookie
  const initial = await request("/api/restaurants", {}, superCookie)
  assert(initial.status === 200 && initial.body.restaurants.some((r) => r.name === "De la Casa"), "Falta De la Casa")

  const suffix = randomBytes(5).toString("hex")
  const adminEmail = `test-${suffix}@cnid.local`
  const adminPassword = randomBytes(18).toString("base64url")
  const created = await request("/api/restaurants", { method: "POST", body: JSON.stringify({
    name: `Restaurante temporal ${suffix}`, slug: `temporal-${suffix}`, email: adminEmail,
    adminName: "Admin temporal", adminEmail, adminUsername: `admin_${suffix}`, adminPassword,
  }) }, superCookie)
  assert(created.status === 201, `Crear restaurante: ${created.status} ${JSON.stringify(created.body)}`)
  createdId = Number(created.body.restaurant.id)

  const tenantLogin = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: adminEmail, password: adminPassword }) })
  assert(tenantLogin.status === 200 && tenantLogin.cookie, `Login restaurante: ${tenantLogin.status}`)
  const tenantCookie = tenantLogin.cookie
  const [products, company, cards, users, forbidden] = await Promise.all([
    request("/api/data/products", {}, tenantCookie), request("/api/data/company", {}, tenantCookie),
    request("/api/order-cards", {}, tenantCookie), request("/api/users", {}, tenantCookie),
    request("/api/restaurants", {}, tenantCookie),
  ])
  assert(products.status === 200 && products.body.items.length === 0, "Productos de otro restaurante visibles")
  assert(company.status === 200 && company.body.item.name === `Restaurante temporal ${suffix}`, "Configuración no aislada")
  assert(cards.status === 200 && cards.body.items.length === 0, "Tarjetas de otro restaurante visibles")
  assert(users.status === 200 && users.body.users.length === 1, "Usuarios de otro restaurante visibles")
  assert(forbidden.status === 403, "Administrador local accedió a superadministración")

  const dining = await request("/api/dining", {}, tenantCookie)
  assert(dining.status === 200 && dining.body.rooms.length === 1 && dining.body.tables.length === 0, "El salón inicial no está aislado")
  const roomId = Number(dining.body.rooms[0].id)
  const table = await request("/api/dining", { method: "POST", body: JSON.stringify({
    kind: "table", roomId, label: "Mesa prueba", seats: 4, shape: "round",
  }) }, tenantCookie)
  assert(table.status === 201 && table.body.table.code, `Crear mesa: ${table.status} ${JSON.stringify(table.body)}`)
  const tableCode = table.body.table.code
  const product = await request("/api/data/products", { method: "POST", body: JSON.stringify({
    name: "Producto de prueba", price: 10000, category: "Pruebas", image: "/placeholder.svg",
    stock: 5, trackStock: true, barcode: `TEST-${suffix}`, description: "", isActive: true,
  }) }, tenantCookie)
  assert(product.status === 201, `Crear producto: ${product.status} ${JSON.stringify(product.body)}`)
  const productId = Number(product.body.item.id)
  const publicMenu = await request(`/api/table/${tableCode}`)
  assert(publicMenu.status === 200 && publicMenu.body.products.length === 1 && publicMenu.body.products[0].id === productId,
    "El menú público no muestra el catálogo correcto")
  const requestId = randomUUID()
  const guestBody = JSON.stringify({ requestId, customerName: "Cliente prueba", items: [{ id: productId, quantity: 2, selectedModifiers: [] }] })
  const guestOrder = await request(`/api/table/${tableCode}`, { method: "POST", body: guestBody })
  assert(guestOrder.status === 201 && guestOrder.body.ticketId, `Pedido desde teléfono: ${guestOrder.status} ${JSON.stringify(guestOrder.body)}`)
  const repeated = await request(`/api/table/${tableCode}`, { method: "POST", body: guestBody })
  assert(repeated.status === 200 && repeated.body.repeated === true && repeated.body.ticketId === guestOrder.body.ticketId,
    "El reintento duplicó el pedido")
  const [stock, ticket, posLookup] = await Promise.all([
    pool.query(`SELECT data->>'stock' AS stock FROM "restaurant_${createdId}".products WHERE id=$1`, [productId]),
    pool.query(`SELECT COUNT(*) AS total FROM "restaurant_${createdId}".kitchen_tickets WHERE order_id=$1`, [guestOrder.body.orderId]),
    request(`/api/service-orders?table=${tableCode}`, {}, tenantCookie),
  ])
  assert(Number(stock.rows[0].stock) === 3 && Number(ticket.rows[0].total) === 1, "La comanda o el stock no coinciden")
  assert(posLookup.status === 200 && posLookup.body.order.id === guestOrder.body.orderId, "El POS no recupera la cuenta de la mesa")

  const supplier = await request("/api/data/suppliers", { method: "POST", body: JSON.stringify({
    name: `Proveedor temporal ${suffix}`, isActive: true, ruc: "", phone: "", address: "",
  }) }, tenantCookie)
  assert(supplier.status === 201, `Crear proveedor: ${supplier.status} ${JSON.stringify(supplier.body)}`)
  const supplierId = Number(supplier.body.item.id)
  const purchaseOrder = await request("/api/purchase-orders", { method: "POST", body: JSON.stringify({
    productId, supplierId, quantity: 2, unitCost: 4000,
  }) }, tenantCookie)
  assert(purchaseOrder.status === 201, `Crear orden de compra: ${purchaseOrder.status} ${JSON.stringify(purchaseOrder.body)}`)
  const purchaseId = Number(purchaseOrder.body.item.id)
  const beforeReceive = await pool.query(`SELECT data->>'stock' AS stock FROM "restaurant_${createdId}".products WHERE id=$1`, [productId])
  assert(Number(beforeReceive.rows[0].stock) === 3, "La compra pendiente alteró el stock")
  const received = await request(`/api/purchase-orders/${purchaseId}`, { method: "PATCH", body: JSON.stringify({ status: "received" }) }, tenantCookie)
  assert(received.status === 200 && received.body.stock === 5 && received.body.purchase.total === 8000, "La recepción no actualizó stock y costo")
  const duplicateReceive = await request(`/api/purchase-orders/${purchaseId}`, { method: "PATCH", body: JSON.stringify({ status: "received" }) }, tenantCookie)
  assert(duplicateReceive.status === 409, "La orden de compra se recibió dos veces")

  const board = await request("/api/kitchen-tickets", {}, tenantCookie)
  assert(board.status === 200 && board.body.items.some((entry) => entry.id === guestOrder.body.ticketId), "La comanda no figura en cocina")
  for (const status of ["preparing", "ready", "served"]) {
    const updated = await request(`/api/kitchen-tickets/${guestOrder.body.ticketId}`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }, tenantCookie)
    assert(updated.status === 200 && updated.body.ticket.status === status, `No avanzó la comanda a ${status}`)
  }
  const paid = await request("/api/checkout", { method: "POST", body: JSON.stringify({
    serviceOrderId: guestOrder.body.orderId, paymentMethod: "cash", cashReceived: 20000,
  }) }, tenantCookie)
  assert(paid.status === 201 && paid.body.sale.total === 20000, `Cobrar mesa: ${paid.status} ${JSON.stringify(paid.body)}`)
  const duplicatePayment = await request("/api/checkout", { method: "POST", body: JSON.stringify({
    serviceOrderId: guestOrder.body.orderId, paymentMethod: "card",
  }) }, tenantCookie)
  assert(duplicatePayment.status === 400, "La cuenta de mesa se cobró dos veces")
  const freeTable = await request(`/api/service-orders?table=${tableCode}`, {}, tenantCookie)
  assert(freeTable.status === 200 && freeTable.body.order === null, "La mesa no quedó libre después del cobro")

  const directSale = await request("/api/checkout", { method: "POST", body: JSON.stringify({
    items: [{ id: productId, quantity: 1 }], paymentMethod: "card",
  }) }, tenantCookie)
  assert(directSale.status === 201 && directSale.body.sale.total === 10000, "El cobro directo falló")
  const cardsCreated = await request("/api/order-cards", { method: "POST", body: JSON.stringify({
    count: 1, label: `Tarjeta ${suffix}`,
  }) }, tenantCookie)
  assert(cardsCreated.status === 201 && cardsCreated.body.items[0].code, "No se pudo crear la tarjeta QR")
  const cardCode = cardsCreated.body.items[0].code
  const cardOrder = await request("/api/service-orders", { method: "POST", body: JSON.stringify({
    cardCode, items: [{ id: productId, quantity: 1 }], sendToKitchen: true,
  }) }, tenantCookie)
  assert(cardOrder.status === 201 && cardOrder.body.ticket?.status === "pending", "La tarjeta no generó comanda")
  const cardView = await request(`/api/card-lookup/${cardCode}`)
  assert(cardView.status === 200 && cardView.body.order?.total === 10000, "La tarjeta no muestra el consumo")
  const cancelled = await request(`/api/service-orders/${cardOrder.body.order.id}`, {
    method: "PATCH", body: JSON.stringify({ action: "cancel" }),
  }, tenantCookie)
  assert(cancelled.status === 200, "No se pudo cancelar la cuenta")
  const finalStock = await pool.query(`SELECT data->>'stock' AS stock FROM "restaurant_${createdId}".products WHERE id=$1`, [productId])
  assert(Number(finalStock.rows[0].stock) === 4, "El stock final no refleja compras, ventas y cancelación")
  const [profile, phoneAccess, manifest, worker] = await Promise.all([
    request("/api/profile", {}, tenantCookie), request("/api/phone-access", {}, tenantCookie),
    fetch(`${base}/manifest.webmanifest`), fetch(`${base}/sw.js`),
  ])
  assert(profile.status === 200 && profile.body.user.email === adminEmail, "El perfil no corresponde al restaurante")
  assert(phoneAccess.status === 200 && phoneAccess.body.baseUrl?.startsWith("https://"), "Falta acceso HTTPS del teléfono")
  assert(manifest.status === 200 && worker.status === 200, "La PWA no entrega manifiesto o service worker")

  const suspended = await request(`/api/restaurants/${createdId}`, { method: "PATCH", body: JSON.stringify({ status: "suspended" }) }, superCookie)
  assert(suspended.status === 200, "No se pudo suspender")
  const blocked = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: adminEmail, password: adminPassword }) })
  assert(blocked.status === 401, "La suspensión no bloqueó el inicio de sesión")
  const blockedTable = await request(`/api/table/${tableCode}`)
  assert(blockedTable.status === 404, "La suspensión no bloqueó el menú QR")
  const resumed = await request(`/api/restaurants/${createdId}`, { method: "PATCH", body: JSON.stringify({ status: "active" }) }, superCookie)
  assert(resumed.status === 200, "No se pudo reactivar")
  const restored = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email: adminEmail, password: adminPassword }) })
  assert(restored.status === 200, "La reactivación no habilitó el inicio de sesión")
  const deleted = await request(`/api/restaurants/${createdId}`, { method: "DELETE", headers: { "x-confirm-restaurant": String(createdId) } }, superCookie)
  assert(deleted.status === 200 && deleted.body.restaurant.status === "deleted", "No se pudo eliminar")
  console.log("OK: aislamiento, productos, proveedores, compras, stock, mesa QR, pedido móvil, cocina, tarjeta, cobros, PWA, suspensión y eliminación.")
} finally {
  if (createdId && Number.isSafeInteger(createdId) && createdId > 1) {
    const schema = `restaurant_${createdId}`
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
      await client.query(`DELETE FROM public.app_users WHERE restaurant_id = $1`, [createdId])
      await client.query(`DELETE FROM public.restaurants WHERE id = $1`, [createdId])
      await client.query("COMMIT")
    } catch (error) { await client.query("ROLLBACK"); throw error }
    finally { client.release() }
  }
  if (superUserId) await pool.query("DELETE FROM public.app_users WHERE id = $1", [superUserId])
  await pool.end()
}
