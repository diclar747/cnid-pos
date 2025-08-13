"use client"

import { useState, useEffect } from "react"
import { productService, userService, salesService, expenseService, companyService } from "../services/database"

export function useProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await productService.getAll()
      setProducts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const addProduct = async (product: any) => {
    try {
      const newProduct = await productService.create(product)
      setProducts((prev) => [...prev, newProduct])
      return newProduct
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al crear producto")
    }
  }

  const updateProduct = async (id: string, product: any) => {
    try {
      const updatedProduct = await productService.update(id, product)
      setProducts((prev) => prev.map((p) => (p.id === id ? updatedProduct : p)))
      return updatedProduct
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al actualizar producto")
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      await productService.delete(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al eliminar producto")
    }
  }

  const updateStock = async (id: string, newStock: number, reason?: string, userId?: string) => {
    try {
      await productService.updateStock(id, newStock, reason, userId)
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p)))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al actualizar stock")
    }
  }

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    refetch: fetchProducts,
  }
}

export function useUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await userService.getAll()
      setUsers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const addUser = async (user: any) => {
    try {
      const newUser = await userService.create(user)
      setUsers((prev) => [...prev, newUser])
      return newUser
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al crear usuario")
    }
  }

  const updateUser = async (id: string, user: any) => {
    try {
      const updatedUser = await userService.update(id, user)
      setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)))
      return updatedUser
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al actualizar usuario")
    }
  }

  const deleteUser = async (id: string) => {
    try {
      await userService.delete(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al eliminar usuario")
    }
  }

  return {
    users,
    loading,
    error,
    addUser,
    updateUser,
    deleteUser,
    refetch: fetchUsers,
  }
}

export function useSales() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSales = async () => {
    try {
      setLoading(true)
      const data = await salesService.getAll()
      setSales(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar ventas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [])

  const addSale = async (sale: any, items: any[]) => {
    try {
      const newSale = await salesService.create(sale, items)
      await fetchSales() // Refrescar la lista
      return newSale
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al crear venta")
    }
  }

  return {
    sales,
    loading,
    error,
    addSale,
    refetch: fetchSales,
  }
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const data = await expenseService.getAll()
      setExpenses(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar gastos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  const addExpense = async (expense: any) => {
    try {
      const newExpense = await expenseService.create(expense)
      setExpenses((prev) => [...prev, newExpense])
      return newExpense
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al crear gasto")
    }
  }

  const updateExpense = async (id: string, expense: any) => {
    try {
      const updatedExpense = await expenseService.update(id, expense)
      setExpenses((prev) => prev.map((e) => (e.id === id ? updatedExpense : e)))
      return updatedExpense
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al actualizar gasto")
    }
  }

  const deleteExpense = async (id: string) => {
    try {
      await expenseService.delete(id)
      setExpenses((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al eliminar gasto")
    }
  }

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
  }
}

export function useCompanyConfig() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const data = await companyService.get()
      setConfig(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar configuración")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const updateConfig = async (newConfig: any) => {
    try {
      const updatedConfig = await companyService.update(newConfig)
      setConfig(updatedConfig)
      return updatedConfig
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al actualizar configuración")
    }
  }

  return {
    config,
    loading,
    error,
    updateConfig,
    refetch: fetchConfig,
  }
}
