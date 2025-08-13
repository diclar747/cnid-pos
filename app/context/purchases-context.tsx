"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"

export interface Purchase {
  id: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  total: number
  date: string
  supplier?: string
  notes?: string
  createdBy: string
}

interface PurchasesContextType {
  purchases: Purchase[]
  addPurchase: (purchase: Omit<Purchase, "id">) => void
  updatePurchase: (id: number, purchase: Partial<Purchase>) => void
  deletePurchase: (id: number) => void
  getPurchasesByDate: (startDate: string, endDate: string) => Purchase[]
  getTotalPurchases: (startDate?: string, endDate?: string) => number
  getPurchasesByProduct: (productId: number) => Purchase[]
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined)

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const [purchases, setPurchases] = useState<Purchase[]>([])

  useEffect(() => {
    // Cargar compras desde localStorage
    const savedPurchases = localStorage.getItem("purchases")
    if (savedPurchases) {
      try {
        setPurchases(JSON.parse(savedPurchases))
      } catch (error) {
        console.error("Error al cargar compras:", error)
      }
    }
  }, [])

  useEffect(() => {
    // Guardar compras en localStorage
    localStorage.setItem("purchases", JSON.stringify(purchases))
  }, [purchases])

  const addPurchase = (purchase: Omit<Purchase, "id">) => {
    const newPurchase: Purchase = {
      ...purchase,
      id: Date.now(),
    }
    setPurchases((prev) => [...prev, newPurchase])
  }

  const updatePurchase = (id: number, purchaseData: Partial<Purchase>) => {
    setPurchases((prev) => prev.map((purchase) => (purchase.id === id ? { ...purchase, ...purchaseData } : purchase)))
  }

  const deletePurchase = (id: number) => {
    setPurchases((prev) => prev.filter((purchase) => purchase.id !== id))
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

  const getPurchasesByProduct = (productId: number): Purchase[] => {
    return purchases.filter((purchase) => purchase.productId === productId)
  }

  return (
    <PurchasesContext.Provider
      value={{
        purchases,
        addPurchase,
        updatePurchase,
        deletePurchase,
        getPurchasesByDate,
        getTotalPurchases,
        getPurchasesByProduct,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  )
}

export function usePurchases() {
  const context = useContext(PurchasesContext)
  if (context === undefined) {
    throw new Error("usePurchases debe usarse dentro de un PurchasesProvider")
  }
  return context
}
