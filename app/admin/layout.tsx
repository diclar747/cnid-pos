"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "../context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import AdminNav from "../components/admin-nav"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-card border-r transition-all duration-300 z-40 ${
          isCollapsed ? "w-20" : "w-80"
        }`}
      >
        <AdminNav isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isCollapsed ? "ml-20" : "ml-80"}`}>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
