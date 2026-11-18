"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "../context/auth-context"
import ProtectedRoute from "../components/protected-route"
import AdminNav from "../components/admin-nav"
import { Toaster } from "react-hot-toast"
import { LayoutDashboard } from "lucide-react"
import { HeaderActions } from "../components/header-actions"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user } = useAuth()
  useEffect(() => { setIsCollapsed(localStorage.getItem("admin:sidebar-collapsed") === "true") }, [])
  const toggleSidebar = (collapsed: boolean) => {
    setIsCollapsed(collapsed)
    localStorage.setItem("admin:sidebar-collapsed", String(collapsed))
  }

  return (
    <ProtectedRoute requiredPermissions={["view_dashboard"]}>
      <div className="min-h-screen bg-[#f4f6fc] dark:bg-slate-950">
        <div className="flex min-h-screen flex-col md:h-screen md:flex-row">
          <div className={`admin-sidebar ${isCollapsed ? "md:w-[76px]" : "md:w-[252px]"} z-50 w-full flex-shrink-0 border-r border-slate-200 transition-[width] duration-200 dark:border-slate-800`}>
            <AdminNav isCollapsed={isCollapsed} setIsCollapsed={toggleSidebar} />
          </div>

          {/* Main Content */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {/* Content Header */}
              <div className="admin-topbar sticky top-0 z-30 border-b border-indigo-100/80 bg-white/85 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="hidden h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-sm shadow-indigo-500/25 sm:flex"><LayoutDashboard className="h-4 w-4" /></span>
                    <div>
                      <h2 className="text-sm font-bold tracking-wide text-slate-900 dark:text-white">CNID · Panel de control</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user?.restaurantName ?? "Ventas, compras e inventario de tu negocio"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <HeaderActions />
                  </div>
                </div>
              </div>

              {/* Page Content */}
              <div className="flex-1">{children}</div>
            </div>
          </div>
        </div>
      </div>
      <Toaster position="top-right" />
    </ProtectedRoute>
  )
}
