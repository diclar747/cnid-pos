// Prueba de compras y reportes: factura de compra con insumo y producto (suma stock), duplicado, filtros, ítems para
// los tableros, pago con caja, anulación (revierte stock), escaneo sin IA configurada y reporte de ventas con filtros.
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000).
import fs from "node:fs/promises"
import { randomBytes, scryptSync } from "node:crypto"
import pg from "pg"

const origin = process.env.POS_ORIGIN ?? "http://127.0.0.1:3000"
const env = await fs.readFile(".env.local", "utf8").catch(() => "")
const db = new pg.Client({ connectionString: process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() })
await db.connect()
const check = (condition, message) => { if (!condition) throw new Error(message) }
let cookie = ""
const api = async (path, method = "GET", body, raw) => {
  const response = await fetch(origin + path, { method, headers: { ...(body && !raw ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
    body: raw ?? (body ? JSON.stringify(body) : undefined) })
  const token = response.headers.get("set-cookie")?.split(";")[0]
  if (token) cookie = token
  return { status: response.status, body: await response.json().catch(() => ({})) }
}
const hash = (password) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}` }
const suffix = randomBytes(4).toString("hex")
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion" }).format(new Date())
const created = { users: [], suppliers: [], invoices: [], products: [], sessions: [] }
try {
  const admin = (await db.query("SELECT permissions FROM public.app_users WHERE restaurant_id = 1 AND role = 'admin' ORDER BY id LIMIT 1")).rows[0]
  const user = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id) VALUES ($1,$2,'Compras prueba','admin',$3,$4,1) RETURNING id`,
    [`compras-${suffix}@prueba.test`, `compras_${suffix}`, admin.permissions, hash("Prueba-2026!")])
  created.users.push(Number(user.rows[0].id))
  check((await api("/api/auth/login", "POST", { email: `compras-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login")

  const supplier = await api("/api/data/suppliers", "POST", { name: `Molino ${suffix}`, ruc: "80099999-1", contact: "", email: "", phone: "", address: "", category: "", rating: 0, isActive: true, creditLimit: 0, paymentTerms: "", contacts: [] })
  check(supplier.status === 201, `Proveedor ${supplier.status}`)
  const supplierId = supplier.body.item.id
  created.suppliers.push(supplierId)
  const product = await db.query(`INSERT INTO products (data) VALUES ($1::jsonb) RETURNING id`, [JSON.stringify({ name: `Gaseosa ${suffix}`, price: 8000, stock: 5, trackStock: true, category: "Bebidas", barcode: `T-${suffix}`, isActive: true })])
  const productId = Number(product.rows[0].id)
  created.products.push(productId)

  // Factura: harina (insumo, exenta de stock) + gaseosas vinculadas al producto (suman 24 al stock).
  const body = { supplierId, invoiceNumber: `001-001-${suffix}`, invoiceDate: today, condition: "cash", items: [
    { description: "Harina 000 x 50 kg", category: "Insumos", unit: "bolsa", quantity: 2, unitCost: 210000, taxRate: 10 },
    { description: "Gaseosa 500 ml", category: "Bebidas", unit: "u", quantity: 24, unitCost: 5500, taxRate: 10, productId, addStock: true },
    { description: "Huevos", category: "Almacén", unit: "maple", quantity: 1.5, unitCost: 21000, taxRate: 5 }] }
  const saved = await api("/api/purchase-invoices", "POST", body)
  check(saved.status === 201, `Factura ${saved.status} ${saved.body.error ?? ""}`)
  const invoice = saved.body.invoice
  created.invoices.push(invoice.id)
  check(invoice.total === 420000 + 132000 + 31500 && invoice.taxed10 === 552000 && invoice.tax10 === Math.round(552000 / 11) && invoice.tax5 === Math.round(31500 / 21), "Totales e IVA")
  check(invoice.supplierName === `Molino ${suffix}` && invoice.items.length === 3 && invoice.items[1].stockAdded === 24, "Proveedor e ítems")
  check(Number((await db.query("SELECT data->>'stock' AS stock FROM products WHERE id = $1", [productId])).rows[0].stock) === 29, "Stock sumado")
  check((await api("/api/purchase-invoices", "POST", body)).status === 409, "Factura duplicada rechazada")
  check((await api("/api/purchase-invoices", "POST", { ...body, supplierId: null, invoiceNumber: "x" })).status === 400, "Sin proveedor")

  // Filtros y tableros.
  const list = await api(`/api/purchase-invoices?from=${today}&to=${today}&supplier=${supplierId}&category=Insumos&q=harina`)
  check(list.status === 200 && list.body.items.some((item) => item.id === invoice.id) && list.body.byCategory.some((row) => row.category === "Bebidas"), "Filtros de compras")
  check((await api(`/api/purchase-invoices?from=${today}&to=${today}&supplier=${supplierId}&category=Limpieza`)).body.total === 0, "Filtro por categoría sin resultados")
  const lines = await api("/api/purchase-invoices?lines=1")
  check(lines.body.items.filter((line) => line.invoiceId === invoice.id).length === 3, "Ítems para tableros")

  // Pago con caja: sin caja abierta se rechaza (si hay una abierta, se registra el egreso y se revierte al anular).
  const open = (await db.query("SELECT id FROM cash_sessions WHERE status = 'open'")).rows[0]
  const cash = await api("/api/purchase-invoices", "POST", { ...body, invoiceNumber: `002-${suffix}`, paidFromCash: true, items: [body.items[0]] })
  if (open) {
    check(cash.status === 201 && cash.body.invoice.paidFromCash, "Pagado con la caja")
    created.invoices.push(cash.body.invoice.id)
    check((await api(`/api/purchase-invoices/${cash.body.invoice.id}`, "PATCH", { action: "cancel", reason: "prueba" })).status === 200, "Anular con caja")
  } else check(cash.status === 409, "Sin caja abierta no se paga con caja")

  // Anular: revierte el stock.
  check((await api(`/api/purchase-invoices/${invoice.id}`, "PATCH", { action: "cancel", reason: "" })).status === 400, "Motivo obligatorio")
  check((await api(`/api/purchase-invoices/${invoice.id}`, "PATCH", { action: "cancel", reason: "Cargada de prueba" })).status === 200, "Anular")
  check(Number((await db.query("SELECT data->>'stock' AS stock FROM products WHERE id = $1", [productId])).rows[0].stock) === 5, "Stock revertido")
  check((await api(`/api/purchase-invoices?from=${today}&to=${today}&supplier=${supplierId}&status=cancelled`)).body.total >= 1, "Filtro de anuladas")

  // Escaneo: valida el archivo; sin NIRO_API_KEY responde 503.
  const form = new FormData()
  form.append("file", new Blob([Buffer.from("hola")], { type: "text/plain" }), "x.txt")
  const scan = await api("/api/purchase-invoices/scan", "POST", null, form)
  check(scan.status === 415 || scan.status === 503, `Escaneo valida el formato (${scan.status})`)

  // Reporte de ventas.
  const report = await api(`/api/reports/sales?from=${today}&to=${today}&page=1&pageSize=5`)
  check(report.status === 200 && typeof report.body.summary.revenue === "number" && Array.isArray(report.body.byCategory) && report.body.pageSize === 5, "Reporte de ventas")
  const month = `${today.slice(0, 8)}01`
  const byCategory = await api(`/api/reports/sales?from=${month}&to=${today}&category=Bebidas&all=1`)
  check(byCategory.status === 200 && byCategory.body.rows.every((row) => row.lines.some((line) => line.category === "Bebidas")), "Filtro de ventas por categoría")
  check((await api(`/api/reports/sales?from=${today}&to=${month}`)).status === 400 || today === month, "Rango inválido")
  console.log("OK: compras (factura, IVA, stock, duplicado, filtros, caja, anulación, escaneo) y reporte de ventas")
} finally {
  for (const id of created.invoices) await db.query("DELETE FROM purchase_invoices WHERE id = $1", [id])
  for (const id of created.products) { await db.query("DELETE FROM stock_movements WHERE product_id = $1", [id]); await db.query("DELETE FROM products WHERE id = $1", [id]) }
  for (const id of created.suppliers) await db.query("DELETE FROM suppliers WHERE id = $1", [id])
  if (created.users.length) { await db.query("DELETE FROM public.app_sessions WHERE user_id = ANY($1::bigint[])", [created.users]); await db.query("DELETE FROM public.app_users WHERE id = ANY($1::bigint[])", [created.users]) }
  await db.end()
}
