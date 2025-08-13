"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface SaleItem {
  productId: string
  name: string
  price: number
  quantity: number
}

interface Sale {
  id: string
  items: SaleItem[]
  total: number
  customer: {
    name: string
    phone?: string
    notes?: string
  }
  date: string
  status: "completed" | "pending" | "cancelled"
}

interface SalesContextType {
  sales: Sale[]
  addSale: (sale: Omit<Sale, "id">) => void
  getSalesByDate: (startDate: string, endDate: string) => Sale[]
  getTotalSales: (startDate?: string, endDate?: string) => number
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export function SalesProvider({ children }: { children: ReactNode }) {
  const [sales, setSales] = useState<Sale[]>([])

  const addSale = (sale: Omit<Sale, "id">) => {
    const newSale: Sale = {
      ...sale,
      id: Date.now().toString(),
    }
    setSales((prev) => [...prev, newSale])
  }

  const getSalesByDate = (startDate: string, endDate: string): Sale[] => {
    return sales.filter((sale) => {
      const saleDate = new Date(sale.date).toISOString().split("T")[0]
      return saleDate >= startDate && saleDate <= endDate
    })
  }

  const getTotalSales = (startDate?: string, endDate?: string): number => {
    let filteredSales = sales

    if (startDate && endDate) {
      filteredSales = getSalesByDate(startDate, endDate)
    }

    return filteredSales.reduce((total, sale) => total + sale.total, 0)
  }

  return (
    <SalesContext.Provider
      value={{
        sales,
        addSale,
        getSalesByDate,
        getTotalSales,
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
