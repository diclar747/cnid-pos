"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { apiRequest } from "@/lib/api-client"
import { businessDateKey } from "@/lib/business-date"

export interface Purchase {
  id: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  total: number
  supplier: string
  date: string
  notes?: string
  createdBy?: string
  /** Ítems de facturas de compra (insumos y mercadería). */
  invoiceId?: number
  invoiceNumber?: string
  supplierId?: number | null
  category?: string
  unit?: string
  condition?: "cash" | "credit"
}

interface PurchasesContextType {
  purchases: Purchase[]
  addPurchase: (purchase: Omit<Purchase, "id">) => Promise<void>
  getPurchasesByDate: (startDate: string, endDate: string) => Purchase[]
  getTotalPurchases: (startDate?: string, endDate?: string) => number
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined)

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])

  const refresh = useCallback(async () => {
    if (!user?.permissions.includes("manage_purchases")) { setPurchases([]); return }
    // Ítems de las facturas de compra + compras sueltas de productos (registro anterior).
    const [invoices, legacy] = await Promise.all([
      apiRequest<{ items: Purchase[] }>("/api/purchase-invoices?lines=1").catch(() => ({ items: [] as Purchase[] })),
      apiRequest<{ items: Purchase[] }>("/api/data/purchases"),
    ])
    setPurchases([...invoices.items.map((item) => ({ ...item, id: -item.id })), ...legacy.items]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
  }, [user])

  useEffect(() => {
    refresh().catch((error) => console.error("No se pudieron cargar las compras", error))
    const onChange = () => { refresh().catch(console.error) }
    window.addEventListener("purchases:changed", onChange)
    return () => window.removeEventListener("purchases:changed", onChange)
  }, [refresh])

  const addPurchase = async (purchase: Omit<Purchase, "id">) => {
    const result = await apiRequest<{ purchase: Purchase }>("/api/purchases", {
      method: "POST", body: JSON.stringify(purchase),
    })
    setPurchases((current) => [result.purchase, ...current])
    window.dispatchEvent(new Event("products:changed"))
  }

  const getPurchasesByDate = (startDate: string, endDate: string) =>
    purchases.filter((item) => businessDateKey(item.date) >= startDate && businessDateKey(item.date) <= endDate)
  const getTotalPurchases = (startDate?: string, endDate?: string) =>
    (startDate && endDate ? getPurchasesByDate(startDate, endDate) : purchases).reduce((sum, item) => sum + item.total, 0)

  return <PurchasesContext.Provider value={{ purchases, addPurchase, getPurchasesByDate, getTotalPurchases }}>
    {children}
  </PurchasesContext.Provider>
}

export function usePurchases() {
  const context = useContext(PurchasesContext)
  if (!context) throw new Error("usePurchases must be used within a PurchasesProvider")
  return context
}
