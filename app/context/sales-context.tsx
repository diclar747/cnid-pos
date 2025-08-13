"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface Sale {
  id: number
  date: string
  total: number
  items: SaleItem[]
  paymentMethod: "cash" | "card" | "transfer"
  customerName?: string
  customerPhone?: string
  userId: number
  userName: string
}

export interface SaleItem {
  id: number
  productId: number
  productName: string
  quantity: number
  price: number
  total: number
}

export interface Expense {
  id: number
  date: string
  description: string
  amount: number
  category: string
  userId: number
  userName: string
}

interface SalesContextType {
  sales: Sale[]
  expenses: Expense[]
  addSale: (sale: Omit<Sale, "id">) => void
  addExpense: (expense: Omit<Expense, "id">) => void
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
  const [sales, setSales] = useState<Sale[]>([
    {
      id: 1,
      date: "2024-01-15",
      total: 45000,
      paymentMethod: "cash",
      customerName: "Juan Pérez",
      userId: 1,
      userName: "Admin",
      items: [
        {
          id: 1,
          productId: 1,
          productName: "Hamburguesa Clásica",
          quantity: 2,
          price: 15000,
          total: 30000,
        },
        {
          id: 2,
          productId: 6,
          productName: "Coca Cola",
          quantity: 3,
          price: 5000,
          total: 15000,
        },
      ],
    },
    {
      id: 2,
      date: "2024-01-15",
      total: 32000,
      paymentMethod: "card",
      customerName: "María González",
      userId: 1,
      userName: "Admin",
      items: [
        {
          id: 3,
          productId: 2,
          productName: "Pizza Margherita",
          quantity: 1,
          price: 25000,
          total: 25000,
        },
        {
          id: 4,
          productId: 7,
          productName: "Té Helado",
          quantity: 1,
          price: 7000,
          total: 7000,
        },
      ],
    },
  ])

  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: 1,
      date: "2024-01-15",
      description: "Compra de ingredientes",
      amount: 150000,
      category: "Inventario",
      userId: 1,
      userName: "Admin",
    },
    {
      id: 2,
      date: "2024-01-14",
      description: "Pago de electricidad",
      amount: 80000,
      category: "Servicios",
      userId: 1,
      userName: "Admin",
    },
  ])

  const addSale = (sale: Omit<Sale, "id">) => {
    const newSale: Sale = {
      ...sale,
      id: Date.now(),
    }
    setSales((prev) => [...prev, newSale])
  }

  const addExpense = (expense: Omit<Expense, "id">) => {
    const newExpense: Expense = {
      ...expense,
      id: Date.now(),
    }
    setExpenses((prev) => [...prev, newExpense])
  }

  const getSalesByDate = (startDate: string, endDate: string): Sale[] => {
    return sales.filter((sale) => {
      const saleDate = new Date(sale.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return saleDate >= start && saleDate <= end
    })
  }

  const getExpensesByDate = (startDate: string, endDate: string): Expense[] => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return expenseDate >= start && expenseDate <= end
    })
  }

  const getTotalSales = (startDate?: string, endDate?: string): number => {
    let filteredSales = sales
    if (startDate && endDate) {
      filteredSales = getSalesByDate(startDate, endDate)
    }
    return filteredSales.reduce((total, sale) => total + sale.total, 0)
  }

  const getTotalExpenses = (startDate?: string, endDate?: string): number => {
    let filteredExpenses = expenses
    if (startDate && endDate) {
      filteredExpenses = getExpensesByDate(startDate, endDate)
    }
    return filteredExpenses.reduce((total, expense) => total + expense.amount, 0)
  }

  const getSalesByPaymentMethod = (method: string): Sale[] => {
    return sales.filter((sale) => sale.paymentMethod === method)
  }

  const getTopProducts = (limit = 10): { productName: string; quantity: number; revenue: number }[] => {
    const productStats: { [key: string]: { quantity: number; revenue: number } } = {}

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!productStats[item.productName]) {
          productStats[item.productName] = { quantity: 0, revenue: 0 }
        }
        productStats[item.productName].quantity += item.quantity
        productStats[item.productName].revenue += item.total
      })
    })

    return Object.entries(productStats)
      .map(([productName, stats]) => ({
        productName,
        quantity: stats.quantity,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
  }

  const getDailySales = (): { date: string; total: number }[] => {
    const dailyStats: { [key: string]: number } = {}

    sales.forEach((sale) => {
      if (!dailyStats[sale.date]) {
        dailyStats[sale.date] = 0
      }
      dailyStats[sale.date] += sale.total
    })

    return Object.entries(dailyStats)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  return (
    <SalesContext.Provider
      value={{
        sales,
        expenses,
        addSale,
        addExpense,
        getSalesByDate,
        getExpensesByDate,
        getTotalSales,
        getTotalExpenses,
        getSalesByPaymentMethod,
        getTopProducts,
        getDailySales,
      }}
    >
      {children}
    </SalesContext.Provider>
  )
}

export function useSales() {
  const context = useContext(SalesContext)
  if (context === undefined) {
    throw new Error("useSales must be used within a SalesProvider")
  }
  return context
}
