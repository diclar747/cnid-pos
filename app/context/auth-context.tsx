"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { apiRequest } from "@/lib/api-client"

export interface User {
  id: string
  name: string
  email: string
  username: string
  role: "superadmin" | "admin" | "cashier" | "manager" | "waiter"
  permissions: string[]
  isActive: boolean
  restaurantId: string | null
  restaurantName: string | null
  avatarData: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiRequest<{ user: User | null }>("/api/auth/session")
      .then((result) => { if (active) setUser(result.user) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await apiRequest<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      setUser(result.user)
      return true
    } catch (error) {
      if (error instanceof Error && error.message === "Credenciales incorrectas.") return false
      throw error
    }
  }

  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" })
    setUser(null)
  }

  const refreshUser = async () => {
    const result = await apiRequest<{ user: User | null }>("/api/auth/session")
    setUser(result.user)
  }

  const hasPermission = useCallback((permission: string) => user?.permissions.includes(permission) || false, [user])

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, hasPermission }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
