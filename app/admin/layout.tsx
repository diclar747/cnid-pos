import type React from "react"
import AdminNav from "../components/admin-nav"
import ProtectedRoute from "../components/protected-route"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute adminOnly>
      <div className="flex h-screen bg-gray-100">
        <AdminNav />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </ProtectedRoute>
  )
}
