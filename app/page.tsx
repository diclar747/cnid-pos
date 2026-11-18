"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./context/auth-context"
import LandingPage from "./landing/page"
import { useState } from "react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      // Redirect authenticated users based on their role
      if (user.role === "admin") {
        router.push("/admin")
      } else if (user.role === "manager") {
        router.push("/admin") // Managers get limited admin access
      } else if (user.role === "cashier") {
        router.push("/pos")
      } else {
        router.push("/pos") // Default to POS for any other role
      }
    }
  }, [user, loading, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  // If user is not authenticated, show the landing page
  if (!user) {
    return <LandingPage />
  }

  // This should not be reached due to the useEffect redirect, but just in case
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  )
}
