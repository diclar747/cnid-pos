import type { Product } from "@/app/data/products"
import type { Purchase } from "@/app/context/purchases-context"
import type { Expense, Sale } from "@/app/context/sales-context"
import { businessDateKey } from "@/lib/business-date"

export type DashboardPeriod = 7 | 30 | 90 | 365

const paymentLabels: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  unknown: "Sin especificar",
}

function addDays(day: string, offset: number) {
  const date = new Date(day + "T12:00:00Z")
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function weekdayIndex(day: string) {
  return (new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7
}

export function comparisonChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? null : "nuevo"
  return Math.round(((current - previous) / previous) * 100)
}

export function buildDashboardAnalytics(
  sales: Sale[],
  expenses: Expense[],
  purchases: Purchase[],
  products: Product[],
  period: DashboardPeriod,
  today: string,
) {
  const start = addDays(today, 1 - period)
  const previousEnd = addDays(start, -1)
  const previousStart = addDays(start, -period)
  const byDay = new Map<string, { amount: number; orders: number }>()
  const previousByDay = new Map<string, { amount: number; orders: number }>()
  const payments = new Map<string, { amount: number; count: number }>()
  const productSales = new Map<string, { name: string; quantity: number; revenue: number }>()
  const weekdays = Array.from({ length: 7 }, (_, index) => ({
    name: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][index],
    amount: 0,
    orders: 0,
  }))
  const recentSales: Sale[] = []
  let revenue = 0
  let previousRevenue = 0
  let orders = 0
  let previousOrders = 0
  let todayRevenue = 0
  let todayOrders = 0
  let salesWithDetail = 0
  let earliestSaleDay = ""

  for (const sale of sales) {
    if (Number.isFinite(new Date(sale.date).getTime())) {
      recentSales.push(sale)
      recentSales.sort((a, b) => b.date.localeCompare(a.date))
      if (recentSales.length > 5) recentSales.pop()
    }

    const day = businessDateKey(sale.date)
    if (day && (!earliestSaleDay || day < earliestSaleDay)) earliestSaleDay = day
    if (day >= previousStart && day <= previousEnd) {
      previousRevenue += sale.total
      previousOrders += 1
      const entry = previousByDay.get(day) ?? { amount: 0, orders: 0 }
      entry.amount += sale.total
      entry.orders += 1
      previousByDay.set(day, entry)
      continue
    }
    if (day < start || day > today) continue

    revenue += sale.total
    orders += 1
    if (day === today) {
      todayRevenue += sale.total
      todayOrders += 1
    }
    const entry = byDay.get(day) ?? { amount: 0, orders: 0 }
    entry.amount += sale.total
    entry.orders += 1
    byDay.set(day, entry)

    const weekday = weekdays[weekdayIndex(day)]
    weekday.amount += sale.total
    weekday.orders += 1

    const method = paymentLabels[sale.paymentMethod] ? sale.paymentMethod : "unknown"
    const payment = payments.get(method) ?? { amount: 0, count: 0 }
    payment.amount += sale.total
    payment.count += 1
    payments.set(method, payment)

    if (sale.items.length) salesWithDetail += 1
    for (const item of sale.items) {
      const name = item.productName || item.product?.name
      if (!name) continue
      const key = item.productId > 0 ? String(item.productId) : name
      const product = productSales.get(key) ?? { name, quantity: 0, revenue: 0 }
      product.quantity += Number(item.quantity) || 0
      product.revenue += Number(item.subtotal ?? item.total) || 0
      productSales.set(key, product)
    }
  }

  let purchaseTotal = 0
  let previousPurchaseTotal = 0
  for (const purchase of purchases) {
    const day = businessDateKey(purchase.date)
    if (day >= start && day <= today) purchaseTotal += purchase.total
    else if (day >= previousStart && day <= previousEnd) previousPurchaseTotal += purchase.total
  }

  let expenseTotal = 0
  for (const expense of expenses) {
    const day = businessDateKey(expense.date)
    if (day >= start && day <= today) expenseTotal += expense.amount
  }

  const activeProducts = products.filter((product) => product.isActive !== false)
  const trackedProducts = activeProducts.filter((product) => product.trackStock !== false)
  const lowStock = trackedProducts.filter((product) => product.stock > 0 && product.stock <= 5).length
  const outOfStock = trackedProducts.filter((product) => product.stock <= 0).length
  const timeline = Array.from({ length: period }, (_, index) => {
    const day = addDays(start, index)
    const previousDay = addDays(previousStart, index)
    return {
      day,
      amount: byDay.get(day)?.amount ?? 0,
      previousAmount: previousByDay.get(previousDay)?.amount ?? 0,
      orders: byDay.get(day)?.orders ?? 0,
      previousOrders: previousByDay.get(previousDay)?.orders ?? 0,
    }
  })

  return {
    start,
    end: today,
    revenue,
    previousRevenue,
    orders,
    previousOrders,
    hasComparableHistory: Boolean(earliestSaleDay && earliestSaleDay <= previousStart),
    averageTicket: orders ? revenue / orders : 0,
    previousAverageTicket: previousOrders ? previousRevenue / previousOrders : 0,
    todayRevenue,
    todayOrders,
    purchaseTotal,
    previousPurchaseTotal,
    expenseTotal,
    activeProducts: activeProducts.length,
    trackedProducts: trackedProducts.length,
    untrackedProducts: activeProducts.length - trackedProducts.length,
    lowStock,
    outOfStock,
    salesWithDetail,
    timeline,
    weekdays,
    paymentMethods: [...payments.entries()]
      .map(([key, value]) => ({ key, name: paymentLabels[key], value: value.amount, count: value.count }))
      .sort((a, b) => b.value - a.value),
    topProducts: [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    recentSales,
  }
}
