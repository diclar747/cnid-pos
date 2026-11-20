import "server-only"

import type { QueryResult, QueryResultRow } from "pg"
import { openSessionId } from "./cash"
import { invoiceTotals, type PurchaseInvoice, type PurchaseItemDraft, type ScannedInvoice, type TaxRate } from "./purchase-invoice-types"

// Facturas de compra: alta (con stock y pago de caja opcionales), anulación (revierte stock y caja) y lectura.

type Queryable = { query: <T extends QueryResultRow = any>(sql: string, values?: unknown[]) => Promise<QueryResult<T>> }

export class PurchaseError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}

const text = (value: unknown, max: number) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""
const dateKey = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : null
const dateOut = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : null
export const rucKey = (value: string) => value.replace(/\s/g, "").split("-")[0].replace(/\D/g, "")

export function mapInvoice(row: any, items: any[] = []): PurchaseInvoice {
  return {
    id: Number(row.id), supplierId: row.supplier_id == null ? null : Number(row.supplier_id), supplierName: row.supplier_name, supplierRuc: row.supplier_ruc,
    invoiceNumber: row.invoice_number, stamp: row.stamp, invoiceDate: dateOut(row.invoice_date) ?? "", condition: row.condition, dueDate: dateOut(row.due_date),
    status: row.status, exempt: Number(row.exempt), taxed5: Number(row.taxed5), taxed10: Number(row.taxed10), tax5: Number(row.tax5), tax10: Number(row.tax10),
    total: Number(row.total), notes: row.notes, source: row.source, paidFromCash: row.cash_movement_id != null, createdByName: row.created_by_name,
    createdAt: new Date(row.created_at).toISOString(), cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : null,
    cancelledByName: row.cancelled_by_name, cancelReason: row.cancel_reason,
    items: items.map((item) => ({ id: Number(item.id), description: item.description, category: item.category, unit: item.unit, quantity: Number(item.quantity),
      unitCost: Number(item.unit_cost), taxRate: Number(item.tax_rate) as TaxRate, total: Number(item.total),
      productId: item.product_id == null ? null : Number(item.product_id), productName: item.product_name ?? "", stockAdded: Number(item.stock_added) })),
  }
}

export async function loadInvoices(db: Queryable, ids: number[]): Promise<PurchaseInvoice[]> {
  if (!ids.length) return []
  const [heads, items] = await Promise.all([
    db.query("SELECT * FROM purchase_invoices WHERE id = ANY($1::bigint[])", [ids]),
    db.query(`SELECT i.*, p.data->>'name' AS product_name FROM purchase_invoice_items i LEFT JOIN products p ON p.id = i.product_id
      WHERE i.invoice_id = ANY($1::bigint[]) ORDER BY i.invoice_id, i.position, i.id`, [ids]),
  ])
  const byInvoice = new Map<number, any[]>()
  for (const item of items.rows) byInvoice.set(Number(item.invoice_id), [...(byInvoice.get(Number(item.invoice_id)) ?? []), item])
  const map = new Map(heads.rows.map((row) => [Number(row.id), mapInvoice(row, byInvoice.get(Number(row.id)))]))
  return ids.map((id) => map.get(id)).filter((invoice): invoice is PurchaseInvoice => Boolean(invoice))
}

export function validItems(raw: unknown): PurchaseItemDraft[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new PurchaseError("Agregá al menos un producto o insumo a la factura.")
  if (raw.length > 200) throw new PurchaseError("La factura admite hasta 200 ítems.")
  return raw.map((item: any, index) => {
    const description = text(item?.description, 160)
    const quantity = Math.round(Number(item?.quantity) * 1000) / 1000
    const unitCost = Math.round(Number(item?.unitCost) * 100) / 100
    const taxRate = Number(item?.taxRate)
    const productId = item?.productId == null || item.productId === "" ? null : Number(item.productId)
    if (!description) throw new PurchaseError(`Ítem ${index + 1}: falta la descripción.`)
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000) throw new PurchaseError(`Ítem ${index + 1}: cantidad inválida.`)
    if (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > 10_000_000_000) throw new PurchaseError(`Ítem ${index + 1}: precio inválido.`)
    if (![0, 5, 10].includes(taxRate)) throw new PurchaseError(`Ítem ${index + 1}: IVA inválido.`)
    if (productId !== null && (!Number.isSafeInteger(productId) || productId <= 0)) throw new PurchaseError(`Ítem ${index + 1}: producto inválido.`)
    return { description, category: text(item?.category, 60), unit: text(item?.unit, 20) || "u", quantity, unitCost, taxRate: taxRate as TaxRate,
      productId, addStock: productId !== null && item?.addStock !== false }
  })
}

export async function createInvoice(client: Queryable, body: any, user: { id: string | number; name: string }): Promise<number> {
  const supplierId = Number(body?.supplierId)
  if (!Number.isSafeInteger(supplierId) || supplierId <= 0) throw new PurchaseError("Elegí el proveedor.")
  const supplier = (await client.query("SELECT id, data FROM suppliers WHERE id = $1", [supplierId])).rows[0]
  if (!supplier) throw new PurchaseError("Proveedor no encontrado.", 404)
  const invoiceDate = dateKey(body?.invoiceDate)
  if (!invoiceDate) throw new PurchaseError("Fecha de factura inválida.")
  const condition = body?.condition === "credit" ? "credit" : "cash"
  const dueDate = condition === "credit" ? dateKey(body?.dueDate) : null
  const items = validItems(body?.items)
  const totals = invoiceTotals(items)
  const supplierName = text(supplier.data?.name, 160) || "Proveedor"
  const supplierRuc = text(supplier.data?.ruc, 30) || text(body?.supplierRuc, 30)
  const invoiceNumber = text(body?.invoiceNumber, 30)
  const source = body?.source === "scan" ? "scan" : "manual"

  let cashMovementId: number | null = null
  if (body?.paidFromCash === true && condition === "cash" && totals.total > 0) {
    const sessionId = await openSessionId(client, true)
    if (!sessionId) throw new PurchaseError("No hay una caja abierta para pagar la compra en efectivo. Abrí la caja o desmarcá «Pagado con la caja».", 409)
    const movement = await client.query(`INSERT INTO cash_movements (session_id, kind, method, amount, description, user_id, user_name)
      VALUES ($1, 'expense', 'cash', $2, $3, $4, $5) RETURNING id`,
      [sessionId, totals.total, `Compra ${supplierName}${invoiceNumber ? ` · factura ${invoiceNumber}` : ""}`.slice(0, 200), Number(user.id), user.name])
    cashMovementId = Number(movement.rows[0].id)
  }

  let invoiceId: number
  try {
    const saved = await client.query(`INSERT INTO purchase_invoices (supplier_id, supplier_name, supplier_ruc, invoice_number, stamp, invoice_date, condition, due_date,
        exempt, taxed5, taxed10, tax5, tax10, total, notes, source, cash_movement_id, created_by, created_by_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`, [
      supplierId, supplierName, supplierRuc, invoiceNumber, text(body?.stamp, 20), invoiceDate, condition, dueDate,
      totals.exempt, totals.taxed5, totals.taxed10, totals.tax5, totals.tax10, totals.total, text(body?.notes, 1000), source, cashMovementId, Number(user.id), user.name])
    invoiceId = Number(saved.rows[0].id)
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new PurchaseError(`La factura ${invoiceNumber} de ${supplierName} ya está cargada.`, 409)
    throw error
  }

  for (const [position, item] of items.entries()) {
    let stockAdded = 0
    if (item.productId !== null) {
      const product = (await client.query("SELECT data FROM products WHERE id = $1 FOR UPDATE", [item.productId])).rows[0]?.data
      if (!product) throw new PurchaseError(`El producto vinculado a «${item.description}» ya no existe.`, 404)
      const units = Math.round(item.quantity)
      if (item.addStock && product.trackStock !== false && units > 0) {
        const previous = Number(product.stock) || 0
        const next = previous + units
        await client.query(`UPDATE products SET data = jsonb_set(data, '{stock}', to_jsonb($1::integer)), updated_at = NOW() WHERE id = $2`, [next, item.productId])
        await client.query(`INSERT INTO stock_movements (product_id, previous_stock, new_stock, reason, user_id) VALUES ($1, $2, $3, 'purchase', $4)`,
          [item.productId, previous, next, Number(user.id)])
        stockAdded = units
      }
    }
    await client.query(`INSERT INTO purchase_invoice_items (invoice_id, position, description, category, unit, quantity, unit_cost, tax_rate, total, product_id, stock_added)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [invoiceId, position, item.description, item.category, item.unit, item.quantity, item.unitCost, item.taxRate,
      Math.round(item.quantity * item.unitCost), item.productId, stockAdded])
  }
  return invoiceId
}

export async function cancelInvoice(client: Queryable, id: number, reason: string, user: { id: string | number; name: string }) {
  const invoice = (await client.query("SELECT * FROM purchase_invoices WHERE id = $1 FOR UPDATE", [id])).rows[0]
  if (!invoice) throw new PurchaseError("Factura no encontrada.", 404)
  if (invoice.status === "cancelled") throw new PurchaseError("La factura ya está anulada.", 409)
  const items = await client.query("SELECT product_id, stock_added FROM purchase_invoice_items WHERE invoice_id = $1 AND stock_added > 0 AND product_id IS NOT NULL", [id])
  for (const item of items.rows) {
    const product = (await client.query("SELECT data FROM products WHERE id = $1 FOR UPDATE", [item.product_id])).rows[0]?.data
    if (!product) continue
    const previous = Number(product.stock) || 0
    const next = Math.max(0, previous - Number(item.stock_added))
    await client.query(`UPDATE products SET data = jsonb_set(data, '{stock}', to_jsonb($1::integer)), updated_at = NOW() WHERE id = $2`, [next, item.product_id])
    await client.query(`INSERT INTO stock_movements (product_id, previous_stock, new_stock, reason, user_id) VALUES ($1, $2, $3, 'purchase_cancelled', $4)`,
      [item.product_id, previous, next, Number(user.id)])
  }
  let cashNote = ""
  if (invoice.cash_movement_id) {
    // El egreso de caja se quita solo si esa caja sigue abierta; si ya se cerró, queda registrado en su arqueo.
    const removed = await client.query(`DELETE FROM cash_movements m USING cash_sessions s WHERE m.id = $1 AND s.id = m.session_id AND s.status = 'open' RETURNING m.id`, [invoice.cash_movement_id])
    if (!removed.rows[0]) cashNote = "El pago ya figura en una caja cerrada; registrá un ingreso si devolvieron el dinero."
  }
  await client.query(`UPDATE purchase_invoices SET status = 'cancelled', cancelled_at = NOW(), cancelled_by_name = $2, cancel_reason = $3,
    cash_movement_id = CASE WHEN $4 THEN cash_movement_id ELSE NULL END WHERE id = $1`, [id, user.name, reason.slice(0, 300), Boolean(cashNote)])
  return cashNote
}

/** Convierte la respuesta de Niro (mode=invoice) en un borrador para el formulario. */
export async function scannedDraft(db: Queryable, data: any): Promise<ScannedInvoice> {
  const warnings: string[] = []
  const num = (value: unknown) => {
    if (typeof value === "number") return value
    const raw = String(value ?? "").replace(/[^\d,.-]/g, "")
    // Formato paraguayo: 1.705.000 o 1.705.000,50
    const normalized = /,\d{1,2}$/.test(raw) ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/[.,](?=\d{3}(\D|$))/g, "")
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const emisor = data?.emisor ?? data?.issuer ?? {}
  const comprobante = data?.comprobante ?? data?.invoice ?? {}
  const totales = data?.totales ?? data?.totals ?? {}
  const rawDate = String(comprobante.fecha ?? comprobante.date ?? "")
  const match = rawDate.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/) ?? null
  const iso = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/)
  const invoiceDate = iso ? `${iso[1]}-${iso[2]}-${iso[3]}`
    : match ? `${match[3].length === 2 ? `20${match[3]}` : match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : ""
  if (!invoiceDate) warnings.push("No se leyó la fecha: completala.")
  const iva5 = num(totales.iva_5), iva10 = num(totales.iva_10), exentas = num(totales.exentas)
  const defaultRate: TaxRate = iva10 > 0 ? 10 : iva5 > 0 ? 5 : exentas > 0 ? 0 : 10
  if (iva5 > 0 && iva10 > 0) warnings.push("La factura tiene IVA 5 % y 10 %: revisá la tasa de cada ítem.")

  const products = (await db.query("SELECT id, data->>'name' AS name FROM products WHERE COALESCE((data->>'isActive')::boolean, TRUE)")).rows
  const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
  const byName = new Map(products.map((row) => [normalize(String(row.name ?? "")), Number(row.id)]))

  const rawItems: any[] = Array.isArray(data?.items) ? data.items : []
  const items: PurchaseItemDraft[] = rawItems.map((item) => {
    const description = text(item.descripcion ?? item.description ?? item.detalle, 160) || "Ítem"
    let quantity = num(item.cantidad ?? item.quantity ?? 1) || 1
    const lineTotal = num(item.total ?? item.subtotal ?? item.importe)
    let unitCost = num(item.precio_unitario ?? item.unit_price ?? item.precio)
    if (!unitCost && lineTotal) unitCost = lineTotal / quantity
    if (lineTotal && unitCost && Math.abs(quantity * unitCost - lineTotal) > Math.max(2, lineTotal * 0.02)) {
      // Cantidad mal leída: se respeta el total de la línea.
      quantity = Math.round((lineTotal / unitCost) * 1000) / 1000 || quantity
    }
    const rawRate = Number(String(item.iva ?? item.tasa_iva ?? item.tasa ?? item.impuesto ?? "").replace(/\D/g, ""))
    const taxRate: TaxRate = rawRate === 5 ? 5 : rawRate === 10 ? 10 : rawRate === 0 && String(item.iva ?? item.tasa_iva ?? "").trim() !== "" ? 0 : defaultRate
    const productId = byName.get(normalize(description)) ?? null
    return { description, category: "", unit: text(item.unidad ?? item.unit, 20) || "u", quantity, unitCost: Math.round(unitCost * 100) / 100, taxRate, productId, addStock: productId !== null }
  })
  if (!items.length) warnings.push("No se leyeron ítems: cargalos a mano.")

  const ruc = text(emisor.ruc, 30)
  let matchId: number | null = null
  const suppliers = (await db.query("SELECT id, data->>'name' AS name, data->>'ruc' AS ruc FROM suppliers")).rows
  if (ruc) matchId = Number(suppliers.find((row) => rucKey(String(row.ruc ?? "")) && rucKey(String(row.ruc ?? "")) === rucKey(ruc))?.id ?? 0) || null
  const name = text(emisor.razon_social ?? emisor.nombre ?? emisor.name, 160)
  if (!matchId && name) matchId = Number(suppliers.find((row) => normalize(String(row.name ?? "")) === normalize(name))?.id ?? 0) || null

  const total = num(totales.total)
  const computed = invoiceTotals(items).total
  if (total && Math.abs(total - computed) > Math.max(5, total * 0.01)) warnings.push(`El total leído (${Math.round(total).toLocaleString("es-PY")}) no coincide con la suma de los ítems (${computed.toLocaleString("es-PY")}): revisá cantidades y precios.`)
  const conditionText = String(comprobante.condicion_venta ?? comprobante.condition ?? "").toLowerCase()
  return {
    supplier: { name, ruc, stamp: text(emisor.timbrado ?? comprobante.timbrado, 20), matchId },
    invoiceNumber: text(comprobante.numero ?? comprobante.number, 30), invoiceDate,
    condition: conditionText.includes("cr") ? "credit" : "cash", items,
    totals: { exempt: exentas, tax5: iva5, tax10: iva10, total }, warnings,
  }
}
