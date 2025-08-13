"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "../context/auth-context"
import ProtectedRoute from "../components/protected-route"
import AdminNav from "../components/admin-nav"
import { Toaster } from "react-hot-toast"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user } = useAuth()

  return (
    <ProtectedRoute requiredPermissions={["view_dashboard"]}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className={`${isCollapsed ? "w-16" : "w-80"} transition-all duration-300 ease-in-out flex-shrink-0`}>
            <AdminNav isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {/* Content Header */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Panel de Administración</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Bienvenido, {user?.name} (
                      {user?.role === "admin" ? "Administrador" : user?.role === "manager" ? "Gerente" : "Usuario"})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{user?.email}</p>
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">{user?.name?.charAt(0) || "U"}</span>
                    </div>
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
