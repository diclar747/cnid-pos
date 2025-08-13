"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../context/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (adminOnly && !isAdmin) {
      router.push("/")
      return
    }
  }, [user, isAdmin, adminOnly, router])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
          <p className="mt-2">No tienes permisos para acceder a esta página</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
