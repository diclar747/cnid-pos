"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../context/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requiredPermissions?: string[]
  fallbackPath?: string
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requiredPermissions = [],
  fallbackPath = "/login",
}: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!loading) {
      // No user logged in
      if (!user) {
        router.push(fallbackPath)
        return
      }

      // User is not active
      if (!user.isActive) {
        router.push("/login")
        return
      }

      // Check admin requirement
      if (requireAdmin && user.role !== "admin") {
        // Redirect based on user role
        if (user.role === "cashier") {
          router.push("/pos")
        } else if (user.role === "manager") {
          router.push("/admin") // Managers can access limited admin features
        } else {
          router.push("/pos")
        }
        return
      }

      // Check specific permissions
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every((permission) => hasPermission(permission))

        if (!hasAllPermissions) {
          // Redirect to appropriate page based on role
          if (user.role === "admin") {
            router.push("/admin")
          } else if (user.role === "manager" && hasPermission("view_dashboard")) {
            router.push("/admin")
          } else {
            router.push("/pos")
          }
          return
        }
      }

      setIsChecking(false)
    }
  }, [user, loading, requireAdmin, requiredPermissions, router, hasPermission, fallbackPath])

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!user || !user.isActive) {
    return null
  }

  // Check permissions one more time before rendering
  if (requireAdmin && user.role !== "admin") {
    return null
  }

  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every((permission) => hasPermission(permission))
    if (!hasAllPermissions) {
      return null
    }
  }

  return <>{children}</>
}
