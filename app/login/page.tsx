"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "../context/auth-context"
import { ThemeToggle } from "../components/theme-toggle"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = login(username, password)

      if (success) {
        router.push("/")
      } else {
        setError("Usuario o contraseña incorrectos")
      }
    } catch (error) {
      setError("Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg-light py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md card-dark shadow-adaptive">
        <CardHeader className="text-center">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 btn-gradient rounded-lg flex items-center justify-center">
                <LogIn className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold gradient-text">POS CNID</span>
            </div>
            <ThemeToggle />
          </div>
          <CardTitle className="text-2xl font-bold">Sistema POS</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                "Iniciando sesión..."
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar Sesión
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Credenciales por defecto:</p>
            <p>
              <strong>Usuario:</strong> admin
            </p>
            <p>
              <strong>Contraseña:</strong> admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
