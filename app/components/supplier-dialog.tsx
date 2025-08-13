"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSuppliers } from "../context/suppliers-context"

interface SupplierDialogProps {
  supplierId: number | null
  open: boolean
  onClose: () => void
}

export function SupplierDialog({ supplierId, open, onClose }: SupplierDialogProps) {
  const { suppliers, addSupplier, updateSupplier, getSupplierById } = useSuppliers()
  const [formData, setFormData] = useState({
    name: "",
    ruc: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    category: "",
    paymentTerms: "",
    creditLimit: 0,
    isActive: true,
    rating: 5,
    notes: "",
  })

  const isEditing = supplierId !== null
  const supplier = isEditing ? getSupplierById(supplierId) : null

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        ruc: supplier.ruc,
        address: supplier.address,
        phone: supplier.phone,
        email: supplier.email,
        website: supplier.website || "",
        category: supplier.category,
        paymentTerms: supplier.paymentTerms,
        creditLimit: supplier.creditLimit,
        isActive: supplier.isActive,
        rating: supplier.rating,
        notes: supplier.notes || "",
      })
    } else {
      setFormData({
        name: "",
        ruc: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        category: "",
        paymentTerms: "",
        creditLimit: 0,
        isActive: true,
        rating: 5,
        notes: "",
      })
    }
  }, [supplier])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const supplierData = {
      ...formData,
      contacts: supplier?.contacts || [],
    }

    if (isEditing && supplierId) {
      updateSupplier(supplierId, supplierData)
    } else {
      addSupplier(supplierData)
    }

    onClose()
  }

  const categories = ["Alimentos", "Bebidas", "Limpieza", "Oficina", "Tecnología", "Otros"]
  const paymentTermsOptions = ["Contado", "7 días", "15 días", "30 días", "45 días", "60 días"]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica la información del proveedor" : "Completa los datos del nuevo proveedor"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre de la Empresa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="ruc">RUC *</Label>
              <Input
                id="ruc"
                value={formData.ruc}
                onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                placeholder="80123456-7"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+595 21 123456"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="website">Sitio Web</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="www.ejemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Información comercial */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Información Comercial</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentTerms">Términos de Pago</Label>
                <Select
                  value={formData.paymentTerms}
                  onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar términos" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTermsOptions.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="creditLimit">Límite de Crédito (PYG)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="rating">Calificación (1-5)</Label>
                <Select
                  value={formData.rating.toString()}
                  onValueChange={(value) => setFormData({ ...formData, rating: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating} estrella{rating !== 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Proveedor Activo</Label>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Información adicional sobre el proveedor..."
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{isEditing ? "Actualizar" : "Crear"} Proveedor</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
