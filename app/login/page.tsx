"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, ShoppingCart, AlertCircle, UtensilsCrossed, BarChart3, PackageCheck } from "lucide-react"
import Link from "next/link"
import { InstallAppButton } from "../components/install-app"
import { LaptopFrame, PhoneFrame, Screen } from "../components/landing/device-frame"
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
      if (user.role === "superadmin") {
        router.push("/superadmin")
      } else if (user.role === "admin") {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Login Form */}
        <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <img src="/brand/restopos-icon.svg" alt="RestoPOS" className="mx-auto h-16 w-16 rounded-2xl shadow-lg shadow-violet-500/30" />
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                RestoPOS
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
            <div className="flex flex-col items-center gap-2 border-t pt-4 text-sm">
              <InstallAppButton className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-100" label="Instalar RestoPOS como app" />
              <Link href="/welcome?again=1" className="text-indigo-600 hover:underline">Ver la presentación</Link>
            </div>
          </CardContent>
        </Card>

        <div className="relative hidden overflow-hidden rounded-3xl bg-slate-950 p-8 text-white shadow-2xl sm:p-10 lg:block">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-600/30 blur-3xl" />
          <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><UtensilsCrossed className="h-7 w-7" /></div>
          <p className="relative mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Tu restaurante</p>
          <h2 className="relative mb-3 text-4xl font-bold tracking-tight">Todo bajo control</h2>
          <p className="relative mb-8 max-w-md text-slate-300">Ventas, mesas, cocina, caja y delivery de cada restaurante en un solo lugar.</p>
          <div className="relative flex items-end">
            <div className="min-w-0 flex-1"><LaptopFrame><Screen src="/landing/panel.webp" alt="Panel de RestoPOS con las ventas del día" /></LaptopFrame></div>
            <div className="relative z-10 -mb-2 -ml-[4%] w-[22%] shrink-0 motion-safe:animate-[float_6s_ease-in-out_infinite]"><PhoneFrame><Screen src="/landing/mesa-qr.webp" alt="Pedido desde el QR de la mesa" /></PhoneFrame></div>
          </div>
          <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><PackageCheck className="mb-3 h-5 w-5 text-blue-300" /><p className="font-medium">Menú completo</p><p className="mt-1 text-sm text-slate-400">Artículos, variantes y agregados.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><BarChart3 className="mb-3 h-5 w-5 text-blue-300" /><p className="font-medium">Caja y estadísticas</p><p className="mt-1 text-sm text-slate-400">Arqueo, medios de pago y reportes.</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
