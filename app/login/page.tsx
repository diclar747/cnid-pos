"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, ShoppingCart, AlertCircle, User, Shield, UserCheck } from "lucide-react"
import { useAuth } from "../context/auth-context"
import toast from "react-hot-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login, user } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Redirect based on user role and permissions
      if (user.role === "admin") {
        router.push("/admin")
      } else if (user.role === "manager") {
        router.push("/admin") // Managers get limited admin access
      } else {
        router.push("/pos") // Cashiers go to POS
      }
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const success = await login(email, password)
      if (success) {
        toast.success("¡Inicio de sesión exitoso!")
        // Redirect will be handled by useEffect above
      } else {
        setError("Credenciales incorrectas. Verifica tu email y contraseña.")
        toast.error("Credenciales incorrectas")
      }
    } catch (error) {
      setError("Error al iniciar sesión. Inténtalo de nuevo.")
      toast.error("Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  const demoAccounts = [
    {
      role: "Administrador",
      email: "admin@heroui.com",
      password: "admin123",
      description: "Acceso completo al sistema",
      icon: Shield,
      color: "bg-red-100 text-red-700 border-red-200",
      permissions: ["Dashboard", "Productos", "Usuarios", "Reportes", "Configuración"],
    },
    {
      role: "Gerente",
      email: "manager@heroui.com",
      password: "manager123",
      description: "Acceso a reportes y POS",
      icon: UserCheck,
      color: "bg-blue-100 text-blue-700 border-blue-200",
      permissions: ["Dashboard", "POS", "Reportes", "Ver Productos"],
    },
    {
      role: "Cajero",
      email: "user@heroui.com",
      password: "user123",
      description: "Solo acceso al POS",
      icon: User,
      color: "bg-green-100 text-green-700 border-green-200",
      permissions: ["POS", "Ventas"],
    },
  ]

  const fillCredentials = (email: string, password: string) => {
    setEmail(email)
    setPassword(password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Login Form */}
        <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                HeroUI POS
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">Inicia sesión para acceder al sistema</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
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

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Iniciando sesión...
                  </div>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Side - Demo Accounts */}
        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Cuentas de Demostración</h2>
            <p className="text-gray-600">Prueba el sistema con diferentes roles y permisos</p>
          </div>

          <div className="space-y-4">
            {demoAccounts.map((account, index) => {
              const Icon = account.icon
              return (
                <Card
                  key={index}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200 bg-white/60 backdrop-blur-sm"
                  onClick={() => fillCredentials(account.email, account.password)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${account.color} border`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{account.role}</h3>
                          <Badge variant="outline" className="text-xs">
                            Demo
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{account.description}</p>

                        <div className="space-y-1 text-xs">
                          <p className="font-mono text-gray-500">
                            <span className="font-medium">Email:</span> {account.email}
                          </p>
                          <p className="font-mono text-gray-500">
                            <span className="font-medium">Contraseña:</span> {account.password}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-3">
                          {account.permissions.map((permission, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Información importante:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>
                    • <strong>Administrador:</strong> Acceso completo al sistema
                  </li>
                  <li>
                    • <strong>Gerente:</strong> Dashboard y reportes limitados
                  </li>
                  <li>
                    • <strong>Cajero:</strong> Solo punto de venta
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
