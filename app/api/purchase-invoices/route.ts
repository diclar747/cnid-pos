import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { createInvoice, loadInvoices, PurchaseError } from "@/lib/purchase-invoices"

export const runtime = "nodejs"

const dateKey = /^\d{4}-\d{2}-\d{2}$/

// GET: facturas de compra con filtros (fecha, proveedor, categoría, condición, estado, texto) y paginación.
//      ?all=1 devuelve todas las del filtro (exportar). ?lines=1 devuelve los ítems vigentes aplanados (tableros de compras).
// POST: registra una factura (a mano o leída con IA).
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_purchases") && !hasPermission(user, "manage_suppliers")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const params = request.nextUrl.searchParams

  if (params.get("lines") === "1") {
    const result = await db.query(`SELECT i.id, i.invoice_id, i.description, i.category, i.unit, i.quantity, i.unit_cost, i.total, i.product_id,
        f.supplier_id, f.supplier_name, f.invoice_number, f.invoice_date, f.condition, f.created_by_name, f.created_at
      FROM purchase_invoice_items i JOIN purchase_invoices f ON f.id = i.invoice_id
      WHERE f.status = 'active' AND f.invoice_date >= CURRENT_DATE - INTERVAL '730 days'
      ORDER BY f.invoice_date DESC, f.id DESC, i.position LIMIT 20000`)
    return NextResponse.json({ items: result.rows.map((row) => ({
      id: Number(row.id), invoiceId: Number(row.invoice_id), productId: row.product_id == null ? 0 : Number(row.product_id), productName: row.description,
      category: row.category, unit: row.unit, quantity: Number(row.quantity), unitPrice: Number(row.unit_cost), total: Number(row.total),
      supplier: row.supplier_name, supplierId: row.supplier_id == null ? null : Number(row.supplier_id), invoiceNumber: row.invoice_number,
      condition: row.condition, date: `${row.invoice_date instanceof Date ? row.invoice_date.toISOString().slice(0, 10) : String(row.invoice_date).slice(0, 10)}T12:00:00-03:00`,
      createdBy: row.created_by_name })) })
  }

  const from = params.get("from") ?? ""
  const to = params.get("to") ?? ""
  if ((from && !dateKey.test(from)) || (to && !dateKey.test(to))) return NextResponse.json({ error: "Fecha inválida." }, { status: 400 })
  const where: string[] = []
  const values: unknown[] = []
  const add = (sql: string, value: unknown) => { values.push(value); where.push(sql.replace("?", `$${values.length}`)) }
  if (from) add("f.invoice_date >= ?::date", from)
  if (to) add("f.invoice_date <= ?::date", to)
  const status = params.get("status") ?? "active"
  if (status === "active" || status === "cancelled") add("f.status = ?", status)
  const supplier = Number(params.get("supplier"))
  if (Number.isSafeInteger(supplier) && supplier > 0) add("f.supplier_id = ?", supplier)
  const condition = params.get("condition")
  if (condition === "cash" || condition === "credit") add("f.condition = ?", condition)
  const category = params.get("category")?.trim()
  if (category) add("EXISTS (SELECT 1 FROM purchase_invoice_items c WHERE c.invoice_id = f.id AND c.category = ?)", category)
  const q = params.get("q")?.trim().slice(0, 80)
  if (q) add(`(f.invoice_number ILIKE ? OR f.supplier_name ILIKE $${values.length + 1} OR f.supplier_ruc ILIKE $${values.length + 1} OR f.notes ILIKE $${values.length + 1}
    OR EXISTS (SELECT 1 FROM purchase_invoice_items d WHERE d.invoice_id = f.id AND d.description ILIKE $${values.length + 1}))`, `%${q}%`)
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const order = params.get("sort") === "total_desc" ? "f.total DESC, f.id DESC" : params.get("sort") === "date_asc" ? "f.invoice_date, f.id" : "f.invoice_date DESC, f.id DESC"
  const pageSize = Math.min(100, Math.max(5, Number(params.get("pageSize")) || 20))
  const all = params.get("all") === "1"

  const [summary, bySupplier, byCategory, options] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0)::bigint AS total, COALESCE(SUM(tax5 + tax10), 0)::bigint AS tax,
      COALESCE(SUM(total) FILTER (WHERE condition = 'credit'), 0)::bigint AS credit FROM purchase_invoices f ${clause}`, values),
    db.query(`SELECT f.supplier_id, f.supplier_name, COUNT(*)::int AS count, SUM(f.total)::bigint AS total FROM purchase_invoices f ${clause}
      GROUP BY f.supplier_id, f.supplier_name ORDER BY total DESC LIMIT 50`, values),
    db.query(`SELECT COALESCE(NULLIF(i.category, ''), 'Sin categoría') AS category, SUM(i.total)::bigint AS total, COUNT(DISTINCT f.id)::int AS count
      FROM purchase_invoices f JOIN purchase_invoice_items i ON i.invoice_id = f.id ${clause} GROUP BY 1 ORDER BY total DESC`, values),
    db.query(`SELECT ARRAY(SELECT DISTINCT category FROM purchase_invoice_items WHERE category <> '' ORDER BY category) AS categories`),
  ])
  const count = Number(summary.rows[0].count)
  const pages = Math.max(1, Math.ceil(count / pageSize))
  const page = Math.min(pages, Math.max(1, Number(params.get("page")) || 1))
  const ids = await db.query(`SELECT f.id FROM purchase_invoices f ${clause} ORDER BY ${order} ${all ? "LIMIT 5000" : `LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`}`, values)
  const items = await loadInvoices(db, ids.rows.map((row) => Number(row.id)))
  return NextResponse.json({
    items, total: count, page, pages, pageSize,
    summary: { count, total: Number(summary.rows[0].total), tax: Number(summary.rows[0].tax), credit: Number(summary.rows[0].credit) },
    bySupplier: bySupplier.rows.map((row) => ({ supplierId: row.supplier_id == null ? null : Number(row.supplier_id), name: row.supplier_name, count: row.count, total: Number(row.total) })),
    byCategory: byCategory.rows.map((row) => ({ category: row.category, count: row.count, total: Number(row.total) })),
    options: { categories: options.rows[0].categories as string[] },
  })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_purchases")) return NextResponse.json({ error: "Sin permiso para registrar compras." }, { status: 403 })
  const body = await request.json().catch(() => null)
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const id = await createInvoice(client, body, user)
    const [invoice] = await loadInvoices(client, [id])
    await client.query("COMMIT")
    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    await client.query("ROLLBACK")
    if (error instanceof PurchaseError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Purchase invoice failed", error)
    return NextResponse.json({ error: "No se pudo registrar la compra." }, { status: 500 })
  } finally { client.release() }
}
