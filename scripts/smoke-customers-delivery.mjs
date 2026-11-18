// Prueba de clientes, historial de estados, confirmación y delivery por zonas.
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000) y cuentas de De la Casa.
// Crea registros temporales y los elimina al terminar.
import fs from "node:fs/promises"
import { randomBytes, scryptSync } from "node:crypto"
import pg from "pg"

const origin = process.env.POS_ORIGIN ?? "http://127.0.0.1:3000"
const env = await fs.readFile(".env.local", "utf8").catch(() => "")
const db = new pg.Client({ connectionString: process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() })
await db.connect()

const check = (condition, message) => { if (!condition) throw new Error(message) }
const session = () => {
  let cookie = ""
  return async (path, method = "GET", body) => {
    const response = await fetch(origin + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const token = response.headers.get("set-cookie")?.split(";")[0]
    if (token) cookie = token
    return { status: response.status, body: await response.json().catch(() => ({})) }
  }
}
const hash = (password) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}` }
const suffix = randomBytes(4).toString("hex")
const created = { users: [], zones: [], couriers: [], customers: [], orders: [], sales: [], products: [] }

try {
  // Cuentas temporales: administrador y mesero de De la Casa.
  const adminPerms = ["view_dashboard", "manage_products", "manage_users", "view_reports", "manage_expenses", "manage_company", "manage_purchases", "manage_suppliers", "access_pos", "manage_sales"]
  for (const [role, perms] of [["admin", adminPerms], ["waiter", ["access_pos", "take_orders"]]]) {
    const r = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id)
      VALUES ($1,$2,$3,$4,$5,$6,1) RETURNING id`, [`${role}-${suffix}@prueba.test`, `${role}_${suffix}`, `Prueba ${role}`, role, perms, hash("Prueba-2026!")])
    created.users.push(Number(r.rows[0].id))
  }
  const admin = session(), waiter = session()
  check((await admin("/api/auth/login", "POST", { email: `admin-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login admin")
  check((await waiter("/api/auth/login", "POST", { email: `waiter-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login mesero")

  const product = await admin("/api/data/products", "POST", { name: `Plato prueba ${suffix}`, price: 50000, category: "Pruebas", image: "", stock: 0, trackStock: false, barcode: `TEST-${suffix}`, description: "", isActive: true })
  check(product.status === 201, `Producto: ${product.status}`)
  created.products.push(product.body.item.id)
  const productId = product.body.item.id

  // Zonas y repartidores
  check((await waiter("/api/delivery/zones", "POST", { name: "No", fee: 1 })).status === 403, "El mesero no debe crear zonas")
  const zone = await admin("/api/delivery/zones", "POST", { name: `Centro ${suffix}`, areas: "Centro, Barrio Obrero", fee: 10000, freeOver: 120000, etaMinutes: 40 })
  check(zone.status === 201 && zone.body.item.fee === 10000, `Crear zona: ${zone.status} ${JSON.stringify(zone.body)}`)
  created.zones.push(zone.body.item.id)
  check((await admin("/api/delivery/zones", "POST", { name: `centro ${suffix}`, fee: 5000 })).status === 409, "Zona duplicada")
  const courier = await admin("/api/delivery/couriers", "POST", { name: `Repartidor ${suffix}`, phone: "0981 111 222", vehicle: "Moto" })
  check(courier.status === 201, "Crear repartidor")
  created.couriers.push(courier.body.item.id)

  // Pedido delivery: cliente por teléfono, envío por zona.
  const phone = `0981${suffix.replace(/\D/g, "").padEnd(6, "7").slice(0, 6)}`
  const order = await waiter("/api/service-orders", "POST", { orderType: "delivery", customerName: "Cliente Prueba", customerPhone: phone,
    deliveryZoneId: zone.body.item.id, deliveryAddress: "Calle 1 c/ 2", items: [{ id: productId, quantity: 1 }] })
  check(order.status === 201, `Orden delivery: ${order.status} ${JSON.stringify(order.body)}`)
  const orderId = order.body.order.id
  created.orders.push(orderId)
  check(order.body.order.deliveryFee === 10000 && order.body.order.grandTotal === 60000, `Envío: ${order.body.order.deliveryFee} / ${order.body.order.grandTotal}`)
  check(order.body.order.customerId, "La orden no quedó vinculada al cliente")
  created.customers.push(order.body.order.customerId)

  // Superar el monto de envío gratis
  const more = await waiter("/api/service-orders", "POST", { orderId, items: [{ id: productId, quantity: 2 }] })
  check(more.body.order.deliveryFee === 0 && more.body.order.grandTotal === 150000, `Envío gratis: ${more.body.order.deliveryFee}`)

  // Repartidor y datos
  const details = await admin(`/api/service-orders/${orderId}`, "PATCH", { action: "details", courierId: courier.body.item.id })
  check(details.status === 200 && details.body.order.courierName === `Repartidor ${suffix}`, "Asignar repartidor")

  // Cobro: el total incluye envío y suma al cliente
  const paid = await admin("/api/checkout", "POST", { serviceOrderId: orderId, paymentMethod: "cash", cashReceived: 200000 })
  check(paid.status === 201 && paid.body.sale.total === 150000 && paid.body.sale.deliveryFee === 0 && paid.body.sale.change === 50000, `Cobro: ${JSON.stringify(paid.body).slice(0, 200)}`)
  created.sales.push(paid.body.sale.id)

  const customer = await admin(`/api/customers/${order.body.order.customerId}`)
  check(customer.body.item.ordersCount === 1 && customer.body.item.totalSpent === 150000 && customer.body.item.phone.startsWith("595"), `Cliente: ${JSON.stringify(customer.body.item)}`)
  check(customer.body.sales.length === 1, "Compras del cliente")
  const search = await waiter(`/api/customers?q=${encodeURIComponent(phone)}`)
  check(search.body.items.some((c) => c.id === order.body.order.customerId), "Búsqueda por teléfono")

  // Historial
  const history = await admin(`/api/service-orders/${orderId}/history`)
  const events = history.body.items.map((e) => e.event)
  for (const event of ["created", "items_added", "courier", "paid"]) check(events.includes(event), `Falta el evento ${event}: ${events}`)

  // Pedido remoto pendiente de confirmación: no va a cocina hasta confirmarlo.
  const pending = await admin("/api/service-orders", "POST", { orderType: "pickup", customerName: "Pendiente", items: [{ id: productId, quantity: 1 }] })
  created.orders.push(pending.body.order.id)
  await db.query("UPDATE service_orders SET confirmation = 'pending', source = 'whatsapp' WHERE id = $1", [pending.body.order.id])
  check((await admin(`/api/service-orders/${pending.body.order.id}`, "PATCH", { action: "send" })).status === 409, "Un pendiente no debe ir a cocina")
  check((await admin("/api/checkout", "POST", { serviceOrderId: pending.body.order.id, paymentMethod: "card" })).status === 400, "Un pendiente no debe cobrarse")
  const confirmed = await admin(`/api/service-orders/${pending.body.order.id}`, "PATCH", { action: "confirm", sendToKitchen: true })
  check(confirmed.status === 200 && confirmed.body.order.confirmation === "confirmed" && confirmed.body.ticket, "Confirmar y enviar a cocina")

  const rejectedOrder = await admin("/api/service-orders", "POST", { orderType: "pickup", customerName: "Rechazo", items: [{ id: productId, quantity: 1 }] })
  created.orders.push(rejectedOrder.body.order.id)
  await db.query("UPDATE service_orders SET confirmation = 'pending' WHERE id = $1", [rejectedOrder.body.order.id])
  check((await waiter(`/api/service-orders/${rejectedOrder.body.order.id}`, "PATCH", { action: "reject" })).status === 403, "El mesero no debe rechazar")
  const rejected = await admin(`/api/service-orders/${rejectedOrder.body.order.id}`, "PATCH", { action: "reject", reason: "Sin stock" })
  check(rejected.body.order.status === "cancelled" && rejected.body.order.confirmation === "rejected", "Rechazar")
  await admin(`/api/service-orders/${pending.body.order.id}`, "PATCH", { action: "cancel" })

  console.log("OK: zonas, repartidores, envío por zona y gratis, cliente por teléfono, compras del cliente, historial, confirmar, rechazar y permisos")
} finally {
  // Limpieza de los registros temporales
  if (created.orders.length) {
    await db.query("DELETE FROM kitchen_tickets WHERE order_id = ANY($1::bigint[])", [created.orders])
    await db.query("DELETE FROM service_orders WHERE id = ANY($1::bigint[])", [created.orders])
  }
  if (created.sales.length) await db.query("DELETE FROM sales WHERE id = ANY($1::bigint[])", [created.sales])
  if (created.customers.length) await db.query("DELETE FROM customers WHERE id = ANY($1::bigint[])", [created.customers])
  await db.query("DELETE FROM customers WHERE name IN ('Pendiente', 'Rechazo') AND phone = '' AND ruc = ''")
  if (created.zones.length) await db.query("DELETE FROM delivery_zones WHERE id = ANY($1::bigint[])", [created.zones])
  if (created.couriers.length) await db.query("DELETE FROM couriers WHERE id = ANY($1::bigint[])", [created.couriers])
  if (created.products.length) {
    await db.query("DELETE FROM stock_movements WHERE product_id = ANY($1::bigint[])", [created.products])
    await db.query("DELETE FROM products WHERE id = ANY($1::bigint[])", [created.products])
  }
  if (created.users.length) {
    await db.query("DELETE FROM public.app_sessions WHERE user_id = ANY($1::bigint[])", [created.users])
    await db.query("DELETE FROM public.app_users WHERE id = ANY($1::bigint[])", [created.users])
  }
  await db.end()
}
