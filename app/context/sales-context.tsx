"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import type { Product } from "./cart-context"

export interface Sale {
  id: number
  items: Array<{
    product: Product
    quantity: number
    subtotal: number
  }>
  subtotal: number
  tax: number
  total: number
  paymentMethod: "card" | "cash"
  cashier: string
  date: string
  receiptNumber: string
  customerName?: string
  customerRuc?: string
  customerAddress?: string
}

export interface Expense {
  id: number
  description: string
  amount: number
  category: string
  date: string
  createdBy: string
}

interface SalesContextType {
  sales: Sale[]
  expenses: Expense[]
  addSale: (sale: Omit<Sale, "id">) => void
  addExpense: (expense: Omit<Expense, "id">) => void
  updateExpense: (id: number, expense: Partial<Expense>) => void
  deleteExpense: (id: number) => void
  getTotalSales: (startDate?: string, endDate?: string) => number
  getTotalExpenses: (startDate?: string, endDate?: string) => number
  getSalesByDate: (startDate: string, endDate: string) => Sale[]
  getExpensesByDate: (startDate: string, endDate: string) => Expense[]
  getLastSale: () => Sale | null
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export function SalesProvider({ children }: { children: ReactNode }) {
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    // Cargar ventas desde localStorage
    const savedSales = localStorage.getItem("sales")
    if (savedSales) {
      try {
        setSales(JSON.parse(savedSales))
      } catch (error) {
        console.error("Error al cargar ventas:", error)
      }
    }

    // Cargar gastos desde localStorage
    const savedExpenses = localStorage.getItem("expenses")
    if (savedExpenses) {
      try {
        setExpenses(JSON.parse(savedExpenses))
      } catch (error) {
        console.error("Error al cargar gastos:", error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("sales", JSON.stringify(sales))
  }, [sales])

  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses))
  }, [expenses])

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

  const updateExpense = (id: number, expenseData: Partial<Expense>) => {
    setExpenses((prev) => prev.map((expense) => (expense.id === id ? { ...expense, ...expenseData } : expense)))
  }

  const deleteExpense = (id: number) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id))
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

  const getSalesByDate = (startDate: string, endDate: string): Sale[] => {
    return sales.filter((sale) => {
      const saleDate = new Date(sale.date).toISOString().split("T")[0]
      return saleDate >= startDate && saleDate <= endDate
    })
  }

  const getExpensesByDate = (startDate: string, endDate: string): Expense[] => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date).toISOString().split("T")[0]
      return expenseDate >= startDate && expenseDate <= endDate
    })
  }

  const getLastSale = (): Sale | null => {
    if (sales.length === 0) return null
    return sales[sales.length - 1]
  }

  return (
    <SalesContext.Provider
      value={{
        sales,
        expenses,
        addSale,
        addExpense,
        updateExpense,
        deleteExpense,
        getTotalSales,
        getTotalExpenses,
        getSalesByDate,
        getExpensesByDate,
        getLastSale,
      }}
    >
      {children}
    </SalesContext.Provider>
  )
}

export function useSales() {
  const context = useContext(SalesContext)
  if (context === undefined) {
    throw new Error("useSales debe usarse dentro de un SalesProvider")
  }
  return context
}
