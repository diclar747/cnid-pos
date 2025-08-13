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
  unreadCount: number
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
      id: Date.now().toString(),
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

    const criticalStockProducts = currentProducts.filter((product) => product.stock > 0 && product.stock <= 2)

    // Agregar notificaciones de stock crítico
    criticalStockProducts.forEach((product) => {
      const existingNotification = notifications.find((n) => n.message.includes(product.name) && n.type === "error")

      if (!existingNotification) {
        addNotification({
          type: "error",
          title: "Stock crítico",
          message: `${product.name} tiene solo ${product.stock} unidades disponibles`,
          action: {
            label: "Reabastecer",
            onClick: () => {
              window.location.href = "/admin/products"
            },
          },
        })
      }
    })

    // Agregar notificaciones de productos agotados
    outOfStockProducts.forEach((product) => {
      const existingNotification = notifications.find(
        (n) => n.message.includes(product.name) && n.message.includes("agotado"),
      )

      if (!existingNotification) {
        addNotification({
          type: "warning",
          title: "Producto agotado",
          message: `${product.name} está agotado`,
          action: {
            label: "Gestionar",
            onClick: () => {
              window.location.href = "/admin/products"
            },
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

  const unreadCount = notifications.filter((n) => !n.read).length

  // Inicializar con algunas notificaciones de ejemplo
  useEffect(() => {
    const initialNotifications: Notification[] = [
      {
        id: "1",
        type: "success",
        title: "Sistema iniciado",
        message: "El sistema POS se ha iniciado correctamente",
        timestamp: new Date(),
        read: false,
      },
      {
        id: "2",
        type: "info",
        title: "Venta completada",
        message: "Se ha procesado una venta por ₲45.000",
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
        read: false,
      },
    ]
    setNotifications(initialNotifications)
  }, [])

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
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
