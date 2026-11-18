"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Phone, Mail, Star, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useSuppliers, type SupplierContact } from "../context/suppliers-context"

interface ContactsDialogProps {
  supplierId: number
  open: boolean
  onClose: () => void
}

export function ContactsDialog({ supplierId, open, onClose }: ContactsDialogProps) {
  const { getSupplierById, addContact, updateContact, deleteContact } = useSuppliers()
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    phone: "",
    email: "",
    isPrimary: false,
  })

  const supplier = getSupplierById(supplierId)

  useEffect(() => {
    if (editingContact) {
      setFormData({
        name: editingContact.name,
        position: editingContact.position,
        phone: editingContact.phone,
        email: editingContact.email,
        isPrimary: editingContact.isPrimary,
      })
      setShowForm(true)
    } else {
      setFormData({
        name: "",
        position: "",
        phone: "",
        email: "",
        isPrimary: false,
      })
    }
  }, [editingContact])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingContact) {
        await updateContact(supplierId, editingContact.id, formData)
        setEditingContact(null)
      } else {
        await addContact(supplierId, formData)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo guardar el contacto")
      return
    }

    setShowForm(false)
    setFormData({
      name: "",
      position: "",
      phone: "",
      email: "",
      isPrimary: false,
    })
  }

  const handleEdit = (contact: SupplierContact) => {
    setEditingContact(contact)
  }

  const handleDelete = async (contactId: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este contacto?")) {
      try {
        await deleteContact(supplierId, contactId)
      } catch (error) {
        alert(error instanceof Error ? error.message : "No se pudo eliminar el contacto")
      }
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingContact(null)
    setFormData({
      name: "",
      position: "",
      phone: "",
      email: "",
      isPrimary: false,
    })
  }

  if (!supplier) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contactos - {supplier.name}</DialogTitle>
          <DialogDescription>Gestiona los contactos del proveedor</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Botón para agregar nuevo contacto */}
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Contacto
            </Button>
          )}

          {/* Formulario de contacto */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingContact ? "Editar Contacto" : "Nuevo Contacto"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nombre Completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="position">Cargo/Posición *</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Teléfono *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+595 981 123456"
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
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPrimary"
                      checked={formData.isPrimary}
                      onCheckedChange={(checked: boolean) => setFormData({ ...formData, isPrimary: checked })}
                    />
                    <Label htmlFor="isPrimary">Contacto Principal</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                    <Button type="submit">{editingContact ? "Actualizar" : "Agregar"} Contacto</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Lista de contactos */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contactos ({supplier.contacts.length})</h3>

            {supplier.contacts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No hay contactos registrados para este proveedor</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {supplier.contacts.map((contact) => (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {contact.name}
                            {contact.isPrimary && (
                              <Badge variant="default" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Principal
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{contact.position}</p>
                        </div>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(contact)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(contact.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${contact.phone}`} className="text-sm hover:underline text-blue-600">
                          {contact.phone}
                        </a>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${contact.email}`} className="text-sm hover:underline text-blue-600 truncate">
                          {contact.email}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
