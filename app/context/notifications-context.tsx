"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import type { Product } from "../data/products"

export interface Notification {
  id: string
  type: "info" | "warning" | "error" | "success" | "stock-out" | "stock-critical" | "stock-low"
  title: string
  message: string
  timestamp: Date
  read: boolean
  currentStock?: number
  action?: { label: string; onClick: () => void }
}

interface NotificationSettings {
  enabled: boolean
  lowStockThreshold: number
  criticalStockThreshold: number
  playSound: boolean
  autoMarkAsRead: boolean
  showInDashboard: boolean
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  lowStockThreshold: 10,
  criticalStockThreshold: 5,
  playSound: false,
  autoMarkAsRead: false,
  showInDashboard: true,
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  settings: NotificationSettings
  updateSettings: (changes: Partial<NotificationSettings>) => void
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

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("notificationSettings")
      if (saved) setSettings({ ...defaultSettings, ...JSON.parse(saved) })
    } catch { /* conservar valores predeterminados */ }
  }, [])

  const updateSettings = useCallback((changes: Partial<NotificationSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...changes }
      localStorage.setItem("notificationSettings", JSON.stringify(next))
      return next
    })
  }, [])

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    setNotifications((current) => [{ ...notification, id: crypto.randomUUID(), timestamp: new Date(), read: false }, ...current])
  }, [])
  const markAsRead = (id: string) => setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item))
  const markAllAsRead = () => setNotifications((current) => current.map((item) => ({ ...item, read: true })))
  const removeNotification = (id: string) => setNotifications((current) => current.filter((item) => item.id !== id))
  const clearAll = () => setNotifications([])

  const checkStockLevels = useCallback((currentProducts: Product[]) => {
    setProducts(currentProducts)
    setNotifications((current) => {
      const other = current.filter((item) => !item.type.startsWith("stock-"))
      if (!settings.enabled) return other
      const stockAlerts = currentProducts.flatMap((product): Notification[] => {
        let type: Notification["type"] | null = null
        if (product.stock === 0) type = "stock-out"
        else if (product.stock <= settings.criticalStockThreshold) type = "stock-critical"
        else if (product.stock <= settings.lowStockThreshold) type = "stock-low"
        if (!type) return []
        const id = `stock-${product.id}`
        const previous = current.find((item) => item.id === id)
        return [{
          id,
          type,
          title: type === "stock-out" ? "Producto agotado" : type === "stock-critical" ? "Stock crítico" : "Stock bajo",
          message: `${product.name}: ${product.stock} unidades disponibles`,
          currentStock: product.stock,
          timestamp: previous?.timestamp ?? new Date(),
          read: previous?.type === type && previous.currentStock === product.stock ? previous.read : false,
        }]
      })
      return [...stockAlerts, ...other]
    })
  }, [settings.enabled, settings.criticalStockThreshold, settings.lowStockThreshold])

  const getLowStockProducts = () => products.filter((product) => product.stock > settings.criticalStockThreshold && product.stock <= settings.lowStockThreshold)
  const getCriticalStockProducts = () => products.filter((product) => product.stock > 0 && product.stock <= settings.criticalStockThreshold)
  const getOutOfStockProducts = () => products.filter((product) => product.stock === 0)
  const unreadCount = notifications.filter((item) => !item.read).length

  return <NotificationsContext.Provider value={{ notifications, unreadCount, settings, updateSettings,
    addNotification, markAsRead, markAllAsRead, removeNotification, clearAll, checkStockLevels,
    getLowStockProducts, getCriticalStockProducts, getOutOfStockProducts }}>
    {children}
  </NotificationsContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) throw new Error("useNotifications debe usarse dentro de un NotificationsProvider")
  return context
}
