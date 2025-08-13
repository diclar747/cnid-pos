"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"

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
  address: string
  phone: string
  email: string
  website?: string
  category: string
  paymentTerms: string
  creditLimit: number
  isActive: boolean
  rating: number
  notes?: string
  contacts: SupplierContact[]
  createdAt: string
  updatedAt: string
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
  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => void
  updateSupplier: (id: number, supplier: Partial<Supplier>) => void
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [autoOrders, setAutoOrders] = useState<AutoOrder[]>([])

  useEffect(() => {
    // Cargar proveedores desde localStorage
    const savedSuppliers = localStorage.getItem("suppliers")
    if (savedSuppliers) {
      try {
        setSuppliers(JSON.parse(savedSuppliers))
      } catch (error) {
        console.error("Error al cargar proveedores:", error)
      }
    } else {
      // Datos de ejemplo
      const exampleSuppliers: Supplier[] = [
        {
          id: 1,
          name: "Distribuidora Central S.A.",
          ruc: "80012345-1",
          address: "Av. Eusebio Ayala 1234, Asunción",
          phone: "+595 21 123456",
          email: "ventas@distribuidoracentral.com.py",
          website: "www.distribuidoracentral.com.py",
          category: "Bebidas",
          paymentTerms: "30 días",
          creditLimit: 50000000,
          isActive: true,
          rating: 4.5,
          notes: "Proveedor principal de bebidas. Excelente servicio.",
          contacts: [
            {
              id: 1,
              name: "María González",
              position: "Gerente de Ventas",
              phone: "+595 981 123456",
              email: "maria.gonzalez@distribuidoracentral.com.py",
              isPrimary: true,
            },
            {
              id: 2,
              name: "Carlos Rodríguez",
              position: "Ejecutivo de Cuentas",
              phone: "+595 981 654321",
              email: "carlos.rodriguez@distribuidoracentral.com.py",
              isPrimary: false,
            },
          ],
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z",
        },
        {
          id: 2,
          name: "Alimentos del Paraguay LTDA",
          ruc: "80023456-2",
          address: "Ruta 2 Km 15, San Lorenzo",
          phone: "+595 21 234567",
          email: "pedidos@alimentosparaguay.com.py",
          category: "Alimentos",
          paymentTerms: "15 días",
          creditLimit: 30000000,
          isActive: true,
          rating: 4.2,
          contacts: [
            {
              id: 3,
              name: "Ana Martínez",
              position: "Coordinadora de Ventas",
              phone: "+595 982 123456",
              email: "ana.martinez@alimentosparaguay.com.py",
              isPrimary: true,
            },
          ],
          createdAt: "2024-01-20T14:30:00Z",
          updatedAt: "2024-01-20T14:30:00Z",
        },
      ]
      setSuppliers(exampleSuppliers)
    }

    // Cargar órdenes automáticas
    const savedAutoOrders = localStorage.getItem("autoOrders")
    if (savedAutoOrders) {
      try {
        setAutoOrders(JSON.parse(savedAutoOrders))
      } catch (error) {
        console.error("Error al cargar órdenes automáticas:", error)
      }
    }
  }, [])

  useEffect(() => {
    // Guardar proveedores en localStorage
    localStorage.setItem("suppliers", JSON.stringify(suppliers))
  }, [suppliers])

  useEffect(() => {
    // Guardar órdenes automáticas en localStorage
    localStorage.setItem("autoOrders", JSON.stringify(autoOrders))
  }, [autoOrders])

  const addSupplier = (supplierData: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setSuppliers((prev) => [...prev, newSupplier])
  }

  const updateSupplier = (id: number, supplierData: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((supplier) =>
        supplier.id === id ? { ...supplier, ...supplierData, updatedAt: new Date().toISOString() } : supplier,
      ),
    )
  }

  const deleteSupplier = (id: number) => {
    setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id))
    // También eliminar órdenes automáticas relacionadas
    setAutoOrders((prev) => prev.filter((order) => order.supplierId !== id))
  }

  const getSupplierById = (id: number): Supplier | undefined => {
    return suppliers.find((supplier) => supplier.id === id)
  }

  const addContact = (supplierId: number, contactData: Omit<SupplierContact, "id">) => {
    const newContact: SupplierContact = {
      ...contactData,
      id: Date.now(),
    }

    setSuppliers((prev) =>
      prev.map((supplier) =>
        supplier.id === supplierId
          ? {
              ...supplier,
              contacts: [...supplier.contacts, newContact],
              updatedAt: new Date().toISOString(),
            }
          : supplier,
      ),
    )
  }

  const updateContact = (supplierId: number, contactId: number, contactData: Partial<SupplierContact>) => {
    setSuppliers((prev) =>
      prev.map((supplier) =>
        supplier.id === supplierId
          ? {
              ...supplier,
              contacts: supplier.contacts.map((contact) =>
                contact.id === contactId ? { ...contact, ...contactData } : contact,
              ),
              updatedAt: new Date().toISOString(),
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
              contacts: supplier.contacts.filter((contact) => contact.id !== contactId),
              updatedAt: new Date().toISOString(),
            }
          : supplier,
      ),
    )
  }

  const addAutoOrder = (autoOrderData: Omit<AutoOrder, "id">) => {
    const newAutoOrder: AutoOrder = {
      ...autoOrderData,
      id: Date.now(),
    }
    setAutoOrders((prev) => [...prev, newAutoOrder])
  }

  const updateAutoOrder = (id: number, autoOrderData: Partial<AutoOrder>) => {
    setAutoOrders((prev) => prev.map((order) => (order.id === id ? { ...order, ...autoOrderData } : order)))
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
    throw new Error("useSuppliers debe usarse dentro de un SuppliersProvider")
  }
  return context
}
