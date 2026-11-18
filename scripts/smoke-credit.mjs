// Prueba del cobro en una ventana: pago dividido (efectivo + tarjeta), venta a crédito con cuenta corriente,
// límite, abonos que entran en la caja, ajustes y resumen de caja.
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
const created = { users: [], products: [], sales: [], sessions: [], customers: [] }

try {
  check(!(await db.query("SELECT 1 FROM cash_sessions WHERE status = 'open'")).rows[0], "Hay una caja abierta en la base local: cerrala antes de correr la prueba.")
  for (const [role, perms] of [["admin", ["access_pos", "manage_sales", "manage_company", "manage_products", "view_reports"]], ["cashier", ["access_pos", "manage_sales"]]]) {
    const r = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id)
      VALUES ($1,$2,$3,$4,$5,$6,1) RETURNING id`, [`credit-${role}-${suffix}@prueba.test`, `credit_${role}_${suffix}`, `Crédito ${role}`, role, perms, hash("Prueba-2026!")])
    created.users.push(Number(r.rows[0].id))
  }
  const admin = session(), cashier = session()
  check((await admin("/api/auth/login", "POST", { email: `credit-admin-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login admin")
  check((await cashier("/api/auth/login", "POST", { email: `credit-cashier-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login caja")

  const product = await admin("/api/data/products", "POST", { name: `Menú crédito ${suffix}`, price: 50000, category: "Pruebas", image: "", stock: 0, trackStock: false, barcode: `CRED-${suffix}`, description: "", isActive: true })
  check(product.status === 201, `Producto: ${product.status}`)
  created.products.push(product.body.item.id)
  const items = [{ id: product.body.item.id, quantity: 1 }]
  const sell = async (payments, extra = {}) => {
    const result = await cashier("/api/checkout", "POST", { items, payments, orderType: "pickup", ...extra })
    if (result.body.sale?.id) created.sales.push(result.body.sale.id)
    return result
  }

  const methods = await admin("/api/payment-methods")
  check(methods.body.items.some((item) => item.code === "credit" && item.kind === "credit"), "Existe el medio «Crédito»")
  const opened = await cashier("/api/cash", "POST", { action: "open", amount: 0 })
  check(opened.status === 201, `Abrir caja: ${opened.status}`)
  created.sessions.push(opened.body.session.id)

  // Pago dividido: Gs 30.000 en efectivo (entrega 50.000) + 20.000 con tarjeta.
  const split = await sell([{ method: "cash", amount: 30000 }, { method: "card", amount: 20000 }], { cashReceived: 50000 })
  check(split.status === 201 && split.body.sale.paymentMethod === "mixed" && split.body.sale.change === 20000 && split.body.sale.payments.length === 2,
    `Pago dividido: ${JSON.stringify(split.body)}`)
  check((await sell([{ method: "cash", amount: 30000 }, { method: "card", amount: 10000 }])).status === 400, "Los pagos tienen que sumar el total")
  check((await sell([{ method: "cash", amount: 50000 }], { cashReceived: 40000 })).status === 400, "Efectivo insuficiente")
  const legacy = await sell(undefined, { paymentMethod: "cash", cashReceived: 50000 })
  check(legacy.status === 201 && legacy.body.sale.paymentMethod === "cash" && legacy.body.sale.change === 0, "El formato anterior (un medio) sigue funcionando")

  // Crédito: exige cliente con crédito habilitado y respeta el límite.
  check((await sell([{ method: "credit", amount: 50000 }])).status === 400, "A cuenta sin cliente")
  const plain = await cashier("/api/customers", "POST", { name: `Sin crédito ${suffix}`, phone: "0981000001" })
  created.customers.push(plain.body.item.id)
  check(plain.status === 201 && plain.body.item.creditEnabled === false, "Cliente común")
  const denied = await sell([{ method: "credit", amount: 50000 }], { customerId: plain.body.item.id })
  check(denied.status === 400 && /crédito/.test(denied.body.error), `Cliente sin crédito: ${JSON.stringify(denied.body)}`)

  const regular = await cashier("/api/customers", "POST", { name: `Cliente fijo ${suffix}`, phone: "0981000002", creditEnabled: true, creditLimit: 80000, billingCycle: "weekly" })
  check(regular.status === 201 && regular.body.item.creditEnabled && regular.body.item.creditLimit === 80000 && regular.body.item.billingCycle === "weekly", `Cliente con crédito: ${JSON.stringify(regular.body)}`)
  const cid = regular.body.item.id
  created.customers.push(cid)
  const onCredit = await sell([{ method: "credit", amount: 50000 }], { customerId: cid })
  check(onCredit.status === 201 && onCredit.body.sale.creditBalance === 50000 && onCredit.body.sale.customerName === `Cliente fijo ${suffix}`, `Venta a cuenta: ${JSON.stringify(onCredit.body)}`)
  check((await sell([{ method: "credit", amount: 50000 }], { customerId: cid })).status === 409, "Supera el límite")
  const mixed = await sell([{ method: "cash", amount: 20000 }, { method: "credit", amount: 30000 }], { customerId: cid, cashReceived: 20000 })
  check(mixed.status === 201 && mixed.body.sale.creditBalance === 80000 && mixed.body.sale.creditAmount === 30000, `Efectivo + cuenta: ${JSON.stringify(mixed.body)}`)

  let account = await cashier(`/api/customers/${cid}/account`)
  check(account.status === 200 && account.body.account.balance === 80000 && account.body.account.ledger.length === 2 && account.body.account.period.visits === 2
    && account.body.account.cycleLabel === "Semanal", `Cuenta: ${JSON.stringify(account.body)}`)

  // Abonos: entran en la caja; no pueden superar el saldo. Ajustes solo la administración.
  check((await cashier(`/api/customers/${cid}/account`, "POST", { action: "payment", method: "cash", amount: 90000 })).status === 400, "Abono mayor al saldo")
  check((await cashier(`/api/customers/${cid}/account`, "POST", { action: "payment", method: "credit", amount: 1000 })).status === 400, "No se abona «a cuenta»")
  const paid = await cashier(`/api/customers/${cid}/account`, "POST", { action: "payment", method: "cash", amount: 30000, note: "Paga la semana" })
  check(paid.status === 201 && paid.body.result.balance === 50000 && paid.body.item.balance === 50000, `Abono: ${JSON.stringify(paid.body)}`)
  const transfer = await cashier(`/api/customers/${cid}/account`, "POST", { action: "payment", method: "transfer", amount: 10000, reference: "OP-1" })
  check(transfer.status === 201 && transfer.body.result.status === "pending" && transfer.body.result.balance === 40000, "Abono por transferencia queda a verificar")
  check((await cashier(`/api/customers/${cid}/account`, "POST", { action: "adjust", amount: -5000, note: "Descuento" })).status === 403, "La caja no ajusta saldos")
  check((await admin(`/api/customers/${cid}/account`, "POST", { action: "adjust", amount: -5000, note: "" })).status === 400, "Ajuste sin motivo")
  const adjusted = await admin(`/api/customers/${cid}/account`, "POST", { action: "adjust", amount: -5000, note: "Descuento por cliente fijo" })
  check(adjusted.status === 201 && adjusted.body.result.balance === 35000, "Ajuste")
  account = await cashier(`/api/customers/${cid}/account`)
  check(account.body.account.ledger.length === 5 && account.body.account.ledger[0].kind === "adjustment" && account.body.account.ledger[0].balanceAfter === 35000, "Movimientos en orden")

  // Si caja rechaza la transferencia del abono, la deuda vuelve a la cuenta.
  const rejected = await cashier(`/api/payments/${transfer.body.result.paymentId}`, "PATCH", { action: "reject", note: "No llegó" })
  check(rejected.status === 200 && rejected.body.payment.purpose === "account", `Rechazo del abono: ${JSON.stringify(rejected.body)}`)
  account = await cashier(`/api/customers/${cid}/account`)
  check(account.body.account.balance === 45000 && account.body.account.ledger[0].description.includes("rechazado"), "El rechazo devuelve el saldo")

  const debtors = await cashier("/api/customers?balance=1")
  check(debtors.body.items.some((item) => item.id === cid && item.balance === 45000) && debtors.body.receivable >= 45000, "Listado de clientes con saldo")

  // Caja: las ventas a cuenta no suman efectivo; los abonos en efectivo sí.
  const state = await cashier("/api/cash")
  const summary = state.body.summary
  const credit = summary.byMethod.find((row) => row.method === "credit")
  check(credit?.confirmed === 80000 && summary.creditSales === 80000, `Ventas a cuenta en caja: ${JSON.stringify(summary)}`)
  check(summary.cashSales === 30000 + 50000 + 20000 && summary.cashAccountPayments === 30000 && summary.expectedCash === 130000, `Efectivo esperado: ${JSON.stringify(summary)}`)
  check(summary.accountTotal === 30000 && summary.accountPayments.length === 2, `Abonos en el resumen: ${JSON.stringify(summary.accountPayments)}`)

  const receipt = await cashier(`/api/data/sales`)
  check(receipt.status === 200, "Ventas listadas")
  console.log("Prueba de cobro y cuenta corriente: OK")
} finally {
  if (created.customers.length) await db.query("DELETE FROM customer_ledger WHERE customer_id = ANY($1::bigint[])", [created.customers])
  if (created.sales.length) await db.query("DELETE FROM sales WHERE id = ANY($1::bigint[])", [created.sales])
  if (created.sessions.length) {
    await db.query("DELETE FROM payments WHERE session_id = ANY($1::bigint[])", [created.sessions])
    await db.query("DELETE FROM cash_movements WHERE session_id = ANY($1::bigint[])", [created.sessions])
    await db.query("DELETE FROM cash_sessions WHERE id = ANY($1::bigint[])", [created.sessions])
  }
  if (created.customers.length) await db.query("DELETE FROM customers WHERE id = ANY($1::bigint[])", [created.customers])
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
