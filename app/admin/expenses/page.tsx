"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, Trash2, DollarSign, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useSales, type Expense } from "../../context/sales-context"
import { useAuth } from "../../context/auth-context"

export default function ExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense, getTotalExpenses } = useSales()
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [dateFilter, setDateFilter] = useState("")

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const expenseCategories = [
    { value: "suministros", label: "Suministros" },
    { value: "servicios", label: "Servicios" },
    { value: "mantenimiento", label: "Mantenimiento" },
    { value: "marketing", label: "Marketing" },
    { value: "personal", label: "Personal" },
    { value: "transporte", label: "Transporte" },
    { value: "otros", label: "Otros" },
  ]

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      category: "",
      date: new Date().toISOString().split("T")[0],
    })
    setEditingExpense(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const expenseData = {
      description: formData.description,
      amount: Number.parseInt(formData.amount),
      category: formData.category,
      date: new Date(formData.date).toISOString(),
      createdBy: user?.name || "Usuario",
    }

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData)
      } else {
        await addExpense(expenseData)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo guardar el gasto")
      return
    }

    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: new Date(expense.date).toISOString().split("T")[0],
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (expenseId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este gasto?")) {
      try {
        await deleteExpense(expenseId)
      } catch (error) {
        alert(error instanceof Error ? error.message : "No se pudo eliminar el gasto")
      }
    }
  }

  const filteredExpenses = expenses.filter((expense) => {
    if (!dateFilter) return true
    const expenseDate = new Date(expense.date).toISOString().split("T")[0]
    return expenseDate === dateFilter
  })

  const totalExpenses = getTotalExpenses()
  const todayExpenses = getTotalExpenses(new Date().toISOString().split("T")[0], new Date().toISOString().split("T")[0])

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Gastos</h1>
          <p className="text-muted-foreground">Registra y controla los gastos del negocio</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingExpense ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
              <DialogDescription>
                {editingExpense ? "Modifica los datos del gasto" : "Registra un nuevo gasto"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el gasto..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Monto (Gs)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingExpense ? "Actualizar" : "Registrar"} Gasto</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumen de gastos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(todayExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center space-x-2">
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="max-w-sm" />
        <Button variant="outline" onClick={() => setDateFilter("")}>
          Limpiar Filtro
        </Button>
      </div>

      {/* Lista de gastos */}
      <div className="space-y-4">
        {filteredExpenses
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((expense) => (
            <Card key={expense.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold">{expense.description}</h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {expenseCategories.find((c) => c.value === expense.category)?.label || expense.category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{new Date(expense.date).toLocaleDateString("es-PY")}</span>
                      <span>Por: {expense.createdBy}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">{formatCurrency(expense.amount)}</div>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {filteredExpenses.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">No hay gastos registrados</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateFilter ? "No hay gastos para la fecha seleccionada" : "Comienza registrando un nuevo gasto"}
          </p>
        </div>
      )}
    </div>
  )
}
