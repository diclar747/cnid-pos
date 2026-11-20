import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"

// Reporte de ventas con filtros (fecha, categoría, producto, medio de pago, cajero, tipo y texto), totales agrupados
// y detalle paginado. Con ?all=1 devuelve todas las filas (para exportar a Excel o PDF).

const dateKey = /^\d{4}-\d{2}-\d{2}$/
const fallbackMethod: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", qr: "QR", credit: "Cuenta corriente" }
const typeName: Record<string, string> = { dineIn: "En el local", delivery: "Delivery", pickup: "Retiro" }
const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("es")

type Line = { productId: number | null; name: string; category: string; quantity: number; subtotal: number }
type Row = { id: number; date: string; total: number; lines: Line[]; matched: number; methods: { code: string; name: string; amount: number }[];
  userId: number | null; userName: string; customerName: string; customerRuc: string; orderType: string; tableLabel: string; waiterName: string }

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "view_reports")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const params = request.nextUrl.searchParams
  const from = params.get("from") ?? ""
  const to = params.get("to") ?? ""
  if (!dateKey.test(from) || !dateKey.test(to) || from > to) return NextResponse.json({ error: "Rango de fechas inválido." }, { status: 400 })
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 400) return NextResponse.json({ error: "Elegí un rango de hasta 400 días." }, { status: 400 })
  const category = params.get("category")?.trim() ?? ""
  const productId = Number(params.get("product")) || null
  const method = params.get("method")?.trim() ?? ""
  const cashier = Number(params.get("user")) || null
  const orderType = params.get("type")?.trim() ?? ""
  const text = normalize(params.get("q")?.trim().slice(0, 80))
  const sort = params.get("sort") ?? "date_desc"
  const all = params.get("all") === "1"
  const pageSize = Math.min(100, Math.max(5, Number(params.get("pageSize")) || 20))
  const page = Math.max(1, Number(params.get("page")) || 1)

  const [salesResult, productsResult] = await Promise.all([
    db.query(`SELECT s.id, s.data, COALESCE(p.methods, '[]'::json) AS methods FROM sales s
      LEFT JOIN LATERAL (SELECT JSON_AGG(JSON_BUILD_OBJECT('code', method, 'name', method_name, 'amount', amount) ORDER BY id) AS methods
        FROM payments WHERE sale_id = s.id AND status <> 'rejected') p ON TRUE
      WHERE s.data ? 'date' AND ((s.data->>'date')::timestamptz AT TIME ZONE 'America/Asuncion')::date BETWEEN $1::date AND $2::date
      ORDER BY (s.data->>'date')::timestamptz DESC`, [from, to]),
    db.query(`SELECT id, data->>'name' AS name, COALESCE(NULLIF(data->>'category', ''), 'Sin categoría') AS category FROM products`),
  ])
  const productInfo = new Map<number, { name: string; category: string }>(productsResult.rows.map((row) => [Number(row.id), { name: row.name, category: row.category }]))

  const rows: Row[] = salesResult.rows.map((row) => {
    const data = row.data ?? {}
    const lines: Line[] = (Array.isArray(data.items) ? data.items : []).map((item: any) => {
      const id = Number(item.productId ?? item.product?.id) || null
      const info = id ? productInfo.get(id) : undefined
      const quantity = Number(item.quantity) || 0
      return { productId: id, name: String(item.productName ?? item.product?.name ?? info?.name ?? "Producto"), category: info?.category ?? "Sin categoría",
        quantity, subtotal: Number(item.subtotal ?? item.total ?? (Number(item.price) || 0) * quantity) || 0 }
    })
    const paid = (row.methods as any[]).map((entry) => ({ code: String(entry.code), name: String(entry.name || fallbackMethod[entry.code] || entry.code), amount: Number(entry.amount) || 0 }))
    const legacy = String(data.paymentMethod ?? "")
    return { id: Number(row.id), date: String(data.date), total: Number(data.total) || 0, lines, matched: 0,
      methods: paid.length ? paid : legacy ? [{ code: legacy, name: fallbackMethod[legacy] ?? legacy, amount: Number(data.total) || 0 }] : [],
      userId: data.userId == null ? null : Number(data.userId), userName: String(data.userName ?? ""), customerName: String(data.customerName ?? ""),
      customerRuc: String(data.customerRuc ?? ""), orderType: String(data.orderType ?? "dineIn"), tableLabel: String(data.tableLabel ?? ""), waiterName: String(data.waiterName ?? "") }
  })

  // Opciones de filtro con lo que hay en el período (antes de filtrar).
  const options = {
    categories: [...new Set(rows.flatMap((row) => row.lines.map((line) => line.category)))].sort((a, b) => a.localeCompare(b, "es")),
    products: [...new Map(rows.flatMap((row) => row.lines.filter((line) => line.productId).map((line) => [line.productId as number, { id: line.productId as number, name: line.name, category: line.category }]))).values()]
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
    methods: [...new Map(rows.flatMap((row) => row.methods.map((entry) => [entry.code, { code: entry.code, name: entry.name }]))).values()],
    users: [...new Map(rows.filter((row) => row.userId).map((row) => [row.userId as number, { id: row.userId as number, name: row.userName }])).values()],
  }

  const lineFilter = Boolean(category || productId)
  const lineMatches = (line: Line) => (!category || line.category === category) && (!productId || line.productId === productId)
  const filtered = rows.filter((row) => {
    if (method && !row.methods.some((entry) => entry.code === method)) return false
    if (cashier && row.userId !== cashier) return false
    if (orderType && row.orderType !== orderType) return false
    if (lineFilter && !row.lines.some(lineMatches)) return false
    if (text && !normalize(`${row.id} #${row.id} ${row.customerName} ${row.customerRuc} ${row.userName} ${row.tableLabel} ${row.waiterName} ${row.lines.map((line) => line.name).join(" ")}`).includes(text)) return false
    return true
  })
  for (const row of filtered) row.matched = lineFilter ? row.lines.filter(lineMatches).reduce((sum, line) => sum + line.subtotal, 0) : row.total

  const add = <K,>(map: Map<K, any>, key: K, init: () => any, update: (entry: any) => void) => { const entry = map.get(key) ?? init(); update(entry); map.set(key, entry) }
  const byProduct = new Map<string, any>(), byCategory = new Map<string, any>(), byMethod = new Map<string, any>(), byUser = new Map<string, any>(), byDay = new Map<string, any>(), byType = new Map<string, any>()
  let units = 0
  for (const row of filtered) {
    const sold = lineFilter ? row.lines.filter(lineMatches) : row.lines
    const categories = new Set<string>()
    for (const line of sold) {
      units += line.quantity
      categories.add(line.category)
      add(byProduct, line.productId ? `p${line.productId}` : `n${line.name}`, () => ({ productId: line.productId, name: line.name, category: line.category, quantity: 0, revenue: 0, sales: 0 }),
        (entry) => { entry.quantity += line.quantity; entry.revenue += line.subtotal; entry.sales += 1 })
      add(byCategory, line.category, () => ({ category: line.category, quantity: 0, revenue: 0, sales: 0 }), (entry) => { entry.quantity += line.quantity; entry.revenue += line.subtotal })
    }
    for (const name of categories) byCategory.get(name).sales += 1
    const share = row.total > 0 ? row.matched / row.total : 0
    for (const entry of row.methods) add(byMethod, entry.code, () => ({ code: entry.code, name: entry.name, amount: 0, sales: 0 }), (item) => { item.amount += Math.round(entry.amount * share); item.sales += 1 })
    add(byUser, String(row.userId ?? row.userName), () => ({ name: row.userName || "Sin usuario", revenue: 0, sales: 0 }), (entry) => { entry.revenue += row.matched; entry.sales += 1 })
    add(byType, row.orderType, () => ({ type: row.orderType, name: typeName[row.orderType] ?? row.orderType, revenue: 0, sales: 0 }), (entry) => { entry.revenue += row.matched; entry.sales += 1 })
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion" }).format(new Date(row.date))
    add(byDay, day, () => ({ date: day, revenue: 0, sales: 0 }), (entry) => { entry.revenue += row.matched; entry.sales += 1 })
  }
  const revenue = filtered.reduce((sum, row) => sum + row.matched, 0)
  const sorted = [...filtered].sort((a, b) => sort === "date_asc" ? Date.parse(a.date) - Date.parse(b.date)
    : sort === "total_desc" ? b.matched - a.matched : sort === "total_asc" ? a.matched - b.matched : Date.parse(b.date) - Date.parse(a.date))
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pages)
  const pageRows = all ? sorted : sorted.slice((current - 1) * pageSize, current * pageSize)
  const byRevenue = (a: any, b: any) => b.revenue - a.revenue

  return NextResponse.json({
    range: { from, to },
    summary: { sales: filtered.length, revenue, units, average: filtered.length ? Math.round(revenue / filtered.length) : 0,
      products: byProduct.size, lineFilter },
    byProduct: [...byProduct.values()].sort(byRevenue),
    byCategory: [...byCategory.values()].sort(byRevenue),
    byMethod: [...byMethod.values()].sort((a, b) => b.amount - a.amount),
    byUser: [...byUser.values()].sort(byRevenue),
    byType: [...byType.values()].sort(byRevenue),
    byDay: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    options,
    rows: pageRows.map(({ matched, ...row }) => ({ ...row, amount: matched, typeName: typeName[row.orderType] ?? row.orderType })),
    total: sorted.length, page: current, pages, pageSize,
  })
}
