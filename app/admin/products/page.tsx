"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Edit, Trash2, Package, Upload, RefreshCw, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { useCart, type Product } from "../../context/cart-context"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useCart()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [isLoadingExample, setIsLoadingExample] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingStock, setEditingStock] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [newStock, setNewStock] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    barcode: "",
    description: "",
    stock: "",
    image: "",
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const categories = [
    { value: "comida", label: "Comida" },
    { value: "bebidas", label: "Bebidas" },
    { value: "postres", label: "Postres" },
  ]

  // Productos ejemplo para cargar
  const exampleProducts = [
    {
      name: "Hamburguesa con Queso",
      price: 25000,
      category: "comida",
      barcode: "7501234567890",
      description: "Deliciosa hamburguesa con queso cheddar, lechuga y tomate",
      stock: 50,
      image: "/classic-beef-burger.png",
    },
    {
      name: "Pizza Pepperoni",
      price: 45000,
      category: "comida",
      barcode: "7501234567891",
      description: "Pizza familiar con pepperoni y queso mozzarella",
      stock: 30,
      image: "/delicious-pizza.png",
    },
    {
      name: "Ensalada César",
      price: 18000,
      category: "comida",
      barcode: "7501234567892",
      description: "Ensalada fresca con pollo, crutones y aderezo césar",
      stock: 25,
      image: "/vibrant-mixed-salad.png",
    },
    {
      name: "Coca Cola",
      price: 8000,
      category: "bebidas",
      barcode: "7501234567895",
      description: "Refresco de cola 500ml",
      stock: 100,
      image: "/refreshing-cola.png",
    },
    {
      name: "Pastel de Chocolate",
      price: 20000,
      category: "postres",
      barcode: "7501234567800",
      description: "Porción de pastel de chocolate con crema",
      stock: 20,
      image: "/chocolate-cake-slice.png",
    },
  ]

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      category: "",
      barcode: "",
      description: "",
      stock: "",
      image: "",
    })
    setEditingProduct(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const productData = {
      name: formData.name,
      price: Number.parseInt(formData.price),
      category: formData.category,
      barcode: formData.barcode,
      description: formData.description,
      stock: Number.parseInt(formData.stock),
      image: formData.image || "/placeholder.svg",
    }

    if (editingProduct) {
      updateProduct({ ...productData, id: editingProduct.id })
    } else {
      addProduct(productData)
    }

    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      barcode: product.barcode,
      description: product.description,
      stock: product.stock.toString(),
      image: product.image,
    })
    setIsDialogOpen(true)
  }

  const handleEditStock = (product: Product) => {
    setEditingStock(product)
    setNewStock(product.stock.toString())
    setIsStockDialogOpen(true)
  }

  const handleUpdateStock = () => {
    if (editingStock && newStock) {
      updateProduct({ ...editingStock, stock: Number.parseInt(newStock) })
      setIsStockDialogOpen(false)
      setEditingStock(null)
      setNewStock("")
    }
  }

  const handleDelete = (productId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      deleteProduct(productId)
    }
  }

  const loadExampleProducts = async () => {
    setIsLoadingExample(true)
    try {
      // Simular carga de productos
      for (const product of exampleProducts) {
        // Verificar si el producto ya existe
        const existingProduct = products.find((p) => p.barcode === product.barcode)
        if (!existingProduct) {
          addProduct(product)
        }
      }
      alert("Productos ejemplo cargados exitosamente!")
    } catch (error) {
      alert("Error al cargar productos ejemplo")
    } finally {
      setIsLoadingExample(false)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Productos</h1>
          <p className="text-muted-foreground">Administra el inventario de productos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadExampleProducts}
            disabled={isLoadingExample}
            className="bg-transparent"
          >
            {isLoadingExample ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Cargar Productos Ejemplo
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Modifica los datos del producto" : "Agrega un nuevo producto al inventario"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre del Producto</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Precio (Gs)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Ej: 7501234567890"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del producto"
                  />
                </div>

                <div>
                  <Label htmlFor="image">URL de Imagen</Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="/placeholder.svg"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingProduct ? "Actualizar" : "Crear"} Producto</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alerta informativa */}
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <strong>Integración con Base de Datos:</strong> Los productos se guardan automáticamente en la base de datos.
          Puedes cargar productos ejemplo o crear nuevos productos que se sincronizarán con Supabase.
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="Buscar productos por nombre, código o categoría..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="card-dark">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription className="capitalize">{product.category}</CardDescription>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEditStock(product)} title="Editar Stock">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} title="Editar Producto">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(product.id)}
                    title="Eliminar Producto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Precio:</span>
                  <span className="font-bold">{formatCurrency(product.price)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Stock:</span>
                  <div className="flex items-center gap-2">
                    <span className={product.stock < 10 ? "text-red-600 font-bold" : ""}>{product.stock} unidades</span>
                    {product.stock < 10 && <Badge variant="destructive">Stock Bajo</Badge>}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Código:</span>
                  <span className="text-sm font-mono">{product.barcode}</span>
                </div>
                {product.description && <p className="text-sm text-muted-foreground mt-2">{product.description}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">No hay productos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery
              ? "No se encontraron productos con ese criterio"
              : "Comienza cargando productos ejemplo o agregando un nuevo producto"}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={loadExampleProducts} disabled={isLoadingExample}>
              {isLoadingExample ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Cargar Productos Ejemplo
            </Button>
          )}
        </div>
      )}

      {/* Dialog para editar stock */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Stock</DialogTitle>
            <DialogDescription>
              Actualiza el stock del producto: <strong>{editingStock?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newStock">Nuevo Stock</Label>
              <Input
                id="newStock"
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                placeholder="Ingresa el nuevo stock"
                min="0"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateStock}>Actualizar Stock</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
