"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, Trash2, Users, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useAuth, type User } from "../../context/auth-context"

export default function UsersPage() {
  const { users, createUser, updateUser, deleteUser } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    role: "cashier" as "admin" | "cashier",
    isActive: true,
  })

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      name: "",
      role: "cashier",
      isActive: true,
    })
    setEditingUser(null)
    setShowPassword(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingUser) {
      updateUser(editingUser.id, formData)
    } else {
      const success = createUser(formData)
      if (!success) {
        alert("El nombre de usuario ya existe")
        return
      }
    }

    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: user.password,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (userId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      const success = deleteUser(userId)
      if (!success) {
        alert("No se puede eliminar el administrador principal")
      }
    }
  }

  const toggleUserStatus = (userId: number, isActive: boolean) => {
    updateUser(userId, { isActive })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra los usuarios del sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
              <DialogDescription>
                {editingUser ? "Modifica los datos del usuario" : "Crea un nuevo usuario para el sistema"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "admin" | "cashier") => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="cashier">Cajero</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Usuario Activo</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingUser ? "Actualizar" : "Crear"} Usuario</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{user.name}</CardTitle>
                  <CardDescription>@{user.username}</CardDescription>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {user.id !== 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Rol:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === "admin" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                    }`}
                  >
                    {user.role === "admin" ? "Administrador" : "Cajero"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Estado:</span>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={user.isActive}
                      onCheckedChange={(checked) => toggleUserStatus(user.id, checked)}
                      disabled={user.id === 1}
                    />
                    <span className={user.isActive ? "text-green-600" : "text-red-600"}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Creado:</span>
                  <span className="text-sm">{new Date(user.createdAt).toLocaleDateString("es-PY")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">No hay usuarios</h3>
          <p className="mt-1 text-sm text-muted-foreground">Comienza agregando un nuevo usuario</p>
        </div>
      )}
    </div>
  )
}
