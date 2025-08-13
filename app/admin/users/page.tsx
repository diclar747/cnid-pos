"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, Search, UserPlus, Shield, User, Eye, EyeOff, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"

interface UserData {
  id: string
  name: string
  email: string
  username: string
  role: "admin" | "cashier" | "manager"
  permissions: string[]
  status: "active" | "inactive"
  lastLogin: string
  createdAt: string
}

const availablePermissions = [
  { id: "view_dashboard", label: "Ver Dashboard", description: "Acceso al panel principal" },
  { id: "manage_products", label: "Gestionar Productos", description: "Crear, editar y eliminar productos" },
  { id: "manage_users", label: "Gestionar Usuarios", description: "Administrar cuentas de usuario" },
  { id: "view_reports", label: "Ver Reportes", description: "Acceso a reportes y estadísticas" },
  { id: "manage_expenses", label: "Gestionar Gastos", description: "Control de gastos y finanzas" },
  { id: "manage_company", label: "Configuración Empresa", description: "Configurar datos de la empresa" },
  { id: "manage_purchases", label: "Gestionar Compras", description: "Control de compras y proveedores" },
  { id: "manage_suppliers", label: "Gestionar Proveedores", description: "Administrar proveedores" },
  { id: "access_pos", label: "Acceso POS", description: "Usar el punto de venta" },
  { id: "manage_sales", label: "Gestionar Ventas", description: "Procesar ventas y transacciones" },
]

const rolePermissions = {
  admin: availablePermissions.map((p) => p.id),
  manager: ["view_dashboard", "view_reports", "access_pos", "manage_sales", "view_expenses"],
  cashier: ["access_pos", "manage_sales"],
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([
    {
      id: "1",
      name: "Administrador Principal",
      email: "admin@heroui.com",
      username: "admin",
      role: "admin",
      permissions: rolePermissions.admin,
      status: "active",
      lastLogin: "2024-01-15T10:30:00Z",
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      name: "Cajero Principal",
      email: "user@heroui.com",
      username: "cajero",
      role: "cashier",
      permissions: rolePermissions.cashier,
      status: "active",
      lastLogin: "2024-01-15T09:15:00Z",
      createdAt: "2024-01-05T00:00:00Z",
    },
    {
      id: "3",
      name: "Gerente de Ventas",
      email: "manager@heroui.com",
      username: "gerente",
      role: "manager",
      permissions: rolePermissions.manager,
      status: "active",
      lastLogin: "2024-01-10T14:20:00Z",
      createdAt: "2024-01-08T00:00:00Z",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "cashier" as "admin" | "cashier" | "manager",
    permissions: [] as string[],
    status: "active" as "active" | "inactive",
  })

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleRoleChange = (role: "admin" | "cashier" | "manager") => {
    setFormData({
      ...formData,
      role,
      permissions: rolePermissions[role],
    })
  }

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permissionId],
      })
    } else {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter((p) => p !== permissionId),
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name || !formData.email || !formData.username) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    if (!editingUser && !formData.password) {
      toast.error("La contraseña es requerida para nuevos usuarios")
      return
    }

    // Check for duplicate email/username
    const existingUser = users.find(
      (u) => u.id !== editingUser?.id && (u.email === formData.email || u.username === formData.username),
    )

    if (existingUser) {
      toast.error("El email o nombre de usuario ya existe")
      return
    }

    if (editingUser) {
      setUsers(
        users.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                ...formData,
                // Don't update password if it's empty during edit
                ...(formData.password ? {} : { password: undefined }),
              }
            : user,
        ),
      )
      toast.success("Usuario actualizado exitosamente")
    } else {
      const newUser: UserData = {
        id: Date.now().toString(),
        ...formData,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      setUsers([...users, newUser])
      toast.success("Usuario creado exitosamente")
    }

    setIsDialogOpen(false)
    setEditingUser(null)
    setFormData({
      name: "",
      email: "",
      username: "",
      password: "",
      role: "cashier",
      permissions: rolePermissions.cashier,
      status: "active",
    })
  }

  const handleEdit = (user: UserData) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      username: user.username,
      password: "", // Don't show existing password
      role: user.role,
      permissions: user.permissions,
      status: user.status,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (userId: string) => {
    if (userId === "1") {
      toast.error("No se puede eliminar el administrador principal")
      return
    }

    setUsers(users.filter((user) => user.id !== userId))
    toast.success("Usuario eliminado exitosamente")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getRoleInfo = (role: string) => {
    switch (role) {
      case "admin":
        return { label: "Administrador", color: "bg-red-100 text-red-700 border-red-200", icon: Shield }
      case "manager":
        return { label: "Gerente", color: "bg-blue-100 text-blue-700 border-blue-200", icon: UserPlus }
      case "cashier":
        return { label: "Cajero", color: "bg-green-100 text-green-700 border-green-200", icon: User }
      default:
        return { label: "Usuario", color: "bg-gray-100 text-gray-700 border-gray-200", icon: User }
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra los usuarios del sistema y sus permisos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña {editingUser ? "(dejar vacío para mantener actual)" : "*"}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Rol del Usuario *</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cajero - Solo POS</SelectItem>
                    <SelectItem value="manager">Gerente - POS + Reportes</SelectItem>
                    <SelectItem value="admin">Administrador - Acceso Completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Permisos del Usuario</Label>
                  <p className="text-sm text-muted-foreground">
                    Los permisos se asignan automáticamente según el rol, pero puedes personalizarlos
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Roles predefinidos:</strong>
                    <br />• <strong>Cajero:</strong> Solo acceso al POS
                    <br />• <strong>Gerente:</strong> POS + Dashboard + Reportes
                    <br />• <strong>Administrador:</strong> Acceso completo al sistema
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {availablePermissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={permission.id}
                        checked={formData.permissions.includes(permission.id)}
                        onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={permission.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {permission.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingUser ? "Actualizar Usuario" : "Crear Usuario"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingUser(null)
                    setFormData({
                      name: "",
                      email: "",
                      username: "",
                      password: "",
                      role: "cashier",
                      permissions: rolePermissions.cashier,
                      status: "active",
                    })
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.status === "active").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cajeros</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === "cashier").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>Gestiona todos los usuarios del sistema y sus permisos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios por nombre, email o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const roleInfo = getRoleInfo(user.role)
                  const RoleIcon = roleInfo.icon

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-gradient-to-r from-blue-100 to-purple-100">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                            <div className="text-xs text-muted-foreground">@{user.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleInfo.color} border`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "secondary"}>
                          {user.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.permissions.slice(0, 3).map((permission) => {
                            const permissionInfo = availablePermissions.find((p) => p.id === permission)
                            return (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permissionInfo?.label.split(" ")[0] || permission}
                              </Badge>
                            )
                          })}
                          {user.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.permissions.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(user.lastLogin)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            className="text-destructive hover:text-destructive"
                            disabled={user.id === "1"} // Prevent deleting main admin
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
