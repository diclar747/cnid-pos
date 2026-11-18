"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { apiRequest } from "@/lib/api-client"

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
  website?: string
  notes?: string
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
  addSupplier: (supplier: Omit<Supplier, "id">) => Promise<void>
  updateSupplier: (id: number, changes: Partial<Supplier>) => Promise<void>
  deleteSupplier: (id: number) => Promise<void>
  getSupplierById: (id: number) => Supplier | undefined
  addContact: (supplierId: number, contact: Omit<SupplierContact, "id">) => Promise<void>
  updateContact: (supplierId: number, contactId: number, contact: Partial<SupplierContact>) => Promise<void>
  deleteContact: (supplierId: number, contactId: number) => Promise<void>
  addAutoOrder: (autoOrder: Omit<AutoOrder, "id">) => Promise<void>
  updateAutoOrder: (id: number, autoOrder: Partial<AutoOrder>) => Promise<void>
  deleteAutoOrder: (id: number) => Promise<void>
  checkAutoOrders: () => AutoOrder[]
  getSuppliersByCategory: (category: string) => Supplier[]
  getTopSuppliers: (limit?: number) => Supplier[]
}

const SuppliersContext = createContext<SuppliersContextType | undefined>(undefined)

export function SuppliersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [autoOrders, setAutoOrders] = useState<AutoOrder[]>([])

  useEffect(() => {
    if (!user?.permissions.includes("manage_suppliers")) { setSuppliers([]); setAutoOrders([]); return }
    Promise.all([
      apiRequest<{ items: Supplier[] }>("/api/data/suppliers"),
      apiRequest<{ items: AutoOrder[] }>("/api/data/auto_orders"),
    ]).then(([supplierResult, orderResult]) => {
      setSuppliers(supplierResult.items)
      setAutoOrders(orderResult.items)
    }).catch((error) => console.error("No se pudieron cargar los proveedores", error))
  }, [user])

  const getSupplierById = (id: number) => suppliers.find((supplier) => supplier.id === id)

  const addSupplier = async (supplier: Omit<Supplier, "id">) => {
    const result = await apiRequest<{ item: Supplier }>("/api/data/suppliers", {
      method: "POST", body: JSON.stringify(supplier),
    })
    setSuppliers((current) => [result.item, ...current])
  }

  const updateSupplier = async (id: number, changes: Partial<Supplier>) => {
    const existing = getSupplierById(id)
    if (!existing) throw new Error("Proveedor no encontrado.")
    const result = await apiRequest<{ item: Supplier }>(`/api/data/suppliers/${id}`, {
      method: "PUT", body: JSON.stringify({ ...existing, ...changes }),
    })
    setSuppliers((current) => current.map((supplier) => supplier.id === id ? result.item : supplier))
  }

  const deleteSupplier = async (id: number) => {
    await apiRequest(`/api/data/suppliers/${id}`, { method: "DELETE" })
    setSuppliers((current) => current.filter((supplier) => supplier.id !== id))
    setAutoOrders((current) => current.filter((order) => order.supplierId !== id))
  }

  const addContact = async (supplierId: number, contact: Omit<SupplierContact, "id">) => {
    const supplier = getSupplierById(supplierId)
    if (!supplier) throw new Error("Proveedor no encontrado.")
    await updateSupplier(supplierId, { contacts: [...supplier.contacts, { ...contact, id: Date.now() }] })
  }

  const updateContact = async (supplierId: number, contactId: number, changes: Partial<SupplierContact>) => {
    const supplier = getSupplierById(supplierId)
    if (!supplier) throw new Error("Proveedor no encontrado.")
    await updateSupplier(supplierId, {
      contacts: supplier.contacts.map((contact) => contact.id === contactId ? { ...contact, ...changes } : contact),
    })
  }

  const deleteContact = async (supplierId: number, contactId: number) => {
    const supplier = getSupplierById(supplierId)
    if (!supplier) throw new Error("Proveedor no encontrado.")
    await updateSupplier(supplierId, { contacts: supplier.contacts.filter((contact) => contact.id !== contactId) })
  }

  const addAutoOrder = async (autoOrder: Omit<AutoOrder, "id">) => {
    const result = await apiRequest<{ item: AutoOrder }>("/api/data/auto_orders", {
      method: "POST", body: JSON.stringify(autoOrder),
    })
    setAutoOrders((current) => [result.item, ...current])
  }

  const updateAutoOrder = async (id: number, changes: Partial<AutoOrder>) => {
    const existing = autoOrders.find((item) => item.id === id)
    if (!existing) throw new Error("Pedido automático no encontrado.")
    const result = await apiRequest<{ item: AutoOrder }>(`/api/data/auto_orders/${id}`, {
      method: "PUT", body: JSON.stringify({ ...existing, ...changes }),
    })
    setAutoOrders((current) => current.map((item) => item.id === id ? result.item : item))
  }

  const deleteAutoOrder = async (id: number) => {
    await apiRequest(`/api/data/auto_orders/${id}`, { method: "DELETE" })
    setAutoOrders((current) => current.filter((item) => item.id !== id))
  }

  const checkAutoOrders = () => autoOrders.filter((order) => order.isActive &&
    (!order.nextOrderDate || new Date(order.nextOrderDate) <= new Date()))
  const getSuppliersByCategory = (category: string) => suppliers.filter((item) => item.category === category && item.isActive)
  const getTopSuppliers = (limit = 5) => suppliers.filter((item) => item.isActive)
    .sort((a, b) => b.rating - a.rating).slice(0, limit)

  return <SuppliersContext.Provider value={{ suppliers, autoOrders, addSupplier, updateSupplier, deleteSupplier,
    getSupplierById, addContact, updateContact, deleteContact, addAutoOrder, updateAutoOrder,
    deleteAutoOrder, checkAutoOrders, getSuppliersByCategory, getTopSuppliers }}>
    {children}
  </SuppliersContext.Provider>
}

export function useSuppliers() {
  const context = useContext(SuppliersContext)
  if (!context) throw new Error("useSuppliers must be used within a SuppliersProvider")
  return context
}
