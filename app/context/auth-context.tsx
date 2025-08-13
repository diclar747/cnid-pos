"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  name: string
  email: string
  username: string
  role: "admin" | "cashier" | "manager"
  permissions: string[]
  isActive: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock users database
const mockUsers: User[] = [
  {
    id: "1",
    name: "Administrador Principal",
    email: "admin@heroui.com",
    username: "admin",
    role: "admin",
    permissions: [
      "view_dashboard",
      "manage_products",
      "manage_users",
      "view_reports",
      "manage_expenses",
      "manage_company",
      "manage_purchases",
      "manage_suppliers",
      "access_pos",
      "manage_sales",
    ],
    isActive: true,
  },
  {
    id: "2",
    name: "Cajero Principal",
    email: "user@heroui.com",
    username: "cajero",
    role: "cashier",
    permissions: ["access_pos", "view_products", "manage_sales"],
    isActive: true,
  },
  {
    id: "3",
    name: "Gerente de Ventas",
    email: "manager@heroui.com",
    username: "gerente",
    role: "manager",
    permissions: ["access_pos", "view_dashboard", "view_products", "view_reports", "manage_sales", "view_expenses"],
    isActive: true,
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for saved user in localStorage
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        // Verify user still exists and is active
        const currentUser = mockUsers.find((u) => u.id === parsedUser.id && u.isActive)
        if (currentUser) {
          setUser(currentUser)
        } else {
          localStorage.removeItem("user")
        }
      } catch (error) {
        localStorage.removeItem("user")
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication with different credentials for each role
    let authenticatedUser: User | null = null

    if (email === "admin@heroui.com" && password === "admin123") {
      authenticatedUser = mockUsers.find((u) => u.email === "admin@heroui.com") || null
    } else if (email === "user@heroui.com" && password === "user123") {
      authenticatedUser = mockUsers.find((u) => u.email === "user@heroui.com") || null
    } else if (email === "manager@heroui.com" && password === "manager123") {
      authenticatedUser = mockUsers.find((u) => u.email === "manager@heroui.com") || null
    }

    if (authenticatedUser && authenticatedUser.isActive) {
      setUser(authenticatedUser)
      localStorage.setItem("user", JSON.stringify(authenticatedUser))
      return true
    }

    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
  }

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
