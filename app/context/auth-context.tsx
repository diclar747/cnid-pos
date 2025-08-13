"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user"
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for saved user in localStorage
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication
    if (email === "admin@heroui.com" && password === "admin123") {
      const adminUser: User = {
        id: "1",
        name: "Administrador",
        email: "admin@heroui.com",
        role: "admin",
      }
      setUser(adminUser)
      localStorage.setItem("user", JSON.stringify(adminUser))
      return true
    } else if (email === "user@heroui.com" && password === "user123") {
      const regularUser: User = {
        id: "2",
        name: "Usuario",
        email: "user@heroui.com",
        role: "user",
      }
      setUser(regularUser)
      localStorage.setItem("user", JSON.stringify(regularUser))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
