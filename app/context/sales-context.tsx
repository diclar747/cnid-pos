"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { apiRequest } from "@/lib/api-client"
import { businessDateKey } from "@/lib/business-date"

export interface SaleItem {
  product: { id: number; name: string; price: number }
  productId: number
  productName: string
  quantity: number
  price: number
  subtotal: number
  total: number
}

export interface Sale {
  id: number
  date: string
  total: number
  items: SaleItem[]
  paymentMethod: "cash" | "card" | "transfer"
  customerName?: string
  customerRuc?: string
  cashReceived?: number
  change?: number
  userId: number
  userName: string
}

export interface Expense {
  id: number
  date: string
  description: string
  amount: number
  category: string
  userId?: number
  userName?: string
  createdBy?: string
}

interface SalesContextType {
  sales: Sale[]
  salesLoading: boolean
  salesError: string | null
  expenses: Expense[]
  addSale: (sale: Record<string, unknown>) => Promise<Sale>
  addExpense: (expense: Omit<Expense, "id">) => Promise<void>
  updateExpense: (id: number, changes: Partial<Expense>) => Promise<void>
  deleteExpense: (id: number) => Promise<void>
  getSalesByDate: (startDate: string, endDate: string) => Sale[]
  getExpensesByDate: (startDate: string, endDate: string) => Expense[]
  getTotalSales: (startDate?: string, endDate?: string) => number
  getTotalExpenses: (startDate?: string, endDate?: string) => number
  getSalesByPaymentMethod: (method: string) => Sale[]
  getTopProducts: (limit?: number) => { productName: string; quantity: number; revenue: number }[]
  getDailySales: () => { date: string; total: number }[]
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export function SalesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [salesLoading, setSalesLoading] = useState(true)
  const [salesError, setSalesError] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    if (!user) { setSales([]); setExpenses([]); setSalesLoading(false); setSalesError(null); return }
    let active = true
    if (user.permissions.includes("view_reports") || user.permissions.includes("manage_sales")) {
      setSalesLoading(true)
      setSalesError(null)
      apiRequest<{ items: Sale[] }>("/api/data/sales")
        .then((result) => { if (active) setSales(result.items) })
        .catch((error) => {
          console.error("No se pudieron cargar las ventas", error)
          if (active) setSalesError("No se pudieron cargar las ventas. Revisá la conexión con la base local.")
        })
        .finally(() => { if (active) setSalesLoading(false) })
    } else { setSalesLoading(false); setSalesError(null) }
    if (user.permissions.includes("manage_expenses") || user.permissions.includes("view_expenses")) {
      apiRequest<{ items: Expense[] }>("/api/data/expenses")
        .then((result) => { if (active) setExpenses(result.items) })
        .catch((error) => console.error("No se pudieron cargar los gastos", error))
    }
    return () => { active = false }
  }, [user])

  const addSale = async (sale: Record<string, unknown>) => {
    const result = await apiRequest<{ sale: Sale }>("/api/checkout", { method: "POST", body: JSON.stringify(sale) })
    setSales((current) => [result.sale, ...current])
    window.dispatchEvent(new Event("products:changed"))
    return result.sale
  }

  const addExpense = async (expense: Omit<Expense, "id">) => {
    const result = await apiRequest<{ item: Expense }>("/api/data/expenses", { method: "POST", body: JSON.stringify(expense) })
    setExpenses((current) => [result.item, ...current])
  }

  const updateExpense = async (id: number, changes: Partial<Expense>) => {
    const current = expenses.find((item) => item.id === id)
    if (!current) throw new Error("Gasto no encontrado.")
    const result = await apiRequest<{ item: Expense }>(`/api/data/expenses/${id}`, {
      method: "PUT", body: JSON.stringify({ ...current, ...changes }),
    })
    setExpenses((items) => items.map((item) => item.id === id ? result.item : item))
  }

  const deleteExpense = async (id: number) => {
    await apiRequest(`/api/data/expenses/${id}`, { method: "DELETE" })
    setExpenses((items) => items.filter((item) => item.id !== id))
  }

  const inRange = (date: string, start: string, end: string) => businessDateKey(date) >= start && businessDateKey(date) <= end
  const getSalesByDate = (startDate: string, endDate: string) => sales.filter((item) => inRange(item.date, startDate, endDate))
  const getExpensesByDate = (startDate: string, endDate: string) => expenses.filter((item) => inRange(item.date, startDate, endDate))
  const getTotalSales = (startDate?: string, endDate?: string) =>
    (startDate && endDate ? getSalesByDate(startDate, endDate) : sales).reduce((sum, item) => sum + item.total, 0)
  const getTotalExpenses = (startDate?: string, endDate?: string) =>
    (startDate && endDate ? getExpensesByDate(startDate, endDate) : expenses).reduce((sum, item) => sum + item.amount, 0)
  const getSalesByPaymentMethod = (method: string) => sales.filter((item) => item.paymentMethod === method)

  const getTopProducts = (limit = 10) => {
    const summary = new Map<string, { quantity: number; revenue: number }>()
    for (const sale of sales) for (const item of sale.items) {
      const previous = summary.get(item.productName) ?? { quantity: 0, revenue: 0 }
      summary.set(item.productName, { quantity: previous.quantity + item.quantity, revenue: previous.revenue + item.subtotal })
    }
    return [...summary.entries()]
      .map(([productName, values]) => ({ productName, ...values }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
  }

  const getDailySales = () => {
    const summary = new Map<string, number>()
    for (const sale of sales) { const day = businessDateKey(sale.date); summary.set(day, (summary.get(day) ?? 0) + sale.total) }
    return [...summary.entries()].map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date))
  }

  return <SalesContext.Provider value={{ sales, salesLoading, salesError, expenses, addSale, addExpense, updateExpense, deleteExpense,
    getSalesByDate, getExpensesByDate, getTotalSales, getTotalExpenses, getSalesByPaymentMethod,
    getTopProducts, getDailySales }}>
    {children}
  </SalesContext.Provider>
}

export function useSales() {
  const context = useContext(SalesContext)
  if (!context) throw new Error("useSales must be used within a SalesProvider")
  return context
}
