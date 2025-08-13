"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { Product } from "../data/products"

export interface Notification {
  id: string
  type: "info" | "warning" | "error" | "success"
  title: string
  message: string
  timestamp: Date
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationsContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  checkStockLevels: (products: Product[]) => void
  getLowStockProducts: () => Product[]
  getCriticalStockProducts: () => Product[]
  getOutOfStockProducts: () => Product[]
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    }
    setNotifications((prev) => [newNotification, ...prev])
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const checkStockLevels = (currentProducts: Product[]) => {
    setProducts(currentProducts)

    const lowStockProducts = currentProducts.filter((product) => product.stock > 0 && product.stock <= 5)

    const outOfStockProducts = currentProducts.filter((product) => product.stock === 0)

    // Agregar notificaciones de stock bajo
    lowStockProducts.forEach((product) => {
      const existingNotification = notifications.find((n) => n.title.includes(product.name) && n.type === "warning")

      if (!existingNotification) {
        addNotification({
          type: "warning",
          title: `Stock bajo: ${product.name}`,
          message: `Solo quedan ${product.stock} unidades en inventario`,
          action: {
            label: "Ver producto",
            onClick: () => console.log(`Navegando a producto ${product.id}`),
          },
        })
      }
    })

    // Agregar notificaciones de productos agotados
    outOfStockProducts.forEach((product) => {
      const existingNotification = notifications.find((n) => n.title.includes(product.name) && n.type === "error")

      if (!existingNotification) {
        addNotification({
          type: "error",
          title: `Producto agotado: ${product.name}`,
          message: `Este producto está fuera de stock`,
          action: {
            label: "Reabastecer",
            onClick: () => console.log(`Reabasteciendo producto ${product.id}`),
          },
        })
      }
    })
  }

  const getLowStockProducts = () => {
    return products.filter((product) => product.stock > 0 && product.stock <= 5)
  }

  const getCriticalStockProducts = () => {
    return products.filter((product) => product.stock > 0 && product.stock <= 2)
  }

  const getOutOfStockProducts = () => {
    return products.filter((product) => product.stock === 0)
  }

  // Inicializar con algunas notificaciones de ejemplo
  useEffect(() => {
    const initialNotifications: Notification[] = [
      {
        id: "1",
        type: "info",
        title: "Sistema iniciado",
        message: "El sistema POS se ha iniciado correctamente",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutos atrás
        read: false,
      },
      {
        id: "2",
        type: "success",
        title: "Venta completada",
        message: "Venta #001 por ₲ 45.000 procesada exitosamente",
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutos atrás
        read: false,
      },
    ]
    setNotifications(initialNotifications)
  }, [])

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        checkStockLevels,
        getLowStockProducts,
        getCriticalStockProducts,
        getOutOfStockProducts,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error("useNotifications debe usarse dentro de un NotificationsProvider")
  }
  return context
}
