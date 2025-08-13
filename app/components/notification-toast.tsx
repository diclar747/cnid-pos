"use client"

import { useEffect, useState } from "react"
import { X, AlertTriangle, AlertCircle, Package, CheckCircle, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useNotifications, type Notification } from "../context/notifications-context"

interface ToastNotification extends Notification {
  show: boolean
}

export function NotificationToast() {
  const { notifications, markAsRead } = useNotifications()
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([])

  useEffect(() => {
    // Mostrar solo las notificaciones más recientes no leídas
    const recentUnread = notifications
      .filter((n) => !n.read)
      .slice(0, 3)
      .map((n) => ({ ...n, show: true }))

    setToastNotifications(recentUnread)
  }, [notifications])

  const removeToast = (id: string) => {
    setToastNotifications((prev) => prev.filter((n) => n.id !== id))
    markAsRead(id)
  }

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "stock-out":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "stock-critical":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case "stock-low":
        return <Package className="h-4 w-4 text-yellow-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getToastColor = (type: Notification["type"]) => {
    switch (type) {
      case "stock-out":
        return "border-red-500 bg-red-50 dark:bg-red-950"
      case "stock-critical":
        return "border-orange-500 bg-orange-50 dark:bg-orange-950"
      case "stock-low":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
      case "success":
        return "border-green-500 bg-green-50 dark:bg-green-950"
      case "error":
        return "border-red-500 bg-red-50 dark:bg-red-950"
      case "warning":
        return "border-orange-500 bg-orange-50 dark:bg-orange-950"
      default:
        return "border-blue-500 bg-blue-50 dark:bg-blue-950"
    }
  }

  if (toastNotifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toastNotifications.map((notification) => (
        <Card
          key={notification.id}
          className={`${getToastColor(notification.type)} border-l-4 shadow-lg animate-in slide-in-from-right-full duration-300`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2 flex-1">
                {getIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                  {notification.currentStock !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">Stock: {notification.currentStock} unidades</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => removeToast(notification.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
