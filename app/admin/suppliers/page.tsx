"use client"

import { useState } from "react"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Star,
  Users,
  Building,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSuppliers } from "../../context/suppliers-context"
import { SupplierDialog } from "../../components/supplier-dialog"
import { ContactsDialog } from "../../components/contacts-dialog"
import { AutoOrdersDialog } from "../../components/auto-orders-dialog"

export default function SuppliersPage() {
  const { suppliers, deleteSupplier } = useSuppliers()
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null)
  const [dialogType, setDialogType] = useState<"supplier" | "contacts" | "autoOrders" | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.ruc.includes(searchTerm) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === "all" || supplier.category === categoryFilter

    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? supplier.isActive : !supplier.isActive)

    return matchesSearch && matchesCategory && matchesStatus
  })

  const categories = Array.from(new Set(suppliers.map((s) => s.category)))

  const handleEdit = (supplierId: number) => {
    setSelectedSupplier(supplierId)
    setDialogType("supplier")
  }

  const handleContacts = (supplierId: number) => {
    setSelectedSupplier(supplierId)
    setDialogType("contacts")
  }

  const handleAutoOrders = (supplierId: number) => {
    setSelectedSupplier(supplierId)
    setDialogType("autoOrders")
  }

  const handleDelete = async (supplierId: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este proveedor?")) {
      try {
        await deleteSupplier(supplierId)
      } catch (error) {
        alert(error instanceof Error ? error.message : "No se pudo eliminar el proveedor")
      }
    }
  }

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
      />
    ))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8 text-blue-600" />
            Gestión de Proveedores
          </h1>
          <p className="text-muted-foreground">Administra proveedores, contactos y pedidos automáticos</p>
        </div>
        <Button
          onClick={() => {
            setSelectedSupplier(null)
            setDialogType("supplier")
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar proveedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Badge variant="outline">{filteredSuppliers.length} proveedores</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de proveedores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {supplier.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                    <CardDescription>{supplier.category}</CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(supplier.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleContacts(supplier.id)}>
                      <Users className="mr-2 h-4 w-4" />
                      Contactos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAutoOrders(supplier.id)}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Pedidos Auto
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(supplier.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Información básica */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  <span className="truncate">{supplier.address}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="mr-2 h-4 w-4" />
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  <span className="truncate">{supplier.email}</span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-2">
                <div className="flex">{getRatingStars(supplier.rating)}</div>
                <span className="text-sm text-muted-foreground">({supplier.rating})</span>
              </div>

              {/* Información financiera */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Límite de Crédito</p>
                  <p className="text-sm font-medium">{formatCurrency(supplier.creditLimit)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Términos de Pago</p>
                  <p className="text-sm font-medium">{supplier.paymentTerms}</p>
                </div>
              </div>

              {/* Estado y contactos */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Badge variant={supplier.isActive ? "default" : "secondary"}>
                  {supplier.isActive ? "Activo" : "Inactivo"}
                </Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-1 h-4 w-4" />
                  {supplier.contacts.length} contacto{supplier.contacts.length !== 1 ? "s" : ""}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No se encontraron proveedores</h3>
            <p className="text-muted-foreground text-center mb-4">
              No hay proveedores que coincidan con los filtros seleccionados.
            </p>
            <Button
              onClick={() => {
                setSelectedSupplier(null)
                setDialogType("supplier")
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Primer Proveedor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Diálogos */}
      {dialogType === "supplier" && (
        <SupplierDialog
          supplierId={selectedSupplier}
          open={true}
          onClose={() => {
            setDialogType(null)
            setSelectedSupplier(null)
          }}
        />
      )}

      {dialogType === "contacts" && selectedSupplier && (
        <ContactsDialog
          supplierId={selectedSupplier}
          open={true}
          onClose={() => {
            setDialogType(null)
            setSelectedSupplier(null)
          }}
        />
      )}

      {dialogType === "autoOrders" && selectedSupplier && (
        <AutoOrdersDialog
          supplierId={selectedSupplier}
          open={true}
          onClose={() => {
            setDialogType(null)
            setSelectedSupplier(null)
          }}
        />
      )}
    </div>
  )
}
