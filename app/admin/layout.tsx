"use client"

import type React from "react"

import { Suspense } from "react"
import ProtectedRoute from "../components/protected-route"
import AdminNav from "../components/admin-nav"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className="w-64 border-r bg-card/50">
            <AdminNav />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }
            >
              {children}
            </Suspense>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
