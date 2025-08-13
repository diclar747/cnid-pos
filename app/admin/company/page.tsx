"use client"

import type React from "react"

import { useState } from "react"
import { Save, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCompany } from "../../context/company-context"

export default function CompanyConfigPage() {
  const { companyConfig, updateCompanyConfig } = useCompany()
  const [formData, setFormData] = useState(companyConfig)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      updateCompanyConfig(formData)
      alert("Configuración guardada exitosamente")
    } catch (error) {
      alert("Error al guardar la configuración")
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración de Empresa</h1>
        <p className="text-muted-foreground">Configura los datos de tu empresa para las facturas</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulario de configuración */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Empresa</CardTitle>
            <CardDescription>Información que aparecerá en las facturas</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la Empresa</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Mi Empresa S.A."
                  required
                />
              </div>

              <div>
                <Label htmlFor="ruc">RUC</Label>
                <Input
                  id="ruc"
                  value={formData.ruc}
                  onChange={(e) => handleInputChange("ruc", e.target.value)}
                  placeholder="80000000-0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Dirección</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Av. Principal 123, Asunción, Paraguay"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+595 21 123456"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="info@miempresa.com.py"
                />
              </div>

              <div>
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="www.miempresa.com.py"
                />
              </div>

              <div>
                <Label htmlFor="slogan">Slogan</Label>
                <Input
                  id="slogan"
                  value={formData.slogan}
                  onChange={(e) => handleInputChange("slogan", e.target.value)}
                  placeholder="Tu mejor opción en productos de calidad"
                />
              </div>

              <div>
                <Label htmlFor="logo">URL del Logo</Label>
                <div className="flex space-x-2">
                  <Input
                    id="logo"
                    value={formData.logo}
                    onChange={(e) => handleInputChange("logo", e.target.value)}
                    placeholder="/placeholder.svg?height=80&width=200&text=LOGO"
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Recomendado: 200x80px, formato PNG o JPG</p>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  "Guardando..."
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Configuración
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Vista previa */}
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de Factura</CardTitle>
            <CardDescription>Así se verá tu factura</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-white text-sm">
              {/* Header de la factura */}
              <div className="text-center border-b pb-4 mb-4">
                <img
                  src={formData.logo || "/placeholder.svg"}
                  alt="Logo"
                  className="mx-auto mb-2 max-h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg?height=60&width=150&text=LOGO"
                  }}
                />
                <h2 className="text-lg font-bold">{formData.name}</h2>
                <p className="text-xs text-gray-600">{formData.slogan}</p>
                <div className="text-xs mt-2 space-y-1">
                  <p>RUC: {formData.ruc}</p>
                  <p>{formData.address}</p>
                  <p>Tel: {formData.phone}</p>
                  {formData.email && <p>Email: {formData.email}</p>}
                  {formData.website && <p>Web: {formData.website}</p>}
                </div>
              </div>

              {/* Ejemplo de factura */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">FACTURA #123456</span>
                  <span>{new Date().toLocaleDateString("es-PY")}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-xs">
                    <span>Producto Ejemplo</span>
                    <span>Gs 25.000</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Otro Producto</span>
                    <span>Gs 15.000</span>
                  </div>
                </div>
                <div className="border-t pt-2 font-semibold">
                  <div className="flex justify-between">
                    <span>TOTAL:</span>
                    <span>Gs 40.000</span>
                  </div>
                </div>
              </div>

              <div className="text-center mt-4 pt-4 border-t text-xs text-gray-500">
                <p>¡Gracias por su compra!</p>
                <p>Conserve este comprobante</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
