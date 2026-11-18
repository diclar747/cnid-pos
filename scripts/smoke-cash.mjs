// Prueba de caja y pagos: apertura, cobros por medio de pago, verificación de transferencias,
// ingresos y egresos, cierre con arqueo y medios de pago configurables.
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000) y la base de De la Casa sin una caja abierta.
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
const created = { users: [], products: [], sales: [], sessions: [], methods: [] }

try {
  check(!(await db.query("SELECT 1 FROM cash_sessions WHERE status = 'open'")).rows[0], "Hay una caja abierta en la base local: cerrala antes de correr la prueba.")
  for (const [role, perms] of [["admin", ["access_pos", "manage_sales", "manage_company", "manage_products", "view_reports"]], ["waiter", ["access_pos", "take_orders"]]]) {
    const r = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id)
      VALUES ($1,$2,$3,$4,$5,$6,1) RETURNING id`, [`cash-${role}-${suffix}@prueba.test`, `cash_${role}_${suffix}`, `Caja ${role}`, role, perms, hash("Prueba-2026!")])
    created.users.push(Number(r.rows[0].id))
  }
  const admin = session(), waiter = session()
  check((await admin("/api/auth/login", "POST", { email: `cash-admin-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login admin")
  check((await waiter("/api/auth/login", "POST", { email: `cash-waiter-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login mesero")
  check((await waiter("/api/cash")).status === 403, "El mesero no opera la caja")

  const product = await admin("/api/data/products", "POST", { name: `Plato caja ${suffix}`, price: 50000, category: "Pruebas", image: "", stock: 0, trackStock: false, barcode: `CASH-${suffix}`, description: "", isActive: true })
  check(product.status === 201, `Producto: ${product.status}`)
  created.products.push(product.body.item.id)
  const sell = async (paymentMethod, extra = {}) => {
    const result = await admin("/api/checkout", "POST", { items: [{ id: product.body.item.id, quantity: 1 }], paymentMethod, orderType: "pickup", customerName: "Cliente caja", ...extra })
    if (result.body.sale?.id) created.sales.push(result.body.sale.id)
    return result
  }

  // Apertura.
  const methods = await admin("/api/payment-methods")
  check(methods.body.cashOpen === false && ["cash", "card", "transfer", "qr"].every((code) => methods.body.items.some((item) => item.code === code)), "Medios de pago iniciales")
  check((await admin("/api/cash", "POST", { action: "open", amount: -5 })).status === 400, "Monto inicial negativo")
  const opened = await admin("/api/cash", "POST", { action: "open", amount: 100000, notes: "Turno prueba" })
  check(opened.status === 201, `Abrir caja: ${opened.status} ${JSON.stringify(opened.body)}`)
  created.sessions.push(opened.body.session.id)
  check((await admin("/api/cash", "POST", { action: "open", amount: 1 })).status === 409, "Solo una caja abierta")

  // Cobros: efectivo confirmado, transferencia y QR pendientes de verificar.
  const cash = await sell("cash", { cashReceived: 60000 })
  check(cash.status === 201 && cash.body.sale.change === 10000 && cash.body.sale.paymentStatus === "confirmed" && cash.body.sale.cashSessionId === opened.body.session.id, `Venta en efectivo: ${JSON.stringify(cash.body)}`)
  check((await sell("cash", { cashReceived: 100 })).status === 400, "Efectivo insuficiente")
  check((await sell("bitcoin")).status === 400, "Medio inexistente")
  const transfer = await sell("transfer", { paymentReference: "OP-123" })
  check(transfer.status === 201 && transfer.body.sale.paymentStatus === "pending", "Transferencia pendiente")
  const qr = await sell("qr")
  check(qr.status === 201 && qr.body.sale.paymentStatus === "pending", "QR pendiente")
  let state = await admin("/api/cash")
  check(state.body.summary.cashSales === 50000 && state.body.summary.expectedCash === 150000 && state.body.summary.salesTotal === 150000, `Resumen: ${JSON.stringify(state.body.summary)}`)
  const pendingTransfer = state.body.pending.find((item) => item.saleId === transfer.body.sale.id)
  const pendingQr = state.body.pending.find((item) => item.saleId === qr.body.sale.id)
  check(pendingTransfer?.reference === "OP-123" && pendingQr, "Pagos por verificar")
  check((await waiter(`/api/payments/${pendingTransfer.id}`, "PATCH", { action: "confirm" })).status === 403, "El mesero no verifica pagos")
  check((await admin(`/api/payments/${pendingTransfer.id}`, "PATCH", { action: "confirm" })).status === 200, "Confirmar transferencia")
  check((await admin(`/api/payments/${pendingTransfer.id}`, "PATCH", { action: "confirm" })).status === 409, "No se confirma dos veces")
  check((await admin(`/api/payments/${pendingQr.id}`, "PATCH", { action: "reject" })).status === 400, "Rechazo sin motivo")
  check((await admin(`/api/payments/${pendingQr.id}`, "PATCH", { action: "reject", note: "No se acreditó" })).status === 200, "Rechazar QR")
  check((await admin(`/api/sales/${qr.body.sale.id}`)).body.sale.paymentStatus === "rejected", "La venta queda con el pago rechazado")

  // Ingresos y egresos.
  check((await admin("/api/cash", "POST", { action: "movement", kind: "expense", method: "cash", amount: 20000, description: "Compra de hielo" })).status === 201, "Egreso")
  check((await admin("/api/cash", "POST", { action: "movement", kind: "expense", method: "cash", amount: 999999, description: "Demasiado" })).status === 400, "Egreso mayor al efectivo")
  check((await admin("/api/cash", "POST", { action: "movement", kind: "income", method: "card", amount: 5000, description: "Ajuste" })).status === 201, "Ingreso con tarjeta")
  check((await admin("/api/cash", "POST", { action: "movement", kind: "income", method: "cash", amount: 5000, description: "" })).status === 400, "Movimiento sin motivo")
  state = await admin("/api/cash")
  check(state.body.summary.expectedCash === 130000 && state.body.summary.incomes === 5000 && state.body.summary.expenses === 20000, `Resumen tras movimientos: ${JSON.stringify(state.body.summary)}`)
  const transferRow = state.body.summary.byMethod.find((item) => item.method === "transfer")
  const qrRow = state.body.summary.byMethod.find((item) => item.method === "qr")
  check(transferRow.confirmed === 50000 && qrRow.rejected === 50000, "Totales por medio")

  // Medios de pago configurables.
  const custom = await admin("/api/payment-methods", "POST", { name: `Billetera ${suffix}`, kind: "qr" })
  check(custom.status === 201, `Nuevo medio: ${custom.status}`)
  const customCode = custom.body.items.find((item) => item.name === `Billetera ${suffix}`).code
  created.methods.push(customCode)
  check(custom.body.items.find((item) => item.code === customCode).needsVerification, "QR pide verificación")
  check((await admin(`/api/payment-methods/${customCode}`, "PATCH", { isActive: false })).status === 200, "Desactivar medio")
  check((await sell(customCode)).status === 400, "Medio desactivado no cobra")
  check((await admin("/api/payment-methods/cash", "PATCH", { isActive: false })).status === 400, "Efectivo siempre activo")

  // Cierre con arqueo.
  const closed = await admin("/api/cash", "POST", { action: "close", countedCash: 129000, notes: "Faltan mil" })
  check(closed.status === 200 && closed.body.session.difference === -1000 && closed.body.session.expectedCash === 130000, `Cierre: ${JSON.stringify(closed.body)}`)
  check((await admin("/api/cash", "POST", { action: "movement", kind: "income", method: "cash", amount: 1, description: "x" })).status === 409, "Sin caja abierta no hay movimientos")
  const report = await admin(`/api/cash/${opened.body.session.id}`)
  check(report.status === 200 && report.body.session.status === "closed" && report.body.movements.length === 2 && report.body.payments.length === 3, "Reporte de arqueo")
  const afterClose = await sell("card")
  check(afterClose.status === 201 && afterClose.body.sale.cashSessionId === null, "Venta con la caja cerrada queda sin turno")

  console.log("OK: caja, apertura única, cobros por medio, verificación de transferencias y QR, ingresos, egresos, medios configurables y arqueo")
} finally {
  if (created.sales.length) await db.query("DELETE FROM sales WHERE id = ANY($1::bigint[])", [created.sales])
  if (created.sessions.length) {
    await db.query("DELETE FROM payments WHERE session_id = ANY($1::bigint[])", [created.sessions])
    await db.query("DELETE FROM cash_movements WHERE session_id = ANY($1::bigint[])", [created.sessions])
    await db.query("DELETE FROM cash_sessions WHERE id = ANY($1::bigint[])", [created.sessions])
  }
  if (created.methods.length) await db.query("DELETE FROM payment_methods WHERE code = ANY($1::text[])", [created.methods])
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
