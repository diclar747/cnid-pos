"use client"

import type React from "react"
import { Suspense, useState } from "react"
import ProtectedRoute from "../components/protected-route"
import AdminNav from "../components/admin-nav"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className={`${isCollapsed ? "w-16" : "w-80"} transition-all duration-300 ease-in-out flex-shrink-0`}>
            <AdminNav isCollapsed={isCollapsed} onToggleCollapse={setIsCollapsed} />
          </div>

          {/* Main Content */}
          <div
            className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? "ml-0" : "ml-0"}`}
          >
            <div className="h-full overflow-auto">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      <p className="text-gray-600">Cargando...</p>
                    </div>
                  </div>
                }
              >
                <div className="p-6">{children}</div>
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
