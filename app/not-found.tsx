"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, ArrowLeft, Search } from "lucide-react"
import { useRouter } from "next/navigation"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Página no encontrada</CardTitle>
          <CardDescription>Lo sentimos, la página que buscas no existe o ha sido movida.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-6xl font-bold text-muted-foreground mb-4">404</div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => router.push("/")} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Ir al Inicio
            </Button>
            <Button onClick={() => router.back()} variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver Atrás
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
