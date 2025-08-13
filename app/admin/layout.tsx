import type React from "react"
import { Suspense } from "react"
import AdminNav from "../components/admin-nav"
import ProtectedRoute from "../components/protected-route"
import { NotificationsProvider } from "../context/notifications-context"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requireAdmin>
      <NotificationsProvider>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
          <AdminNav />
          <main className="flex-1 overflow-auto">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              }
            >
              {children}
            </Suspense>
          </main>
        </div>
      </NotificationsProvider>
    </ProtectedRoute>
  )
}
