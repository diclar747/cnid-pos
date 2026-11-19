"use client"

import type React from "react"

import { useEffect, useState } from "react"
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Upload,
  RefreshCw,
  Database,
  Search,
  Grid3X3,
  List,
  Download,
  FileText,
  Printer,
  ShoppingCart,
  QrCode,
  Camera,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react"
import { ProductImagePicker } from "../../components/product-image-picker"
import { OptionGroupsDialog } from "./option-groups-dialog"
import { cleanGroups, ModifierEditor, type ModifierGroup } from "../../components/modifier-editor"
import Link from "next/link"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCart, type Product } from "../../context/cart-context"
import { useAuth } from "../../context/auth-context"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QRGenerator } from "../../components/qr-generator"
import { BulkQRGenerator } from "../../components/bulk-qr-generator"
import { CodeCamera } from "../../components/code-camera"
import { useSuppliers } from "../../context/suppliers-context"
import { parseScannedCode } from "@/lib/scan-code"

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, addPurchase, refreshProducts } = useCart()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isGroupsOpen, setIsGroupsOpen] = useState(false)
  const { user } = useAuth()
  const { suppliers } = useSuppliers()
  const [showCodeCamera, setShowCodeCamera] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false)
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)
  const [isBulkQRDialogOpen, setIsBulkQRDialogOpen] = useState(false)
  const [isLoadingExample, setIsLoadingExample] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingStock, setEditingStock] = useState<Product | null>(null)
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [newStock, setNewStock] = useState("")
  const [purchaseQuantity, setPurchaseQuantity] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [supplier, setSupplier] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    barcode: "",
    description: "",
    stock: "",
    trackStock: true,
    image: "",
    supplierId: "",
    promoPrice: "",
    prepMinutes: "",
    ingredients: "",
    isActive: true,
    modifierGroups: [] as ModifierGroup[],
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const categories = Array.from(new Set(["comidas", "bebidas", "postres", ...products.map((product) => product.category).filter(Boolean)]))
    .map((value) => ({ value, label: value.charAt(0).toLocaleUpperCase() + value.slice(1) }))

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
      name: "Alitas de Pollo",
      price: 22000,
      category: "comida",
      barcode: "7501234567893",
      description: "Alitas de pollo crujientes con salsa BBQ",
      stock: 40,
      image: "/crispy-chicken-wings.png",
    },
    {
      name: "Papas Fritas",
      price: 12000,
      category: "comida",
      barcode: "7501234567894",
      description: "Papas fritas doradas y crujientes",
      stock: 60,
      image: "/crispy-french-fries.png",
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
      name: "Té Helado",
      price: 9000,
      category: "bebidas",
      barcode: "7501234567896",
      description: "Té helado con limón 500ml",
      stock: 80,
      image: "/iced-tea.png",
    },
    {
      name: "Jugo de Naranja",
      price: 10000,
      category: "bebidas",
      barcode: "7501234567897",
      description: "Jugo natural de naranja 300ml",
      stock: 70,
      image: "/glass-of-orange-juice.png",
    },
    {
      name: "Café Latte",
      price: 15000,
      category: "bebidas",
      barcode: "7501234567898",
      description: "Café latte con leche espumosa",
      stock: 45,
      image: "/latte-coffee.png",
    },
    {
      name: "Agua Embotellada",
      price: 5000,
      category: "bebidas",
      barcode: "7501234567899",
      description: "Agua mineral 500ml",
      stock: 120,
      image: "/bottled-water.png",
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
    {
      name: "Cheesecake",
      price: 22000,
      category: "postres",
      barcode: "7501234567801",
      description: "Cheesecake de frutilla con base de galleta",
      stock: 15,
      image: "/cheesecake-slice.png",
    },
    {
      name: "Helado",
      price: 16000,
      category: "postres",
      barcode: "7501234567802",
      description: "Copa de helado con frutas y crema",
      stock: 35,
      image: "/ice-cream-sundae.png",
    },
    {
      name: "Pay de Manzana",
      price: 18000,
      category: "postres",
      barcode: "7501234567803",
      description: "Pay casero de manzana con canela",
      stock: 25,
      image: "/apple-pie-slice.png",
    },
    {
      name: "Brownie",
      price: 14000,
      category: "postres",
      barcode: "7501234567804",
      description: "Brownie de chocolate con nueces",
      stock: 30,
      image: "/chocolate-brownie.png",
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
      trackStock: true,
      image: "",
      supplierId: "",
      promoPrice: "",
      prepMinutes: "",
      ingredients: "",
      isActive: true,
      modifierGroups: [],
    })
    setEditingProduct(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const productData = {
      name: formData.name,
      price: Number.parseInt(formData.price),
      category: formData.category,
      barcode: formData.barcode,
      description: formData.description,
      stock: Number.parseInt(formData.stock),
      trackStock: formData.trackStock,
      image: formData.image || "/placeholder.svg",
      supplierId: formData.supplierId ? Number(formData.supplierId) : undefined,
      promoPrice: formData.promoPrice ? Number.parseInt(formData.promoPrice) : null,
      prepMinutes: formData.prepMinutes ? Number.parseInt(formData.prepMinutes) : null,
      ingredients: formData.ingredients,
      isActive: formData.isActive,
      modifierGroups: cleanGroups(formData.modifierGroups),
    }

    try {
      if (editingProduct) {
        await updateProduct({ ...editingProduct, ...productData })
      } else {
        await addProduct(productData)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo guardar el producto")
      return
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
      trackStock: product.trackStock !== false,
      image: product.image,
      supplierId: product.supplierId ? String(product.supplierId) : "",
      promoPrice: product.promoPrice != null ? String(product.promoPrice) : "",
      prepMinutes: product.prepMinutes != null ? String(product.prepMinutes) : "",
      ingredients: product.ingredients ?? "",
      isActive: product.isActive !== false,
      modifierGroups: (product.modifierGroups ?? []) as ModifierGroup[],
    })
    setIsDialogOpen(true)
  }

  const handleEditStock = (product: Product) => {
    setEditingStock(product)
    setNewStock(product.stock.toString())
    setIsStockDialogOpen(true)
  }

  const handleUpdateStock = async () => {
    if (editingStock && newStock) {
      try {
        await updateProduct({ ...editingStock, stock: Number.parseInt(newStock), trackStock: true })
      } catch (error) {
        alert(error instanceof Error ? error.message : "No se pudo actualizar el stock")
        return
      }
      setIsStockDialogOpen(false)
      setEditingStock(null)
      setNewStock("")
    }
  }

  const handlePurchase = (product: Product) => {
    setEditingStock(product)
    setPurchaseQuantity("")
    setPurchasePrice(product.price.toString())
    setSupplier("")
    setIsPurchaseDialogOpen(true)
  }

  const handlePurchaseSubmit = async () => {
    if (editingStock && purchaseQuantity) {
      const quantity = Number.parseInt(purchaseQuantity)
      const unitPrice = Number.parseInt(purchasePrice) || editingStock.price
      try {
        await addPurchase({
        productId: editingStock.id,
        productName: editingStock.name,
        quantity: quantity,
        unitPrice: unitPrice,
        total: unitPrice * quantity,
        date: new Date().toISOString(),
        supplier: supplier || undefined,
        createdBy: user?.name || "Usuario",
        })
      } catch (error) {
        alert(error instanceof Error ? error.message : "No se pudo registrar la compra")
        return
      }

      setIsPurchaseDialogOpen(false)
      setEditingStock(null)
      setPurchaseQuantity("")
      setPurchasePrice("")
      setSupplier("")
      alert(`Compra registrada: ${quantity} unidades agregadas al stock`)
    }
  }

  const handleGenerateQR = (product: Product) => {
    setSelectedProductForQR(product)
    setIsQRDialogOpen(true)
  }

  const handleDelete = async (productId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      try {
        await deleteProduct(productId)
      } catch (error) {
        alert(error instanceof Error ? error.message : "No se pudo eliminar el producto")
      }
    }
  }

  const loadExampleProducts = async () => {
    setIsLoadingExample(true)
    try {
      for (const product of exampleProducts) {
        const existingProduct = products.find((p) => p.barcode === product.barcode)
        if (!existingProduct) {
          await addProduct(product)
        }
      }
      alert("Productos ejemplo cargados exitosamente!")
    } catch (error) {
      alert("Error al cargar productos ejemplo")
    } finally {
      setIsLoadingExample(false)
    }
  }

  const exportToExcel = () => {
    const csvContent = [
      ["Nombre", "Categoría", "Precio", "Stock", "Código", "Descripción"].join(","),
      ...filteredProducts.map((product) =>
        [
          `"${product.name}"`,
          `"${product.category}"`,
          product.price,
          product.stock,
          `"${product.barcode}"`,
          `"${product.description}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `productos_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Lista de Productos</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .low-stock { color: red; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Lista de Productos</h1>
          <p>Fecha: ${new Date().toLocaleDateString("es-PY")}</p>
          <p>Total de productos: ${filteredProducts.length}</p>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Código</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProducts
                .map(
                  (product) => `
                <tr>
                  <td>${product.name}</td>
                  <td>${product.category}</td>
                  <td>${formatCurrency(product.price)}</td>
                  <td class="${product.stock < 10 ? "low-stock" : ""}">${product.stock}</td>
                  <td>${product.barcode}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const printList = () => {
    exportToPDF()
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode ?? "").includes(searchQuery) ||
      (product.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })
  // Paginación: 20 por página (se puede cambiar); vuelve a la primera al buscar o filtrar.
  useEffect(() => { setPage(1) }, [searchQuery, categoryFilter, pageSize])
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageItems = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const pager = filteredProducts.length > 0 && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredProducts.length)} de {filteredProducts.length} productos
      </span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-muted-foreground">Por página
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-8 rounded-md border bg-background px-2 text-foreground">
            {[15, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <Button variant="outline" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).filter((n) => n === 1 || n === pageCount || Math.abs(n - currentPage) <= 1).map((n, index, list) => (
          <span key={n} className="flex items-center gap-2">
            {index > 0 && n - list[index - 1] > 1 && <span className="text-muted-foreground">…</span>}
            <Button variant={n === currentPage ? "default" : "outline"} size="sm" className="min-w-8" onClick={() => setPage(n)} aria-current={n === currentPage ? "page" : undefined}>{n}</Button>
          </span>
        ))}
        <Button variant="outline" size="sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount} aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Productos</h1>
          <p className="text-muted-foreground">Administra el inventario de productos</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Button variant="outline" asChild><Link href="/admin/purchase-orders"><ShoppingCart className="mr-2 h-4 w-4" /> Órdenes de compra</Link></Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? "Modifica los datos del producto" : "Agrega un nuevo producto al inventario"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="category">Categoría</Label>
                    <Input id="category" list="product-categories" value={formData.category}
                      onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                      placeholder="Elegí o escribí una categoría" required />
                    <datalist id="product-categories">{categories.map((category) => <option key={category.value} value={category.value} />)}</datalist>
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required={formData.trackStock}
                      disabled={!formData.trackStock}
                    />
                    <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" checked={formData.trackStock}
                        onChange={(event) => setFormData({ ...formData, trackStock: event.target.checked, stock: event.target.checked ? formData.stock : "0" })} />
                      Controlar cantidad en stock
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="barcode">Código QR o de barras</Label>
                  <div className="flex gap-2"><Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Escribí o escaneá el código"
                    required
                  /><Button type="button" variant="outline" size="icon" onClick={() => setShowCodeCamera(true)} title="Escanear con cámara" aria-label="Escanear código del producto"><Camera className="h-4 w-4" /></Button></div>
                  <p className="mt-1 text-xs text-muted-foreground">Al escanear se completa el código; un QR generado por este sistema también puede completar nombre y precio.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div><Label htmlFor="promoPrice">Precio promocional</Label>
                    <Input id="promoPrice" inputMode="numeric" value={formData.promoPrice} onChange={(event) => setFormData({ ...formData, promoPrice: event.target.value.replace(/D/g, "").slice(0, 10) })} placeholder="Opcional" />
                    <p className="mt-1 text-[11px] text-muted-foreground">Si es menor al precio, se cobra este.</p></div>
                  <div><Label htmlFor="prepMinutes">Preparación (min)</Label>
                    <Input id="prepMinutes" inputMode="numeric" value={formData.prepMinutes} onChange={(event) => setFormData({ ...formData, prepMinutes: event.target.value.replace(/D/g, "").slice(0, 3) })} placeholder="Ej.: 15" /></div>
                  <label className="flex items-center gap-2 self-center text-sm font-medium"><input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })} />Disponible para vender</label>
                </div>
                <div><Label htmlFor="ingredients">Ingredientes</Label>
                  <Input id="ingredients" value={formData.ingredients} onChange={(event) => setFormData({ ...formData, ingredients: event.target.value })} maxLength={500} placeholder="Ej.: carne, cheddar, tomate, lechuga" /></div>
                <div><Label>Opciones y adicionales</Label><p className="mb-2 text-xs text-muted-foreground">Tamaños, variantes, punto de cocción o extras con precio. Se usan en el POS, el QR de mesa y WhatsApp.</p>
                  <ModifierEditor groups={formData.modifierGroups} onChange={(modifierGroups) => setFormData({ ...formData, modifierGroups })} /></div>

                <div><Label>Proveedor principal</Label><Select value={formData.supplierId || "none"} onValueChange={(value) => setFormData({ ...formData, supplierId: value === "none" ? "" : value })}><SelectTrigger><SelectValue placeholder="Seleccioná un proveedor" /></SelectTrigger><SelectContent><SelectItem value="none">Sin proveedor asignado</SelectItem>{suppliers.filter((item) => item.isActive).map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} · {item.ruc}</SelectItem>)}</SelectContent></Select></div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del producto"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Foto del producto</Label>
                  <ProductImagePicker value={formData.image} onChange={(image) => setFormData((current) => ({ ...current, image }))} />
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

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <strong>Integración con Base de Datos:</strong> Los productos se guardan automáticamente en la base de datos.
          Puedes cargar productos de ejemplo o crear nuevos productos en la base local.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-80"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" onClick={() => setIsGroupsOpen(true)} className="bg-transparent">
            <Layers className="mr-2 h-4 w-4" />
            Opciones
          </Button>
          <Button variant="outline" onClick={() => setIsBulkQRDialogOpen(true)} className="bg-transparent">
            <QrCode className="mr-2 h-4 w-4" />
            QR Lote
          </Button>
          <Button variant="outline" onClick={exportToExcel} className="bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportToPDF} className="bg-transparent">
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={printList} className="bg-transparent">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <OptionGroupsDialog open={isGroupsOpen} onClose={() => setIsGroupsOpen(false)} onChanged={() => void refreshProducts()} />
      {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((product) => (
            <Card key={product.id} className="card-dark">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="capitalize">{product.category}</CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleGenerateQR(product)} title="Generar QR">
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePurchase(product)}
                      title="Registrar Compra"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
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
                      <span className={product.trackStock !== false && product.stock < 10 ? "text-red-600 font-bold" : ""}>
                        {product.trackStock === false ? "Sin control de cantidad" : `${product.stock} unidades`}
                      </span>
                      {product.trackStock !== false && product.stock < 10 && <Badge variant="destructive">Stock Bajo</Badge>}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>Código:</span>
                    <span className="text-sm font-mono">{product.barcode}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm"><span>Proveedor:</span><span className="truncate text-right text-muted-foreground">{suppliers.find((supplier) => supplier.id === product.supplierId)?.name || "Sin asignar"}</span></div>
                  {product.description && <p className="text-sm text-muted-foreground mt-2">{product.description}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="card-dark">
          <CardHeader>
            <CardTitle>Lista de Productos ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="capitalize">{product.category}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={product.trackStock !== false && product.stock < 10 ? "text-red-600 font-bold" : ""}>{product.trackStock === false ? "Sin control" : product.stock}</span>
                        {product.trackStock !== false && product.stock < 10 && (
                          <Badge variant="destructive" className="text-xs">
                            Bajo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.barcode}</TableCell>
                    <TableCell>{suppliers.find((supplier) => supplier.id === product.supplierId)?.name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleGenerateQR(product)}
                          title="Generar QR"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePurchase(product)}
                          title="Registrar Compra"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditStock(product)}
                          title="Editar Stock"
                        >
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {pager}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">No hay productos</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery || categoryFilter !== "all"
              ? "No se encontraron productos con los filtros aplicados"
              : "Comienza cargando productos ejemplo o agregando un nuevo producto"}
          </p>
          {!searchQuery && categoryFilter === "all" && (
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

      {/* Diálogos existentes */}
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

      <CodeCamera open={showCodeCamera} onClose={() => setShowCodeCamera(false)} onResult={(value) => {
        const scanned = parseScannedCode(value)
        setFormData((current) => ({ ...current, barcode: scanned.code,
          name: current.name || scanned.name || "",
          price: current.price || (scanned.price !== undefined ? String(scanned.price) : ""),
          category: current.category || scanned.category || "",
        }))
      }} />

      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Compra</DialogTitle>
            <DialogDescription>
              Registra una compra para: <strong>{editingStock?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="purchaseQuantity">Cantidad Comprada</Label>
              <Input
                id="purchaseQuantity"
                type="number"
                value={purchaseQuantity}
                onChange={(e) => setPurchaseQuantity(e.target.value)}
                placeholder="Cantidad de productos comprados"
                min="1"
                required
              />
            </div>
            <div>
              <Label htmlFor="purchasePrice">Precio de Compra por Unidad</Label>
              <Input
                id="purchasePrice"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="Precio por unidad"
                min="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="supplier">Proveedor (Opcional)</Label>
              <Input
                id="supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Nombre del proveedor"
              />
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm">
                <strong>Stock actual:</strong> {editingStock?.stock} unidades
              </p>
              <p className="text-sm">
                <strong>Stock después de compra:</strong>{" "}
                {editingStock && purchaseQuantity
                  ? editingStock.stock + Number.parseInt(purchaseQuantity)
                  : editingStock?.stock}{" "}
                unidades
              </p>
              <p className="text-sm">
                <strong>Total de compra:</strong>{" "}
                {purchaseQuantity && purchasePrice
                  ? formatCurrency(Number.parseInt(purchaseQuantity) * Number.parseInt(purchasePrice))
                  : "Gs 0"}
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsPurchaseDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePurchaseSubmit} disabled={!purchaseQuantity || !purchasePrice}>
                Registrar Compra
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Componentes de QR */}
      {selectedProductForQR && (
        <QRGenerator
          product={selectedProductForQR}
          isOpen={isQRDialogOpen}
          onClose={() => {
            setIsQRDialogOpen(false)
            setSelectedProductForQR(null)
          }}
        />
      )}

      <BulkQRGenerator
        products={filteredProducts}
        isOpen={isBulkQRDialogOpen}
        onClose={() => setIsBulkQRDialogOpen(false)}
      />
    </div>
  )
}
