"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useCompany } from "../../context/company-context"
import BrandingPanel from "./branding-panel"
import { LocationPicker } from "./location-picker"
import { DeliveryPricingPanel } from "./delivery-pricing-panel"
import { AccountPanel } from "./account-panel"
import { Building2, Save, Upload } from "lucide-react"
import { toast } from "react-hot-toast"

export default function CompanyConfigPage() {
  const { companyConfig, updateCompanyConfig, isLoading } = useCompany()
  const [formData, setFormData] = useState(companyConfig)

  useEffect(() => {
    if (!isLoading) {
      setFormData(companyConfig)
    }
  }, [companyConfig, isLoading])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNestedInputChange = (parent: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof typeof prev] as Record<string, string>),
        [field]: value,
      },
    }))
  }

  const handleSave = async () => {
    try {
      await updateCompanyConfig(formData)
      toast.success("Configuración guardada exitosamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuración")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Configuración de Empresa
          </h1>
          <p className="text-muted-foreground">
            Configure los datos de su empresa para facturas y documentos oficiales
          </p>
        </div>
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Guardar Cambios
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-4 sm:grid-cols-8">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ficha">Ficha y mapa</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="cuenta">Cuenta y avisos</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
          <TabsTrigger value="branding">Apariencia</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Datos básicos de la empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Empresa *</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ej: Mi Empresa S.A."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Tipo de Negocio</Label>
                  <Select
                    value={formData.businessType || ""}
                    onValueChange={(value) => handleInputChange("businessType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Comercio Minorista</SelectItem>
                      <SelectItem value="wholesale">Comercio Mayorista</SelectItem>
                      <SelectItem value="restaurant">Restaurante</SelectItem>
                      <SelectItem value="pharmacy">Farmacia</SelectItem>
                      <SelectItem value="supermarket">Supermercado</SelectItem>
                      <SelectItem value="services">Servicios</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slogan">Eslogan</Label>
                <Input
                  id="slogan"
                  value={formData.slogan || ""}
                  onChange={(e) => handleInputChange("slogan", e.target.value)}
                  placeholder="Ej: Tu mejor opción en calidad y precio"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección Completa *</Label>
                <Textarea
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Ej: Av. España 123 c/ Brasil, Asunción"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city || ""}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="Ej: Asunción"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country || "Paraguay"}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Código Postal</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode || ""}
                    onChange={(e) => handleInputChange("postalCode", e.target.value)}
                    placeholder="Ej: 1209"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Ej: +595 21 123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Ej: info@miempresa.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  value={formData.website || ""}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="Ej: https://www.miempresa.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ficha" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ficha del restaurante</CardTitle>
              <CardDescription>Lo que ven tus clientes: descripción, cómo atendés, ubicación y horarios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} placeholder="Cocina casera, menú del día y delivery en todo el centro." rows={3} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp del restaurante</Label>
                  <Input id="whatsapp" value={formData.socialMedia.whatsapp} onChange={(e) => handleNestedInputChange("socialMedia", "whatsapp", e.target.value)} placeholder="+595 981 000 000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessTypeFicha">Tipo de establecimiento</Label>
                  <Input id="businessTypeFicha" value={formData.businessType} onChange={(e) => handleInputChange("businessType", e.target.value)} placeholder="Restaurante, pizzería, cafetería…" />
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-sm dark:border-indigo-900 dark:bg-indigo-950/30">
                <input type="checkbox" className="mt-0.5" checked={formData.showInMarketplace !== false} onChange={(e) => setFormData((prev) => ({ ...prev, showInMarketplace: e.target.checked }))} />
                <span><span className="font-medium">Mostrar en el marketplace</span><span className="block text-muted-foreground">Tu ficha y tu menú aparecen en <a href="/marketplace" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">restopos · Marketplace</a> con botón de WhatsApp para pedir.</span></span>
              </label>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Modalidades de atención</legend>
                <div className="flex flex-wrap gap-4">
                  {([["dineIn", "En el local"], ["delivery", "Delivery"], ["pickup", "Retiro en el local"]] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={formData.serviceModes[key]} onChange={(e) => setFormData((prev) => ({ ...prev, serviceModes: { ...prev.serviceModes, [key]: e.target.checked } }))} /> {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <LocationPicker latitude={formData.latitude} longitude={formData.longitude} mapsUrl={formData.mapsUrl}
                onChange={(next) => setFormData((prev) => ({ ...prev, ...next }))} />
              <details className="rounded-xl border p-3 text-sm">
              <summary className="cursor-pointer font-medium">Cargar a mano (enlace y coordenadas)</summary>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="mapsUrl">Enlace de Google Maps</Label>
                  <Input id="mapsUrl" value={formData.mapsUrl} onChange={(e) => handleInputChange("mapsUrl", e.target.value)} placeholder="https://maps.app.goo.gl/…" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitud</Label>
                  <Input id="latitude" inputMode="decimal" value={formData.latitude} onChange={(e) => handleInputChange("latitude", e.target.value.replace(/[^\d.,-]/g, ""))} placeholder="-25.7801" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitud</Label>
                  <Input id="longitude" inputMode="decimal" value={formData.longitude} onChange={(e) => handleInputChange("longitude", e.target.value.replace(/[^\d.,-]/g, ""))} placeholder="-56.4469" />
                </div>
              </div>
              </details>
              <div>
                <p className="mb-2 text-sm font-medium">Horarios</p>
                <div className="space-y-2">
                  {formData.openingHours.map((day, index) => (
                    <div key={day.day} className="grid grid-cols-[6.5rem_1fr_1fr_auto] items-center gap-2 text-sm">
                      <span className="font-medium">{day.day}</span>
                      <Input type="time" aria-label={`${day.day}: abre`} value={day.open} disabled={day.closed}
                        onChange={(e) => setFormData((prev) => ({ ...prev, openingHours: prev.openingHours.map((d, i) => i === index ? { ...d, open: e.target.value } : d) }))} />
                      <Input type="time" aria-label={`${day.day}: cierra`} value={day.close} disabled={day.closed}
                        onChange={(e) => setFormData((prev) => ({ ...prev, openingHours: prev.openingHours.map((d, i) => i === index ? { ...d, close: e.target.value } : d) }))} />
                      <label className="flex items-center gap-1.5 whitespace-nowrap">
                        <input type="checkbox" checked={day.closed} onChange={(e) => setFormData((prev) => ({ ...prev, openingHours: prev.openingHours.map((d, i) => i === index ? { ...d, closed: e.target.checked } : d) }))} /> Cerrado
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <DeliveryPricingPanel value={formData.deliveryPricing} hasLocation={Boolean(String(formData.latitude ?? "").trim() && String(formData.longitude ?? "").trim())}
            onChange={(deliveryPricing) => setFormData((prev) => ({ ...prev, deliveryPricing }))} />
        </TabsContent>

        <TabsContent value="cuenta" className="space-y-6">
          <AccountPanel />
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Fiscal</CardTitle>
              <CardDescription>Datos requeridos para facturación legal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruc">RUC *</Label>
                  <Input
                    id="ruc"
                    value={formData.ruc || ""}
                    onChange={(e) => handleInputChange("ruc", e.target.value)}
                    placeholder="Ej: 80012345-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRegime">Régimen Tributario</Label>
                  <Select
                    value={formData.taxRegime || "IVA"}
                    onValueChange={(value) => handleInputChange("taxRegime", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IVA">IVA</SelectItem>
                      <SelectItem value="SIMPLE">Régimen Simple</SelectItem>
                      <SelectItem value="EXENTO">Exento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="legalRepresentative">Representante Legal</Label>
                <Input
                  id="legalRepresentative"
                  value={formData.legalRepresentative || ""}
                  onChange={(e) => handleInputChange("legalRepresentative", e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="establishmentCode">Código de Establecimiento</Label>
                  <Input
                    id="establishmentCode"
                    value={formData.establishmentCode || "001"}
                    onChange={(e) => handleInputChange("establishmentCode", e.target.value)}
                    placeholder="001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pointOfSaleCode">Código de Punto de Venta</Label>
                  <Input
                    id="pointOfSaleCode"
                    value={formData.pointOfSaleCode || "001"}
                    onChange={(e) => handleInputChange("pointOfSaleCode", e.target.value)}
                    placeholder="001"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <BrandingPanel formData={formData} setFormData={setFormData} />
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Redes Sociales</CardTitle>
              <CardDescription>Enlaces a redes sociales y contacto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.socialMedia?.facebook || ""}
                    onChange={(e) => handleNestedInputChange("socialMedia", "facebook", e.target.value)}
                    placeholder="https://facebook.com/miempresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.socialMedia?.instagram || ""}
                    onChange={(e) => handleNestedInputChange("socialMedia", "instagram", e.target.value)}
                    placeholder="https://instagram.com/miempresa"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={formData.socialMedia?.twitter || ""}
                    onChange={(e) => handleNestedInputChange("socialMedia", "twitter", e.target.value)}
                    placeholder="https://twitter.com/miempresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.socialMedia?.whatsapp || ""}
                    onChange={(e) => handleNestedInputChange("socialMedia", "whatsapp", e.target.value)}
                    placeholder="+595 21 123456"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facturacion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Facturación</CardTitle>
              <CardDescription>Parámetros para la generación de facturas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Prefijo de Factura</Label>
                  <Input
                    id="invoicePrefix"
                    value={formData.invoicePrefix || "001-001-"}
                    onChange={(e) => handleInputChange("invoicePrefix", e.target.value)}
                    placeholder="001-001-"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentInvoiceNumber">Número Actual de Factura</Label>
                  <Input
                    id="currentInvoiceNumber"
                    type="number"
                    value={formData.currentInvoiceNumber || 1}
                    onChange={(e) => handleInputChange("currentInvoiceNumber", e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Vista previa del número de factura:</h4>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {formData.invoicePrefix || "001-001-"}
                  {String(formData.currentInvoiceNumber || 1).padStart(7, "0")}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Información adicional en facturas</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Los datos de la empresa se incluirán automáticamente</p>
                  <p>• El logo aparecerá en el encabezado de la factura</p>
                  <p>• Los colores corporativos se aplicarán al diseño</p>
                  <p>• La numeración se incrementará automáticamente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
