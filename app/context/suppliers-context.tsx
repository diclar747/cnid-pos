"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface SupplierContact {
  id: number
  name: string
  position: string
  phone: string
  email: string
  isPrimary: boolean
}

export interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  address: string
  category: string
  rating: number
  status: "active" | "inactive"
}

export interface AutoOrder {
  id: number
  supplierId: number
  productId: number
  productName: string
  minStock: number
  orderQuantity: number
  isActive: boolean
  lastOrderDate?: string
  nextOrderDate?: string
}

interface SuppliersContextType {
  suppliers: Supplier[]
  autoOrders: AutoOrder[]
  addSupplier: (supplier: Omit<Supplier, "id">) => void
  updateSupplier: (supplier: Supplier) => void
  deleteSupplier: (id: string) => void
  getSupplierById: (id: string) => Supplier | undefined
  addContact: (supplierId: string, contact: Omit<SupplierContact, "id">) => void
  updateContact: (supplierId: string, contactId: number, contact: Partial<SupplierContact>) => void
  deleteContact: (supplierId: string, contactId: number) => void
  addAutoOrder: (autoOrder: Omit<AutoOrder, "id">) => void
  updateAutoOrder: (id: number, autoOrder: Partial<AutoOrder>) => void
  deleteAutoOrder: (id: number) => void
  checkAutoOrders: () => AutoOrder[]
  getSuppliersByCategory: (category: string) => Supplier[]
  getTopSuppliers: (limit?: number) => Supplier[]
}

const SuppliersContext = createContext<SuppliersContextType | undefined>(undefined)

export function SuppliersProvider({ children }: { children: ReactNode }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: "1",
      name: "Distribuidora Central",
      contact: "Juan Pérez",
      email: "juan@distribuidora.com",
      phone: "+595 21 555-0001",
      address: "Av. España 456, Asunción",
      category: "Alimentos",
      rating: 4.5,
      status: "active",
    },
    {
      id: "2",
      name: "Bebidas del Paraguay",
      contact: "María González",
      email: "maria@bebidas.com",
      phone: "+595 21 555-0002",
      address: "Ruta 2 Km 15, Luque",
      category: "Bebidas",
      rating: 4.2,
      status: "active",
    },
  ])
  const [autoOrders, setAutoOrders] = useState<AutoOrder[]>([])

  const addSupplier = (supplier: Omit<Supplier, "id">) => {
    const newSupplier: Supplier = {
      ...supplier,
      id: Date.now().toString(),
    }
    setSuppliers((prev) => [...prev, newSupplier])
  }

  const updateSupplier = (supplier: Supplier) => {
    setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? supplier : s)))
  }

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
    // También eliminar órdenes automáticas relacionadas
    setAutoOrders((prev) => prev.filter((order) => order.supplierId !== Number.parseInt(id)))
  }

  const getSupplierById = (id: string): Supplier | undefined => {
    return suppliers.find((supplier) => supplier.id === id)
  }

  const addContact = (supplierId: string, contact: Omit<SupplierContact, "id">) => {
    const newContact: SupplierContact = {
      ...contact,
      id: Date.now(),
    }

    setSuppliers((prev) =>
      prev.map((supplier) =>
        supplier.id === supplierId
          ? {
              ...supplier,
              contacts: [...supplier.contacts, newContact],
            }
          : supplier,
      ),
    )
  }

  const updateContact = (supplierId: string, contactId: number, contact: Partial<SupplierContact>) => {
    setSuppliers((prev) =>
      prev.map((supplier) =>
        supplier.id === supplierId
          ? {
              ...supplier,
              contacts: supplier.contacts.map((c) => (c.id === contactId ? { ...c, ...contact } : c)),
            }
          : supplier,
      ),
    )
  }

  const deleteContact = (supplierId: string, contactId: number) => {
    setSuppliers((prev) =>
      prev.map((supplier) =>
        supplier.id === supplierId
          ? {
              ...supplier,
              contacts: supplier.contacts.filter((c) => c.id !== contactId),
            }
          : supplier,
      ),
    )
  }

  const addAutoOrder = (autoOrder: Omit<AutoOrder, "id">) => {
    const newAutoOrder: AutoOrder = {
      ...autoOrder,
      id: Date.now(),
    }
    setAutoOrders((prev) => [...prev, newAutoOrder])
  }

  const updateAutoOrder = (id: number, autoOrder: Partial<AutoOrder>) => {
    setAutoOrders((prev) => prev.map((order) => (order.id === id ? { ...order, ...autoOrder } : order)))
  }

  const deleteAutoOrder = (id: number) => {
    setAutoOrders((prev) => prev.filter((order) => order.id !== id))
  }

  const checkAutoOrders = (): AutoOrder[] => {
    // Esta función sería llamada periódicamente para verificar si hay productos que necesitan reabastecimiento
    const today = new Date()
    return autoOrders.filter((order) => {
      if (!order.isActive) return false
      if (!order.nextOrderDate) return true // Si no tiene fecha, verificar inmediatamente
      return new Date(order.nextOrderDate) <= today
    })
  }

  const getSuppliersByCategory = (category: string): Supplier[] => {
    return suppliers.filter((supplier) => supplier.category === category && supplier.status === "active")
  }

  const getTopSuppliers = (limit = 5): Supplier[] => {
    return suppliers
      .filter((supplier) => supplier.status === "active")
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
  }

  return (
    <SuppliersContext.Provider
      value={{
        suppliers,
        autoOrders,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        getSupplierById,
        addContact,
        updateContact,
        deleteContact,
        addAutoOrder,
        updateAutoOrder,
        deleteAutoOrder,
        checkAutoOrders,
        getSuppliersByCategory,
        getTopSuppliers,
      }}
    >
      {children}
    </SuppliersContext.Provider>
  )
}

export function useSuppliers() {
  const context = useContext(SuppliersContext)
  if (context === undefined) {
    throw new Error("useSuppliers must be used within a SuppliersProvider")
  }
  return context
}
