"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"

export interface User {
  id: number
  username: string
  password: string
  role: "admin" | "cashier"
  name: string
  createdAt: string
  isActive: boolean
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
  isAdmin: boolean
  users: User[]
  createUser: (userData: Omit<User, "id" | "createdAt">) => boolean
  updateUser: (id: number, userData: Partial<User>) => boolean
  deleteUser: (id: number) => boolean
  syncWithDatabase: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const defaultUsers: User[] = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    role: "admin",
    name: "Administrador Principal",
    createdAt: new Date().toISOString(),
    isActive: true,
  },
  {
    id: 2,
    username: "cajero1",
    password: "cajero123",
    role: "cashier",
    name: "Juan Pérez",
    createdAt: new Date().toISOString(),
    isActive: true,
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>(defaultUsers)

  useEffect(() => {
    // Cargar usuarios desde localStorage
    const savedUsers = localStorage.getItem("users")
    if (savedUsers) {
      try {
        const parsedUsers = JSON.parse(savedUsers)
        setUsers(parsedUsers.length > 0 ? parsedUsers : defaultUsers)
      } catch (error) {
        console.error("Error al cargar usuarios:", error)
        setUsers(defaultUsers)
      }
    } else {
      localStorage.setItem("users", JSON.stringify(defaultUsers))
    }

    // Verificar sesión activa
    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser)
        // Verificar que el usuario aún existe y está activo
        const currentUser = users.find((u) => u.id === parsedUser.id && u.isActive)
        if (currentUser) {
          setUser(currentUser)
        } else {
          localStorage.removeItem("currentUser")
        }
      } catch (error) {
        console.error("Error al cargar sesión:", error)
        localStorage.removeItem("currentUser")
      }
    }
  }, [])

  useEffect(() => {
    // Guardar usuarios en localStorage
    if (users.length > 0) {
      localStorage.setItem("users", JSON.stringify(users))
    }
  }, [users])

  const login = (username: string, password: string): boolean => {
    const foundUser = users.find((u) => u.username === username && u.password === password && u.isActive)

    if (foundUser) {
      setUser(foundUser)
      localStorage.setItem("currentUser", JSON.stringify(foundUser))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("currentUser")
  }

  const createUser = (userData: Omit<User, "id" | "createdAt">): boolean => {
    // Verificar si el username ya existe
    if (users.some((u) => u.username === userData.username)) {
      return false
    }

    const newUser: User = {
      ...userData,
      id: Math.max(...users.map((u) => u.id)) + 1,
      createdAt: new Date().toISOString(),
    }

    setUsers((prev) => [...prev, newUser])
    return true
  }

  const updateUser = (id: number, userData: Partial<User>): boolean => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...userData } : user)))

    // Si se actualiza el usuario actual, actualizar también la sesión
    if (user && user.id === id) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem("currentUser", JSON.stringify(updatedUser))
    }

    return true
  }

  const deleteUser = (id: number): boolean => {
    if (id === 1) return false // No permitir eliminar admin principal
    setUsers((prev) => prev.filter((user) => user.id !== id))

    // Si se elimina el usuario actual, cerrar sesión
    if (user && user.id === id) {
      logout()
    }

    return true
  }

  const syncWithDatabase = async () => {
    try {
      console.log("Sincronizando usuarios con base de datos...")

      // Simular sincronización
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // En una implementación real, aquí harías:
      // 1. Enviar usuarios locales a Supabase
      // 2. Obtener usuarios actualizados de Supabase
      // 3. Actualizar el estado local

      console.log("Sincronización de usuarios completada")
    } catch (error) {
      console.error("Error en sincronización de usuarios:", error)
      throw error
    }
  }

  const isAdmin = user?.role === "admin"

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        users,
        createUser,
        updateUser,
        deleteUser,
        syncWithDatabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}
