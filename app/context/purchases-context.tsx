"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface Purchase {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  supplier: string
  date: string
  notes?: string
}

interface PurchasesContextType {
  purchases: Purchase[]
  addPurchase: (purchase: Omit<Purchase, "id">) => void
  getPurchasesByDate: (startDate: string, endDate: string) => Purchase[]
  getTotalPurchases: (startDate?: string, endDate?: string) => number
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined)

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const [purchases, setPurchases] = useState<Purchase[]>([])

  const addPurchase = (purchase: Omit<Purchase, "id">) => {
    const newPurchase: Purchase = {
      ...purchase,
      id: Date.now().toString(),
    }
    setPurchases((prev) => [...prev, newPurchase])
  }

  const getPurchasesByDate = (startDate: string, endDate: string): Purchase[] => {
    return purchases.filter((purchase) => {
      const purchaseDate = new Date(purchase.date).toISOString().split("T")[0]
      return purchaseDate >= startDate && purchaseDate <= endDate
    })
  }

  const getTotalPurchases = (startDate?: string, endDate?: string): number => {
    let filteredPurchases = purchases

    if (startDate && endDate) {
      filteredPurchases = getPurchasesByDate(startDate, endDate)
    }

    return filteredPurchases.reduce((total, purchase) => total + purchase.total, 0)
  }

  return (
    <PurchasesContext.Provider
      value={{
        purchases,
        addPurchase,
        getPurchasesByDate,
        getTotalPurchases,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  )
}

export function usePurchases() {
  const context = useContext(PurchasesContext)
  if (context === undefined) {
    throw new Error("usePurchases must be used within a PurchasesProvider")
  }
  return context
}
