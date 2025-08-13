"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Package, Calendar, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSuppliers, type AutoOrder } from "../context/suppliers-context"
import { useCart } from "../context/cart-context"

interface AutoOrdersDialogProps {
  supplierId: number
  open: boolean
  onClose: () => void
}

export function AutoOrdersDialog({ supplierId, open, onClose }: AutoOrdersDialogProps) {
  const { getSupplierById, autoOrders, addAutoOrder, updateAutoOrder, deleteAutoOrder } = useSuppliers()
  const { products } = useCart()
  const [editingOrder, setEditingOrder] = useState<AutoOrder | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    productId: 0,
    minStock: 10,
    orderQuantity: 50,
    isActive: true,
  })

  const supplier = getSupplierById(supplierId)
  const supplierOrders = autoOrders.filter((order) => order.supplierId === supplierId)

  useEffect(() => {
    if (editingOrder) {
      setFormData({
        productId: editingOrder.productId,
        minStock: editingOrder.minStock,
        orderQuantity: editingOrder.orderQuantity,
        isActive: editingOrder.isActive,
      })
      setShowForm(true)
    } else {
      setFormData({
        productId: 0,
        minStock: 10,
        orderQuantity: 50,
        isActive: true,
      })
    }
  }, [editingOrder])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const selectedProduct = products.find((p) => p.id === formData.productId)
    if (!selectedProduct) return

    const orderData = {
      ...formData,
      supplierId,
      productName: selectedProduct.name,
    }

    if (editingOrder) {
      updateAutoOrder(editingOrder.id, orderData)
      setEditingOrder(null)
    } else {
      addAutoOrder(orderData)
    }

    setShowForm(false)
    setFormData({
      productId: 0,
      minStock: 10,
      orderQuantity: 50,
      isActive: true,
    })
  }

  const handleEdit = (order: AutoOrder) => {
    setEditingOrder(order)
  }

  const handleDelete = (orderId: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este pedido automático?")) {
      deleteAutoOrder(orderId)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingOrder(null)
    setFormData({
      productId: 0,
      minStock: 10,
      orderQuantity: 50,
      isActive: true,
    })
  }

  const getProductStock = (productId: number) => {
    const product = products.find((p) => p.id === productId)
    return product?.stock || 0
  }

  const needsReorder = (order: AutoOrder) => {
    return getProductStock(order.productId) <= order.minStock
  }

  // Filtrar productos que no están ya configurados para este proveedor
  const availableProducts = products.filter(
    (product) =>
      !supplierOrders.some((order) => order.productId === product.id) || editingOrder?.productId === product.id,
  )

  if (!supplier) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pedidos Automáticos - {supplier.name}</DialogTitle>
          <DialogDescription>Configura pedidos automáticos basados en stock mínimo</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Botón para agregar nuevo pedido automático */}
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Pedido Automático
            </Button>
          )}

          {/* Formulario de pedido automático */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingOrder ? "Editar Pedido Automático" : "Nuevo Pedido Automático"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="productId">Producto *</Label>
                      <Select
                        value={formData.productId.toString()}
                        onValueChange={(value) => setFormData({ ...formData, productId: Number(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} (Stock: {product.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="minStock">Stock Mínimo *</Label>
                      <Input
                        id="minStock"
                        type="number"
                        value={formData.minStock}
                        onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="orderQuantity">Cantidad a Pedir *</Label>
                      <Input
                        id="orderQuantity"
                        type="number"
                        value={formData.orderQuantity}
                        onChange={(e) => setFormData({ ...formData, orderQuantity: Number(e.target.value) })}
                        min="1"
                        required
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <Label htmlFor="isActive">Pedido Activo</Label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                    <Button type="submit">{editingOrder ? "Actualizar" : "Crear"} Pedido</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Lista de pedidos automáticos */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Pedidos Automáticos ({supplierOrders.length})</h3>

            {supplierOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No hay pedidos automáticos configurados para este proveedor
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {supplierOrders.map((order) => {
                  const currentStock = getProductStock(order.productId)
                  const needsOrder = needsReorder(order)

                  return (
                    <Card
                      key={order.id}
                      className={`hover:shadow-md transition-shadow ${needsOrder ? "border-orange-200 bg-orange-50 dark:bg-orange-900/10" : ""}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {order.productName}
                              {needsOrder && order.isActive && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Necesita Pedido
                                </Badge>
                              )}
                              {!order.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  Inactivo
                                </Badge>
                              )}
                            </CardTitle>
                          </div>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(order)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(order.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Stock Actual</p>
                            <p className={`text-sm font-medium ${needsOrder ? "text-orange-600" : "text-green-600"}`}>
                              {currentStock} unidades
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Stock Mínimo</p>
                            <p className="text-sm font-medium">{order.minStock} unidades</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cantidad a Pedir</p>
                            <p className="text-sm font-medium">{order.orderQuantity} unidades</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Estado</p>
                            <div className="flex items-center space-x-1">
                              {order.isActive ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Package className="h-4 w-4 text-gray-400" />
                              )}
                              <p className="text-sm font-medium">{order.isActive ? "Activo" : "Inactivo"}</p>
                            </div>
                          </div>
                        </div>

                        {order.lastOrderDate && (
                          <div className="pt-2 border-t">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                Último pedido: {new Date(order.lastOrderDate).toLocaleDateString("es-PY")}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
