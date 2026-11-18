"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ShoppingCart, X, Receipt, ChefHat, Save, Printer, CreditCard, PanelRightClose } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCart } from "../context/cart-context"
import type { ServiceOrder, StaffMember } from "@/lib/service-order-types"
import type { DiningTable } from "@/lib/dining-types"
import { apiRequest } from "@/lib/api-client"
import { useAuth } from "../context/auth-context"

export interface OrderDetails {
  tableId: number | null
  tableLabel: string
  customerName: string
  customerPhone: string
  cardCode: string
  waiterId: number | null
}

const emptyDetails: OrderDetails = { tableId: null, tableLabel: "", customerName: "", customerPhone: "", cardCode: "", waiterId: null }
const roleLabel = { admin: "administrador", manager: "gerente", cashier: "cajero", waiter: "mesero" }

interface CartSidebarProps {
  onClose?: () => void
  activeOrder: ServiceOrder | null
  onSaveOrder: (details: Partial<OrderDetails>, send: boolean, print: boolean) => Promise<void>
  onClearActive: () => void
  orderSaving: boolean
  onToggleCollapse?: () => void
}

export default function CartSidebar({ onClose, activeOrder, onSaveOrder, onClearActive, orderSaving, onToggleCollapse }: CartSidebarProps) {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart()
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const canCharge = hasPermission("manage_sales")
  const [isClearing, setIsClearing] = useState(false)
  const [orderAction, setOrderAction] = useState<"draft" | "send" | "print" | null>(null)
  const [details, setDetails] = useState<OrderDetails>(emptyDetails)
  const [tables, setTables] = useState<DiningTable[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  useEffect(() => {
    if (!orderAction) return
    apiRequest<{ tables: DiningTable[] }>("/api/dining?compact=1").then((result) => setTables(result.tables.filter((table) => table.isActive))).catch(() => setTables([]))
    apiRequest<{ staff: StaffMember[] }>("/api/staff").then((result) => setStaff(result.staff)).catch(() => setStaff([]))
    // Un mesero que abre la cuenta queda asignado por defecto.
    if (user?.role === "waiter") setDetails((current) => current.waiterId ? current : { ...current, waiterId: Number(user.id) })
  }, [orderAction, user])

  const total = getCartTotal()
  const itemCount = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0

  const handleQuantityChange = (id: number | string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id)
    } else {
      updateQuantity(id, newQuantity)
    }
  }

  const handleClearCart = () => {
    setIsClearing(true)
    setTimeout(() => {
      clearCart()
      setIsClearing(false)
    }, 300)
  }

  const handleCheckout = () => {
    if (cart && cart.length > 0) {
      router.push("/checkout")
      onClose?.()
    }
  }

  const handleOrderAction = (action: "draft" | "send" | "print") => {
    if (activeOrder) {
      void onSaveOrder({}, action !== "draft", action === "print")
    } else {
      setOrderAction(action)
    }
  }

  const confirmNewOrder = async () => {
    if (!orderAction) return
    try {
      await onSaveOrder(details, orderAction !== "draft", orderAction === "print")
      setOrderAction(null)
      setDetails(emptyDetails)
    } catch { /* Keep the dialog open so the entered details are preserved. */ }
  }

  return (
    <div className="h-full flex flex-col bg-white/90 backdrop-blur-xl dark:bg-slate-900/90">
      {/* Header */}
      <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-4 dark:border-slate-800 dark:from-indigo-950/30 dark:via-slate-900 dark:to-violet-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onToggleCollapse && <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onToggleCollapse} aria-label="Minimizar carrito" title="Minimizar carrito">
              <PanelRightClose className="h-5 w-5" />
            </Button>}
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-lg font-black tracking-tight">Carrito</h2>
            {itemCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {itemCount}
              </Badge>
            )}
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {activeOrder && <div className="border-b bg-indigo-50 p-4 dark:bg-indigo-950/30">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Orden #{activeOrder.id} abierta</p>
            <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
              {[activeOrder.tableLabel, activeOrder.customerName, activeOrder.cardCode].filter(Boolean).join(" · ") || "Cuenta sin asignar"}
            </p>
            {activeOrder.waiterName && <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">Mesero: {activeOrder.waiterName}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClearActive} aria-label="Desvincular orden del POS"><X className="h-4 w-4" /></Button>
        </div>
        <p className="mt-2 text-xs font-semibold text-indigo-900 dark:text-indigo-100">Cuenta acumulada: Gs {activeOrder.total.toLocaleString("es-PY")}</p>
      </div>}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {!cart || cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Tu carrito está vacío</p>
            <p className="text-sm text-muted-foreground mt-2">{activeOrder ? "Agregá más productos a esta orden o cobrá la cuenta." : "Agrega productos para comenzar"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <Card key={item.cartKey} className="overflow-hidden rounded-2xl border-indigo-100 shadow-sm shadow-indigo-100/40 dark:border-slate-800">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm leading-tight mb-1">{item.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">Gs {item.price.toLocaleString("es-PY")} c/u</p>
                      {item.selectedModifiers?.length > 0 && <p className="mb-2 text-xs text-muted-foreground">{item.selectedModifiers.map((modifier) => modifier.name).join(", ")}</p>}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 bg-transparent"
                            onClick={() => handleQuantityChange(item.cartKey, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 bg-transparent"
                            onClick={() => handleQuantityChange(item.cartKey, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.cartKey)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="text-right mt-2">
                        <span className="font-semibold text-sm">
                          Gs {(item.price * item.quantity).toLocaleString("es-PY")}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {(cart.length > 0 || activeOrder) && (
        <div className="space-y-4 border-t border-indigo-100 bg-gradient-to-b from-white to-indigo-50/70 p-4 dark:border-slate-800 dark:from-slate-900 dark:to-indigo-950/30">
          {cart.length > 0 && <div className="flex justify-between items-center text-lg font-bold">
            <span>{activeOrder ? "Nuevo en carrito:" : "Total:"}</span>
            <span>Gs {total.toLocaleString("es-PY")}</span>
          </div>}

          <div className="space-y-2">
            {canCharge && !activeOrder && cart.length > 0 && <Button onClick={handleCheckout} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700" size="lg">
              <Receipt className="h-4 w-4 mr-2" /> Cobrar ahora
            </Button>}
            {cart.length > 0 && <Button variant="outline" onClick={() => handleOrderAction("draft")} disabled={orderSaving} className="w-full">
              <Save className="mr-2 h-4 w-4" /> {activeOrder ? "Guardar en esta orden" : "Guardar orden abierta"}
            </Button>}
            {(cart.length > 0 || activeOrder?.items.some((line) => line.ticketId == null)) && <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => handleOrderAction("send")} disabled={orderSaving} className="min-w-0 bg-amber-600 text-white hover:bg-amber-700">
                <ChefHat className="mr-1 h-4 w-4 shrink-0" /> Cocina
              </Button>
              <Button onClick={() => handleOrderAction("print")} disabled={orderSaving} variant="outline" className="min-w-0">
                <Printer className="mr-1 h-4 w-4 shrink-0" /> Enviar e imprimir
              </Button>
            </div>}
            {canCharge && activeOrder && cart.length === 0 && activeOrder.items.length > 0 && <Button onClick={() => { router.push(`/checkout?order=${activeOrder.id}`); onClose?.() }} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <CreditCard className="mr-2 h-4 w-4" /> Cobrar cuenta completa
            </Button>}
            {cart.length > 0 && <Button variant="ghost" onClick={handleClearCart} disabled={isClearing} className="w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              {isClearing ? "Limpiando..." : "Limpiar Carrito"}
            </Button>}
          </div>
        </div>
      )}
      <Dialog open={Boolean(orderAction)} onOpenChange={(open) => { if (!open) setOrderAction(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{orderAction === "draft" ? "Abrir cuenta" : "Enviar pedido a cocina"}</DialogTitle>
            <DialogDescription>Identificá la orden por mesa, cliente o tarjeta QR. Podés completar los datos más tarde.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium">Mesa<select value={details.tableId ?? ""} onChange={(event) => setDetails((current) => ({ ...current, tableId: event.target.value ? Number(event.target.value) : null, tableLabel: "" }))} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="">Sin mesa asignada</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.roomName} · {table.label} ({table.seats} sillas){table.openOrderId ? ` · cuenta #${table.openOrderId}` : ""}</option>)}</select></label>
            <label className="block text-sm font-medium">Mesero<select value={details.waiterId ?? ""} onChange={(event) => setDetails((current) => ({ ...current, waiterId: event.target.value ? Number(event.target.value) : null }))} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="">Sin mesero asignado</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}{member.role !== "waiter" ? ` (${roleLabel[member.role]})` : ""}</option>)}</select></label>
            <label className="block text-sm font-medium">Referencia adicional<Input value={details.tableLabel} onChange={(event) => setDetails((current) => ({ ...current, tableLabel: event.target.value }))} placeholder="Opcional si no elegiste mesa" disabled={Boolean(details.tableId)} className="mt-1" /></label>
            <label className="block text-sm font-medium">Cliente<Input value={details.customerName} onChange={(event) => setDetails((current) => ({ ...current, customerName: event.target.value }))} placeholder="Nombre del cliente" className="mt-1" /></label>
            <label className="block text-sm font-medium">Teléfono<Input value={details.customerPhone} onChange={(event) => setDetails((current) => ({ ...current, customerPhone: event.target.value }))} placeholder="Para delivery o contacto" className="mt-1" /></label>
            <label className="block text-sm font-medium">Código de tarjeta QR<Input value={details.cardCode} onChange={(event) => setDetails((current) => ({ ...current, cardCode: event.target.value }))} placeholder="CNID-CARD-…" className="mt-1" /></label>
            <Button className="w-full" onClick={confirmNewOrder} disabled={orderSaving}>{orderSaving ? "Guardando…" : orderAction === "draft" ? "Guardar cuenta" : "Confirmar envío"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
