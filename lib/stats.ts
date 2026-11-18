import "server-only"

import type { QueryResult, QueryResultRow } from "pg"

// Estadísticas del restaurante calculadas en PostgreSQL sobre ventas, órdenes y comandas reales.

type Queryable = { query: <T extends QueryResultRow = any>(sql: string, values?: unknown[]) => Promise<QueryResult<T>> }

export const STATS_TZ = /^[A-Za-z_]+\/[A-Za-z_]+$/.test(process.env.STATS_TIMEZONE ?? "") ? process.env.STATS_TIMEZONE! : "America/Asuncion"
const dayPattern = /^\d{4}-\d{2}-\d{2}$/

export function parseRange(fromRaw: string | null, toRaw: string | null) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: STATS_TZ }).format(new Date())
  const to = toRaw && dayPattern.test(toRaw) ? toRaw : today
  const fallback = new Date(`${to}T12:00:00Z`); fallback.setUTCDate(fallback.getUTCDate() - 29)
  let from = fromRaw && dayPattern.test(fromRaw) ? fromRaw : fallback.toISOString().slice(0, 10)
  if (from > to) from = to
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
  if (days > 366) throw new Error("El período no puede superar un año.")
  const previousTo = new Date(`${from}T12:00:00Z`); previousTo.setUTCDate(previousTo.getUTCDate() - 1)
  const previousFrom = new Date(previousTo); previousFrom.setUTCDate(previousFrom.getUTCDate() - (days - 1))
  return { from, to, days, previous: { from: previousFrom.toISOString().slice(0, 10), to: previousTo.toISOString().slice(0, 10) } }
}

// Ventas del período: excluye pagos rechazados.
const SALES = (fromParam: string, toParam: string) => `SELECT s.id, s.data, s.created_at, (s.data->>'total')::bigint AS total,
    s.created_at AT TIME ZONE '${STATS_TZ}' AS local_at
  FROM sales s
  WHERE s.created_at >= (${fromParam}::date)::timestamp AT TIME ZONE '${STATS_TZ}'
    AND s.created_at < (${toParam}::date + 1)::timestamp AT TIME ZONE '${STATS_TZ}'
    AND COALESCE(s.data->>'paymentStatus', 'confirmed') <> 'rejected'`

const num = (value: unknown) => Number(value ?? 0)

async function kpis(db: Queryable, from: string, to: string) {
  const row = (await db.query(`WITH s AS (${SALES("$1", "$2")})
    SELECT COUNT(*) AS sales, COALESCE(SUM(total), 0) AS revenue, COUNT(DISTINCT NULLIF(data->>'customerId', '')) AS customers,
      COALESCE(SUM((data->>'deliveryFee')::bigint), 0) AS delivery_fees FROM s`, [from, to])).rows[0]
  const orders = (await db.query(`SELECT COUNT(*) AS orders, COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      COUNT(*) FILTER (WHERE confirmation = 'rejected') AS rejected
    FROM service_orders WHERE created_at >= ($1::date)::timestamp AT TIME ZONE '${STATS_TZ}' AND created_at < ($2::date + 1)::timestamp AT TIME ZONE '${STATS_TZ}'`, [from, to])).rows[0]
  const sales = num(row.sales), revenue = num(row.revenue)
  return { sales, revenue, averageTicket: sales ? Math.round(revenue / sales) : 0, customers: num(row.customers), deliveryFees: num(row.delivery_fees),
    orders: num(orders.orders), cancelled: num(orders.cancelled), rejected: num(orders.rejected) }
}

export async function restaurantStats(db: Queryable, range: ReturnType<typeof parseRange>) {
  const { from, to } = range
  const params = [from, to]
  const [current, previous, daily, weekly, monthly, heat, products, unsold, customers, cashiers, waiters, sources, types, payments, prep, delivery, couriers] = await Promise.all([
    kpis(db, from, to),
    kpis(db, range.previous.from, range.previous.to),
    db.query(`WITH s AS (${SALES("$1", "$2")}), d AS (SELECT generate_series($1::date, $2::date, '1 day')::date AS day)
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COUNT(s.id) AS sales, COALESCE(SUM(s.total), 0) AS revenue
      FROM d LEFT JOIN s ON s.local_at::date = d.day GROUP BY d.day ORDER BY d.day`, params),
    db.query(`WITH s AS (${SALES("($1::date - 83)", "$1")}),
        w AS (SELECT generate_series(date_trunc('week', $1::date - 77), date_trunc('week', $1::date), '1 week')::date AS week)
      SELECT to_char(w.week, 'YYYY-MM-DD') AS week, COUNT(s.id) AS sales, COALESCE(SUM(s.total), 0) AS revenue
      FROM w LEFT JOIN s ON date_trunc('week', s.local_at)::date = w.week GROUP BY w.week ORDER BY w.week`, [to]),
    db.query(`WITH s AS (${SALES("(date_trunc('month', $1::date) - INTERVAL '11 months')::date", "$1")}),
        m AS (SELECT generate_series(date_trunc('month', $1::date) - INTERVAL '11 months', date_trunc('month', $1::date), '1 month')::date AS month)
      SELECT to_char(m.month, 'YYYY-MM') AS month, COUNT(s.id) AS sales, COALESCE(SUM(s.total), 0) AS revenue
      FROM m LEFT JOIN s ON date_trunc('month', s.local_at)::date = m.month GROUP BY m.month ORDER BY m.month`, [to]),
    db.query(`WITH s AS (${SALES("$1", "$2")}) SELECT EXTRACT(ISODOW FROM local_at)::int AS dow, EXTRACT(HOUR FROM local_at)::int AS hour,
      COUNT(*) AS sales, COALESCE(SUM(total), 0) AS revenue FROM s GROUP BY 1, 2`, params),
    db.query(`WITH s AS (${SALES("$1", "$2")}), i AS (SELECT jsonb_array_elements(CASE WHEN jsonb_typeof(data->'items') = 'array' THEN data->'items' ELSE '[]'::jsonb END) AS item FROM s)
      SELECT COALESCE(item->>'productId', item->'product'->>'id') AS product_id,
        MAX(COALESCE(item->>'productName', item->'product'->>'name', 'Producto')) AS name,
        SUM(COALESCE((item->>'quantity')::numeric, 0)) AS quantity,
        SUM(COALESCE((item->>'subtotal')::numeric, (item->>'price')::numeric * (item->>'quantity')::numeric, 0)) AS revenue
      FROM i GROUP BY 1 ORDER BY quantity DESC`, params),
    db.query(`WITH s AS (${SALES("$1", "$2")}), sold AS (SELECT DISTINCT COALESCE(item->>'productId', item->'product'->>'id') AS id
        FROM s, jsonb_array_elements(CASE WHEN jsonb_typeof(data->'items') = 'array' THEN data->'items' ELSE '[]'::jsonb END) item)
      SELECT p.id, p.data->>'name' AS name, p.data->>'category' AS category FROM products p
      WHERE COALESCE((p.data->>'isActive')::boolean, TRUE) AND p.id::text NOT IN (SELECT id FROM sold WHERE id IS NOT NULL)
      ORDER BY p.data->>'name' LIMIT 15`, params),
    db.query(`WITH s AS (${SALES("$1", "$2")}) SELECT data->>'customerId' AS id, MAX(data->>'customerName') AS name, COUNT(*) AS sales, SUM(total) AS revenue,
        MAX(created_at) AS last_at FROM s WHERE NULLIF(data->>'customerId', '') IS NOT NULL GROUP BY 1 ORDER BY sales DESC, revenue DESC LIMIT 10`, params),
    db.query(`WITH s AS (${SALES("$1", "$2")}) SELECT COALESCE(NULLIF(data->>'userName', ''), 'Sin registrar') AS name, COUNT(*) AS sales, SUM(total) AS revenue
      FROM s GROUP BY 1 ORDER BY revenue DESC LIMIT 15`, params),
    db.query(`WITH s AS (${SALES("$1", "$2")}) SELECT data->>'waiterName' AS name, COUNT(*) AS sales, SUM(total) AS revenue,
        COUNT(DISTINCT data->>'tableLabel') AS tables FROM s WHERE NULLIF(data->>'waiterName', '') IS NOT NULL GROUP BY 1 ORDER BY revenue DESC LIMIT 15`, params),
    db.query(`SELECT COALESCE(source, 'pos') AS source, COUNT(*) AS orders, COUNT(*) FILTER (WHERE status = 'paid') AS paid, COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) AS revenue
      FROM service_orders WHERE created_at >= ($1::date)::timestamp AT TIME ZONE '${STATS_TZ}' AND created_at < ($2::date + 1)::timestamp AT TIME ZONE '${STATS_TZ}' GROUP BY 1 ORDER BY orders DESC`, params),
    db.query(`WITH s AS (${SALES("$1", "$2")}) SELECT COALESCE(data->>'orderType', 'dineIn') AS type, COUNT(*) AS sales, SUM(total) AS revenue FROM s GROUP BY 1 ORDER BY sales DESC`, params),
    db.query(`WITH s AS (${SALES("$1", "$2")}) SELECT COALESCE(data->>'paymentMethod', 'cash') AS method, MAX(COALESCE(data->>'paymentMethodName', '')) AS name,
        COUNT(*) AS sales, SUM(total) AS revenue FROM s GROUP BY 1 ORDER BY revenue DESC`, params),
    db.query(`WITH t AS (SELECT k.id, k.created_at, o.order_type,
          (SELECT MIN(h.created_at) FROM order_status_history h WHERE h.ticket_id = k.id AND h.event = 'ticket_status' AND h.status = 'preparing') AS accepted_at,
          (SELECT MIN(h.created_at) FROM order_status_history h WHERE h.ticket_id = k.id AND h.event = 'ticket_status' AND h.status = 'ready') AS ready_at,
          (SELECT MIN(h.created_at) FROM order_status_history h WHERE h.ticket_id = k.id AND h.event = 'ticket_status' AND h.status = 'delivered') AS delivered_at
        FROM kitchen_tickets k JOIN service_orders o ON o.id = k.order_id
        WHERE k.created_at >= ($1::date)::timestamp AT TIME ZONE '${STATS_TZ}' AND k.created_at < ($2::date + 1)::timestamp AT TIME ZONE '${STATS_TZ}')
      SELECT COUNT(*) AS tickets, COUNT(ready_at) AS measured,
        AVG(EXTRACT(EPOCH FROM ready_at - created_at)) FILTER (WHERE ready_at IS NOT NULL) AS prep_seconds,
        AVG(EXTRACT(EPOCH FROM accepted_at - created_at)) FILTER (WHERE accepted_at IS NOT NULL) AS accept_seconds,
        AVG(EXTRACT(EPOCH FROM delivered_at - created_at)) FILTER (WHERE delivered_at IS NOT NULL AND order_type = 'delivery') AS delivery_seconds,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ready_at - created_at)) FILTER (WHERE ready_at IS NOT NULL) AS prep_p90
      FROM t`, params),
    db.query(`WITH s AS (${SALES("$1", "$2")}) SELECT COALESCE(NULLIF(data->>'deliveryZoneName', ''), 'Sin zona') AS zone, COUNT(*) AS sales, SUM(total) AS revenue,
        COALESCE(SUM((data->>'deliveryFee')::bigint), 0) AS fees FROM s WHERE data->>'orderType' = 'delivery' GROUP BY 1 ORDER BY sales DESC`, params),
    db.query(`WITH s AS (${SALES("$1", "$2")}) SELECT data->>'courierName' AS name, COUNT(*) AS deliveries, SUM(total) AS revenue
      FROM s WHERE data->>'orderType' = 'delivery' AND NULLIF(data->>'courierName', '') IS NOT NULL GROUP BY 1 ORDER BY deliveries DESC`, params),
  ])
  const productRows = products.rows.map((row) => ({ id: row.product_id == null ? null : Number(row.product_id), name: row.name, quantity: num(row.quantity), revenue: Math.round(num(row.revenue)) }))
  const p = prep.rows[0]
  const minutes = (seconds: unknown) => seconds == null ? null : Math.round(num(seconds) / 6) / 10
  return {
    range, timezone: STATS_TZ, current, previous,
    daily: daily.rows.map((row) => ({ day: row.day, sales: num(row.sales), revenue: num(row.revenue) })),
    weekly: weekly.rows.map((row) => ({ week: row.week, sales: num(row.sales), revenue: num(row.revenue) })),
    monthly: monthly.rows.map((row) => ({ month: row.month, sales: num(row.sales), revenue: num(row.revenue) })),
    heatmap: heat.rows.map((row) => ({ dow: num(row.dow), hour: num(row.hour), sales: num(row.sales), revenue: num(row.revenue) })),
    topProducts: productRows.slice(0, 10),
    topByRevenue: [...productRows].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    leastSold: productRows.length > 10 ? productRows.slice(-10).reverse() : [],
    unsold: unsold.rows.map((row) => ({ id: Number(row.id), name: row.name, category: row.category ?? "" })),
    customers: customers.rows.map((row) => ({ id: Number(row.id), name: row.name || "Cliente", sales: num(row.sales), revenue: num(row.revenue), lastAt: new Date(row.last_at).toISOString() })),
    cashiers: cashiers.rows.map((row) => ({ name: row.name, sales: num(row.sales), revenue: num(row.revenue) })),
    waiters: waiters.rows.map((row) => ({ name: row.name, sales: num(row.sales), revenue: num(row.revenue), tables: num(row.tables) })),
    sources: sources.rows.map((row) => ({ source: row.source, orders: num(row.orders), paid: num(row.paid), revenue: num(row.revenue) })),
    orderTypes: types.rows.map((row) => ({ type: row.type, sales: num(row.sales), revenue: num(row.revenue) })),
    paymentMethods: payments.rows.map((row) => ({ method: row.method, name: row.name, sales: num(row.sales), revenue: num(row.revenue) })),
    kitchen: { tickets: num(p.tickets), measured: num(p.measured), prepMinutes: minutes(p.prep_seconds), acceptMinutes: minutes(p.accept_seconds),
      deliveryMinutes: minutes(p.delivery_seconds), prepP90Minutes: minutes(p.prep_p90) },
    delivery: { zones: delivery.rows.map((row) => ({ zone: row.zone, sales: num(row.sales), revenue: num(row.revenue), fees: num(row.fees) })),
      couriers: couriers.rows.map((row) => ({ name: row.name, deliveries: num(row.deliveries), revenue: num(row.revenue) })) },
  }
}

export type RestaurantStats = Awaited<ReturnType<typeof restaurantStats>>
