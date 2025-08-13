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
  id: number
  name: string
  ruc: string
  contact: string
  email: string
  phone: string
  address: string
  category: string
  rating: number
  isActive: boolean
  creditLimit: number
  paymentTerms: string
  contacts: SupplierContact[]
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
  deleteSupplier: (id: number) => void
  getSupplierById: (id: number) => Supplier | undefined
  addContact: (supplierId: number, contact: Omit<SupplierContact, "id">) => void
  updateContact: (supplierId: number, contactId: number, contact: Partial<SupplierContact>) => void
  deleteContact: (supplierId: number, contactId: number) => void
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
      id: 1,
      name: "Distribuidora Central",
      ruc: "80012345-1",
      contact: "Juan Pérez",
      email: "juan@distribuidora.com",
      phone: "+595 21 555-0001",
      address: "Av. España 456, Asunción",
      category: "Alimentos",
      rating: 4.5,
      isActive: true,
      creditLimit: 50000000,
      paymentTerms: "30 días",
      contacts: [
        {
          id: 1,
          name: "Juan Pérez",
          position: "Gerente de Ventas",
          phone: "+595 21 555-0001",
          email: "juan@distribuidora.com",
          isPrimary: true,
        },
      ],
    },
    {
      id: 2,
      name: "Bebidas del Paraguay",
      ruc: "80012346-2",
      contact: "María González",
      email: "maria@bebidas.com",
      phone: "+595 21 555-0002",
      address: "Ruta 2 Km 15, Luque",
      category: "Bebidas",
      rating: 4.2,
      isActive: true,
      creditLimit: 30000000,
      paymentTerms: "15 días",
      contacts: [
        {
          id: 2,
          name: "María González",
          position: "Directora Comercial",
          phone: "+595 21 555-0002",
          email: "maria@bebidas.com",
          isPrimary: true,
        },
      ],
    },
    {
      id: 3,
      name: "Carnes Premium",
      ruc: "80012347-3",
      contact: "Carlos Rodríguez",
      email: "carlos@carnespremium.com",
      phone: "+595 21 555-0003",
      address: "Mercado Central, Local 45",
      category: "Carnes",
      rating: 4.8,
      isActive: true,
      creditLimit: 25000000,
      paymentTerms: "7 días",
      contacts: [
        {
          id: 3,
          name: "Carlos Rodríguez",
          position: "Propietario",
          phone: "+595 21 555-0003",
          email: "carlos@carnespremium.com",
          isPrimary: true,
        },
      ],
    },
  ])

  const [autoOrders, setAutoOrders] = useState<AutoOrder[]>([
    {
      id: 1,
      supplierId: 1,
      productId: 1,
      productName: "Hamburguesa Clásica",
      minStock: 10,
      orderQuantity: 50,
      isActive: true,
      lastOrderDate: "2024-01-10",
      nextOrderDate: "2024-01-20",
    },
    {
      id: 2,
      supplierId: 2,
      productId: 6,
      productName: "Coca Cola",
      minStock: 20,
      orderQuantity: 100,
      isActive: true,
      lastOrderDate: "2024-01-08",
      nextOrderDate: "2024-01-18",
    },
  ])

  const addSupplier = (supplier: Omit<Supplier, "id">) => {
    const newSupplier: Supplier = {
      ...supplier,
      id: Date.now(),
    }
    setSuppliers((prev) => [...prev, newSupplier])
  }

  const updateSupplier = (supplier: Supplier) => {
    setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? supplier : s)))
  }

  const deleteSupplier = (id: number) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
    // También eliminar órdenes automáticas relacionadas
    setAutoOrders((prev) => prev.filter((order) => order.supplierId !== id))
  }

  const getSupplierById = (id: number): Supplier | undefined => {
    return suppliers.find((supplier) => supplier.id === id)
  }

  const addContact = (supplierId: number, contact: Omit<SupplierContact, "id">) => {
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

  const updateContact = (supplierId: number, contactId: number, contact: Partial<SupplierContact>) => {
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

  const deleteContact = (supplierId: number, contactId: number) => {
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
    return suppliers.filter((supplier) => supplier.category === category && supplier.isActive)
  }

  const getTopSuppliers = (limit = 5): Supplier[] => {
    return suppliers
      .filter((supplier) => supplier.isActive)
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
