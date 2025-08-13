"use client"

import { useState } from "react"
import { Bell, Settings, X, Check, CheckCheck, Trash2, AlertTriangle, AlertCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useNotifications, type Notification } from "../context/notifications-context"

export function NotificationsPanel() {
  const {
    notifications,
    unreadCount,
    settings,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updateSettings,
  } = useNotifications()

  const [showSettings, setShowSettings] = useState(false)

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "stock-out":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "stock-critical":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case "stock-low":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "stock-out":
        return "border-l-red-500 bg-red-50 dark:bg-red-900/10"
      case "stock-critical":
        return "border-l-orange-500 bg-orange-50 dark:bg-orange-900/10"
      case "stock-low":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
      default:
        return "border-l-gray-500 bg-gray-50 dark:bg-gray-900/10"
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `hace ${days} día${days > 1 ? "s" : ""}`
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? "s" : ""}`
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? "s" : ""}`
    return "hace un momento"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configuración de Notificaciones</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enabled">Habilitar notificaciones</Label>
                    <Switch
                      id="enabled"
                      checked={settings.enabled}
                      onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lowStock">Umbral stock bajo</Label>
                    <Input
                      id="lowStock"
                      type="number"
                      value={settings.lowStockThreshold}
                      onChange={(e) => updateSettings({ lowStockThreshold: Number.parseInt(e.target.value) || 10 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="criticalStock">Umbral stock crítico</Label>
                    <Input
                      id="criticalStock"
                      type="number"
                      value={settings.criticalStockThreshold}
                      onChange={(e) => updateSettings({ criticalStockThreshold: Number.parseInt(e.target.value) || 5 })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="playSound">Reproducir sonido</Label>
                    <Switch
                      id="playSound"
                      checked={settings.playSound}
                      onCheckedChange={(checked) => updateSettings({ playSound: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoRead">Auto-marcar como leído</Label>
                    <Switch
                      id="autoRead"
                      checked={settings.autoMarkAsRead}
                      onCheckedChange={(checked) => updateSettings({ autoMarkAsRead: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showDashboard">Mostrar en dashboard</Label>
                    <Switch
                      id="showDashboard"
                      checked={settings.showInDashboard}
                      onCheckedChange={(checked) => updateSettings({ showInDashboard: checked })}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border-l-4 ${getNotificationColor(notification.type)} ${
                    !notification.read ? "ring-1 ring-blue-200 dark:ring-blue-800" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{notification.title}</p>
                          {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.timestamp)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNotification(notification.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" size="sm" onClick={clearAll} className="w-full text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar todo
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
