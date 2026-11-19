"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, Camera, ShoppingCart, PanelRightOpen, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useCart, type Product, type SelectedModifier } from "../context/cart-context"
import { useAuth } from "../context/auth-context"
import CategorySidebar from "../components/category-sidebar"
import ProductGrid from "../components/product-grid"
import CartSidebar, { type OrderDetails } from "../components/cart-sidebar"
import { effectivePrice } from "@/lib/product-price"
import { CodeCamera } from "../components/code-camera"
import { parseScannedCode } from "@/lib/scan-code"
import toast from "react-hot-toast"
import { useWorkspace, WorkspaceSlot } from "../components/workspace-shell"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ProtectedRoute from "../components/protected-route"
import { apiRequest } from "@/lib/api-client"
import type { KitchenTicket, ServiceOrder } from "@/lib/service-order-types"
import type { DiningTable } from "@/lib/dining-types"
import TablePicker, { type PickedTable } from "../components/table-picker"
import { useLiveTables } from "@/lib/use-live"

const cardPattern = /^CNID-CARD-[A-F0-9]{24}$/
const cardCodeFromScan = (value: string) => parseScannedCode(value).code.toUpperCase().match(/CNID-CARD-[A-F0-9]{24}/)?.[0] ?? ""
const tablePattern = /^CNID-TABLE-[A-F0-9]{24}$/
const tableCodeFromScan = (value: string) => parseScannedCode(value).code.toUpperCase().match(/CNID-TABLE-[A-F0-9]{24}/)?.[0] ?? ""
const guarani = (value: number) => `Gs ${value.toLocaleString("es-PY")}`

export default function POSPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedMenu, setSelectedMenu] = useState("all")
  const [selectedFilter, setSelectedFilter] = useState("")
  const [showCart, setShowCart] = useState(false)
  const [cartCollapsed, setCartCollapsed] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [configuring, setConfiguring] = useState<{ product: Product; quantity: number } | null>(null)
  const [modifierSearch, setModifierSearch] = useState("")
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({})
  const [activeOrder, setActiveOrder] = useState<ServiceOrder | null>(null)
  const [orderSaving, setOrderSaving] = useState(false)
  // Mesa elegida para el carrito antes de guardar (sin orden abierta en el POS).
  const [pendingTable, setPendingTable] = useState<PickedTable | null>(null)
  const [tablesOpen, setTablesOpen] = useState(false)
  const { cart, products, addToCart, clearCart, refreshProducts, getCartTotal, orderType, setOrderType } = useCart()
  const searchRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const workspace = useWorkspace()

  const totalItems = cart?.reduce((sum, item) => sum + item.quantity, 0) || 0

  useEffect(() => { searchRef.current?.focus() }, [])
  useEffect(() => {
    try {
      setCartCollapsed(window.localStorage.getItem("pos:cart-collapsed") === "1")
    } catch { /* Los paneles siguen funcionando aunque el navegador no guarde preferencias. */ }
  }, [])
  const toggleCartCollapse = () => {
    const next = !cartCollapsed
    setCartCollapsed(next)
    try { window.localStorage.setItem("pos:cart-collapsed", next ? "1" : "0") } catch { /* Preferencia opcional. */ }
  }

  const availableProducts = useMemo(() => products.filter((product) => product.isActive !== false), [products])
  const menus = useMemo(() => [...new Set(availableProducts.map((product) => product.menuName).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, "es")), [availableProducts])
  const activeOrderKey = user ? `pos:activeOrder:${user.id}` : ""

  useEffect(() => {
    if (!activeOrderKey) return
    const search = new URLSearchParams(window.location.search)
    if (search.has("table")) return
    const requested = search.get("order")
    const id = requested ?? sessionStorage.getItem(activeOrderKey)
    if (!id || !/^\d+$/.test(id)) return
    apiRequest<{ order: ServiceOrder }>(`/api/service-orders/${id}`).then(({ order }) => {
      if (order.status !== "open") { sessionStorage.removeItem(activeOrderKey); return }
      setActiveOrder(order)
      setOrderType(order.orderType)
      sessionStorage.setItem(activeOrderKey, String(order.id))
    }).catch(() => sessionStorage.removeItem(activeOrderKey))
  }, [activeOrderKey, setOrderType])

  const rememberOrder = (order: ServiceOrder) => {
    setActiveOrder(order)
    setOrderType(order.orderType)
    if (activeOrderKey) sessionStorage.setItem(activeOrderKey, String(order.id))
  }
  const clearActiveOrder = () => {
    if (cart.length) { toast.error("Guardá o vaciá el carrito antes de cambiar de orden."); return }
    setActiveOrder(null)
    if (activeOrderKey) sessionStorage.removeItem(activeOrderKey)
    if (window.location.search) window.history.replaceState(null, "", "/pos")
  }
  // La cuenta abierta se mantiene al día si cocina, caja u otro mesero la cambian.
  useLiveTables(activeOrder ? ["service_orders", "kitchen_tickets"] : ["__none__"], () => {
    if (!activeOrder) return
    apiRequest<{ order: ServiceOrder }>(`/api/service-orders/${activeOrder.id}`).then(({ order }) => {
      if (order.status === "open") { setActiveOrder(order); return }
      setActiveOrder(null)
      if (activeOrderKey) sessionStorage.removeItem(activeOrderKey)
      toast(`La orden #${order.id} se cerró${order.status === "paid" ? " (cobrada)" : ""}.`)
    }).catch(() => undefined)
  }, 30000)
  const tableHint = activeOrder
    ? cart.length ? `Elegí una mesa libre para pasar la orden #${activeOrder.id} (lo del carrito se suma al guardar).`
      : activeOrder.tableId ? `Tocá una mesa ocupada para ver su cuenta y cobrar, o una libre para mover la orden #${activeOrder.id}.`
      : `Elegí la mesa de la orden #${activeOrder.id}, o tocá una ocupada para ver su cuenta.`
    : cart.length ? "Elegí la mesa de este pedido. Si ya tiene cuenta, se suma a lo que consumió."
    : "Tocá una mesa ocupada para ver lo que consumió y cobrar, o una libre para empezar su pedido."
  const pickTable = async (table: DiningTable, listed: ServiceOrder | null) => {
    const name = `${table.roomName} · ${table.label}`
    const openId = listed?.id ?? table.openOrderId
    try {
      if (activeOrder?.tableId === table.id || (!activeOrder && pendingTable?.id === table.id)) { setTablesOpen(false); return }
      if (activeOrder && openId && openId !== activeOrder.id && cart.length) {
        toast.error("Esa mesa tiene otra cuenta. Guardá o vaciá el carrito antes de cambiar.")
        return
      }
      if (openId && openId !== activeOrder?.id && !cart.length) {
        // Mesa ocupada: abrir su cuenta para ver el consumo, agregar o cobrar.
        const { order } = await apiRequest<{ order: ServiceOrder }>(`/api/service-orders/${openId}`)
        setPendingTable(null)
        rememberOrder(order)
        toast.success(`${name} · cuenta #${order.id}`)
      } else if (activeOrder) {
        // Orden abierta sin mesa (o en otra): pasarla a esta mesa libre.
        const { order } = await apiRequest<{ order: ServiceOrder }>(`/api/service-orders/${activeOrder.id}`, {
          method: "PATCH", body: JSON.stringify({ action: "details", tableId: table.id }) })
        rememberOrder(order)
        toast.success(`Orden #${order.id} en ${name}`)
      } else {
        // Carrito nuevo: queda apuntado a la mesa; se guarda con «Guardar», «Cocina» o «Enviar e imprimir».
        setPendingTable({ id: table.id, label: name, orderId: openId ?? null, orderTotal: listed?.total ?? 0 })
        if (orderType !== "dineIn") setOrderType("dineIn")
        if (!cart.length) toast.success(`${name}: agregá los productos y enviá`)
      }
      setTablesOpen(false)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo usar esa mesa") }
  }
  const saveOrder = async (details: Partial<OrderDetails>, send: boolean, print: boolean) => {
    if (orderSaving) return
    const printWindow = print ? window.open("", "_blank") : null
    // Pedido apuntado a una mesa: se guarda en su cuenta y el POS queda libre para el siguiente cliente.
    const toTable = !activeOrder && pendingTable ? pendingTable : null
    setOrderSaving(true)
    try {
      const { order, ticket } = await apiRequest<{ order: ServiceOrder; ticket: KitchenTicket | null }>("/api/service-orders", {
        method: "POST",
        body: JSON.stringify({ orderId: activeOrder?.id, orderType: toTable ? "dineIn" : orderType, ...details, ...(toTable ? { tableId: toTable.id } : {}),
          items: cart.map((item) => ({ id: item.id, quantity: item.quantity, selectedModifiers: item.selectedModifiers })),
          sendToKitchen: send }),
      })
      if (toTable) {
        setPendingTable(null)
        setActiveOrder(null)
        if (activeOrderKey) sessionStorage.removeItem(activeOrderKey)
      } else rememberOrder(order)
      clearCart()
      if (send) void refreshProducts()
      if (printWindow) {
        if (ticket) printWindow.location.href = `/kitchen/print/${ticket.id}?auto=1`
        else printWindow.close()
      }
      toast.success(toTable ? `${toTable.label} · orden #${order.id} ${ticket ? "enviada a cocina" : "guardada"}. Cuenta: ${guarani(order.total)}`
        : ticket ? `Orden #${order.id} enviada a cocina` : `Orden #${order.id} guardada`)
    } catch (error) {
      printWindow?.close()
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la orden")
      throw error
    } finally { setOrderSaving(false) }
  }
  const openCard = async (code: string) => {
    try {
      const result = await apiRequest<{ card: { code: string; label: string }; order: ServiceOrder | null }>(`/api/service-orders?card=${encodeURIComponent(code)}`)
      if (result.order && activeOrder?.id !== result.order.id && cart.length) {
        toast.error("Guardá o vaciá el carrito antes de cambiar de tarjeta.")
        return
      }
      if (!result.order && activeOrder?.cardCode && activeOrder.cardCode !== code) {
        toast.error("La orden actual ya tiene otra tarjeta. Cerrá la orden antes de cambiar.")
        return
      }
      const order = result.order ?? (await apiRequest<{ order: ServiceOrder }>("/api/service-orders", {
        method: "POST", body: JSON.stringify({ orderId: activeOrder?.id, cardCode: code, orderType, items: [] }),
      })).order
      rememberOrder(order)
      setSearchTerm("")
      toast.success(`Tarjeta ${result.card.label || code} · orden #${order.id}`)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo leer la tarjeta") }
    finally { requestAnimationFrame(() => searchRef.current?.focus()) }
  }
  const openTable = async (code: string) => {
    try {
      const result = await apiRequest<{ table: { id: number; label: string; roomName: string }; order: ServiceOrder | null }>(`/api/service-orders?table=${encodeURIComponent(code)}`)
      if (result.order && activeOrder?.id !== result.order.id && cart.length && activeOrder) {
        toast.error("Guardá o vaciá el carrito antes de cambiar de mesa.")
        return
      }
      if (!result.order && activeOrder?.tableId && activeOrder.tableId !== result.table.id) {
        toast.error("La orden actual ya tiene otra mesa.")
        return
      }
      const order = result.order ?? (await apiRequest<{ order: ServiceOrder }>("/api/service-orders", {
        method: "POST", body: JSON.stringify({ orderId: activeOrder?.id, tableId: result.table.id, orderType: "dineIn", items: [] }),
      })).order
      setPendingTable(null)
      rememberOrder(order)
      setSearchTerm("")
      toast.success(`${result.table.roomName} · ${result.table.label} · orden #${order.id}`)
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo leer la mesa") }
    finally { requestAnimationFrame(() => searchRef.current?.focus()) }
  }
  useEffect(() => {
    if (!user) return
    const code = new URLSearchParams(window.location.search).get("table")?.toUpperCase() ?? ""
    if (tablePattern.test(code)) void openTable(code)
  // El código de la URL se procesa al abrir el POS.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
  const normalizeModifier = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
  const modifierQuery = normalizeModifier(modifierSearch.trim())
  const visibleModifierGroups = configuring?.product.modifierGroups?.map((group) => {
    const chosen = selectedOptions[group.legacyId] ?? []
    const groupMatches = modifierQuery !== "" && normalizeModifier(group.name).includes(modifierQuery)
    const visibleOptions = group.options.filter((option) =>
      !modifierQuery || groupMatches || normalizeModifier(option.name).includes(modifierQuery) || chosen.includes(option.legacyId))
    const showNoAddition = !group.required && !group.multiple &&
      (!modifierQuery || normalizeModifier("Sin agregado").includes(modifierQuery))
    return { ...group, visibleOptions, showNoAddition }
  }).filter((group) => group.visibleOptions.length > 0 || group.showNoAddition) ?? []
  const configuredBasePrice = configuring
    ? effectivePrice(configuring.product, orderType)
    : 0
  const configuredExtrasPrice = configuring?.product.modifierGroups?.reduce((total, group) =>
    total + group.options.reduce((sum, option) =>
      sum + ((selectedOptions[group.legacyId] ?? []).includes(option.legacyId) ? option.price : 0), 0), 0) ?? 0
  const configuredTotal = (configuredBasePrice + configuredExtrasPrice) * (configuring?.quantity ?? 1)
  const exactProduct = (value: string) => {
    const code = parseScannedCode(value).code.toLocaleLowerCase()
    return availableProducts.find((product) => product.barcode.toLocaleLowerCase() === code || String(product.id) === code)
  }
  const chooseProduct = (product: Product, quantity = 1) => {
    if (product.modifierGroups?.length) {
      setSelectedOptions({})
      setModifierSearch("")
      setConfiguring({ product, quantity })
      return
    }
    addToCart(product, quantity)
    toast.success(`${product.name} agregado al carrito`)
  }
  const confirmConfiguredProduct = () => {
    if (!configuring) return
    const modifiers: SelectedModifier[] = []
    for (const group of configuring.product.modifierGroups ?? []) {
      const chosen = selectedOptions[group.legacyId] ?? []
      if (group.required && chosen.length === 0) {
        toast.error(`Elegí una opción en ${group.name}.`)
        return
      }
      for (const optionId of chosen) {
        const option = group.options.find((entry) => entry.legacyId === optionId)
        if (option) modifiers.push({ groupId: group.legacyId, optionId, name: option.name, price: option.price })
      }
    }
    addToCart(configuring.product, configuring.quantity, modifiers)
    toast.success(`${configuring.product.name} agregado al carrito`)
    setConfiguring(null)
    setModifierSearch("")
    requestAnimationFrame(() => searchRef.current?.focus())
  }
  const addProductFromSearch = (value: string) => {
    const query = value.trim()
    if (!query) return
    const cardCode = cardCodeFromScan(query)
    if (cardPattern.test(cardCode)) { void openCard(cardCode); return }
    const tableCode = tableCodeFromScan(query)
    if (tablePattern.test(tableCode)) { void openTable(tableCode); return }
    const normalized = query.toLocaleLowerCase()
    const matches = availableProducts.filter((product) => product.name.toLocaleLowerCase().includes(normalized))
    const product = exactProduct(query) ?? availableProducts.find((item) => item.name.toLocaleLowerCase() === normalized) ?? (matches.length === 1 ? matches[0] : undefined)
    if (!product) {
      toast.error(matches.length > 1 ? "Elegí un producto de la lista." : "No se encontró ese producto.")
      return
    }
    const inCart = cart.find((item) => item.id === product.id)?.quantity ?? 0
    if (product.trackStock !== false && product.stock <= inCart) {
      toast.error("No hay más unidades disponibles de este producto.")
      return
    }
    chooseProduct(product)
    setSearchTerm("")
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  useEffect(() => {
    if (!searchTerm.trim() || (!exactProduct(searchTerm) && !cardPattern.test(cardCodeFromScan(searchTerm)) && !tablePattern.test(tableCodeFromScan(searchTerm)))) return
    const timer = window.setTimeout(() => addProductFromSearch(searchTerm), 150)
    return () => window.clearTimeout(timer)
  }, [searchTerm, availableProducts])

  const categoryList = (mobile: boolean) => <CategorySidebar
    selectedCategory={selectedCategory}
    onCategoryChange={(category) => { setSelectedCategory(category); if (mobile) workspace?.closeMobile() }}
    selectedFilter={selectedFilter}
    onFilterChange={(filter) => { setSelectedFilter(filter); if (mobile) workspace?.closeMobile() }}
    collapsed={!mobile && Boolean(workspace?.collapsed)}
  />

  return (
    <ProtectedRoute requiredPermissions={["access_pos"]}>
      {/* El buscador va en el encabezado del marco y las categorías debajo de «Opciones». */}
      <WorkspaceSlot name="header">
        <div className="relative w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchRef}
              autoFocus
              autoComplete="off"
              aria-label="Buscar o escanear producto"
              placeholder="Producto, código, mesa o tarjeta QR…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addProductFromSearch(e.currentTarget.value) }
                if (e.key === "Tab" && (exactProduct(e.currentTarget.value) || cardPattern.test(cardCodeFromScan(e.currentTarget.value)) || tablePattern.test(tableCodeFromScan(e.currentTarget.value)))) { e.preventDefault(); addProductFromSearch(e.currentTarget.value) }
                if (e.key === "Escape") setSearchTerm("")
              }}
              className="h-11 rounded-2xl border-indigo-100 bg-white pl-10 pr-12 shadow-sm shadow-indigo-100/60 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
            />
            <button type="button" onClick={() => setShowScanner(true)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Usar cámara para escanear" title="Usar cámara"><Camera className="h-5 w-5" /></button>
          </div>
          {searchTerm && <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-card p-1 shadow-xl">
            {availableProducts.filter((product) => product.name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()) || product.barcode.includes(searchTerm)).slice(0, 8).map((product) => (
              <button type="button" key={product.id} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => addProductFromSearch(product.barcode)}>
                <span>{product.name}<span className="ml-2 text-xs text-muted-foreground">{product.barcode}</span></span><span className="text-xs text-muted-foreground">{product.trackStock === false ? "Disponible" : `${product.stock} disp.`}</span>
              </button>
            ))}
          </div>}
        </div>
      </WorkspaceSlot>
      <WorkspaceSlot name="headerEnd">
              <Button
                variant="outline"
                size="sm"
                className="relative md:hidden bg-transparent"
                onClick={() => setShowCart(true)}
                aria-label="Abrir carrito"
              >
                <ShoppingCart className="h-4 w-4" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {totalItems}
                  </Badge>
                )}
              </Button>
      </WorkspaceSlot>
      <WorkspaceSlot name="sidebar">{categoryList(false)}</WorkspaceSlot>
      <WorkspaceSlot name="mobile">{categoryList(true)}</WorkspaceSlot>

        <div className="flex h-full min-h-0">
          {/* Main Content */}
          <div className="min-w-0 flex-1 overflow-y-auto bg-gradient-to-br from-indigo-50/60 via-slate-50/70 to-cyan-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
            <div className="flex flex-wrap gap-3 px-3 pt-3 sm:px-6 sm:pt-5">
              <div><label htmlFor="pos-order-type" className="mb-1 block text-xs font-medium text-muted-foreground">Tipo de pedido</label>
                <select id="pos-order-type" value={orderType} disabled={Boolean(activeOrder)} onChange={(event) => { setOrderType(event.target.value as typeof orderType); if (event.target.value !== "dineIn") setPendingTable(null) }}
                  className="h-10 min-w-40 rounded-xl border bg-background px-3 text-sm shadow-sm">
                  <option value="dineIn">En el local</option><option value="delivery">Delivery</option><option value="pickup">Retiro</option>
                </select></div>
              {menus.length > 0 && <div><label htmlFor="pos-menu" className="mb-1 block text-xs font-medium text-muted-foreground">Menú</label>
              <select id="pos-menu" value={selectedMenu} onChange={(event) => setSelectedMenu(event.target.value)}
                className="h-10 w-full max-w-sm rounded-xl border bg-background px-3 text-sm shadow-sm">
                <option value="all">Todos los menús</option>
                {menus.map((menu) => <option key={menu} value={menu}>{menu}</option>)}
              </select>
              </div>}
            </div>
            <ProductGrid searchTerm={searchTerm} selectedCategory={selectedCategory} selectedMenu={selectedMenu} selectedFilter={selectedFilter} onAddProduct={chooseProduct} />
          </div>

          {/* Cart Sidebar - Desktop */}
          <div className={`hidden shrink-0 border-l bg-card/30 transition-[width] duration-200 lg:block ${cartCollapsed ? "w-[68px]" : "w-[22rem] xl:w-[26rem] 2xl:w-[30rem]"}`}>
            {cartCollapsed ? <div className="flex h-full flex-col items-center gap-3 bg-background px-2 py-3">
              <Button variant="ghost" size="icon" onClick={toggleCartCollapse} aria-label="Expandir carrito" title="Expandir carrito">
                <PanelRightOpen className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" className="relative h-11 w-11 rounded-xl" onClick={toggleCartCollapse}
                aria-label={`Abrir carrito: ${totalItems} productos, Gs ${getCartTotal().toLocaleString("es-PY")}`}
                title={`Carrito · Gs ${getCartTotal().toLocaleString("es-PY")}`}>
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center p-0 text-[10px]">{totalItems}</Badge>}
              </Button>
              <span className="text-[10px] font-semibold text-muted-foreground">Carrito</span>
              {!activeOrder && pendingTable && <span className="max-w-full truncate rounded-full bg-emerald-100 px-1.5 py-1 text-[10px] font-bold text-emerald-800" title={pendingTable.label}>{pendingTable.label.split(" · ").pop()}</span>}
              {activeOrder && <span className="max-w-full truncate rounded-full bg-indigo-100 px-1.5 py-1 text-[10px] font-bold text-indigo-700" title={`Orden #${activeOrder.id} abierta`}>#{activeOrder.id}</span>}
            </div> : <CartSidebar activeOrder={activeOrder} onSaveOrder={saveOrder} onClearActive={clearActiveOrder} orderSaving={orderSaving} onToggleCollapse={toggleCartCollapse}
              pendingTable={pendingTable} onOpenTables={() => setTablesOpen(true)} onClearPendingTable={() => setPendingTable(null)} />}
          </div>

          {/* Cart Sidebar - Mobile Overlay */}
          {showCart && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
              <div className="absolute right-0 top-0 h-full w-[26rem] max-w-full border-l bg-background">
                <CartSidebar onClose={() => setShowCart(false)} activeOrder={activeOrder} onSaveOrder={saveOrder} onClearActive={clearActiveOrder} orderSaving={orderSaving}
                  pendingTable={pendingTable} onOpenTables={() => setTablesOpen(true)} onClearPendingTable={() => setPendingTable(null)} />
              </div>
            </div>
          )}
        </div>

        <TablePicker open={tablesOpen} onClose={() => setTablesOpen(false)} hint={tableHint} onPick={(table, order) => void pickTable(table, order)}
          currentTableId={activeOrder?.tableId ?? pendingTable?.id ?? null} />
        <Dialog open={Boolean(configuring)} onOpenChange={(open) => { if (!open) { setConfiguring(null); setModifierSearch("") } }}>
          <DialogContent className="flex max-h-[85dvh] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-5 pr-12 text-left">
              <DialogTitle>{configuring?.product.name}</DialogTitle>
              <DialogDescription>Elegí los agregados para esta venta. Precio del producto: <strong className="text-foreground">{guarani(configuredBasePrice)}</strong>.</DialogDescription>
            </DialogHeader>
            <div className="shrink-0 border-b px-5 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  autoFocus
                  aria-label="Buscar agregados"
                  placeholder="Buscar agregado, por ejemplo arroz o puré…"
                  value={modifierSearch}
                  onChange={(event) => setModifierSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && modifierSearch) {
                      event.stopPropagation()
                      setModifierSearch("")
                    }
                  }}
                  className="h-11 rounded-xl pl-10 pr-10"
                />
                {modifierSearch && <button type="button" onClick={() => setModifierSearch("")} aria-label="Limpiar búsqueda de agregados"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>}
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
              {visibleModifierGroups.map((group) => <fieldset key={group.legacyId} className="space-y-2 rounded-xl border p-3">
                <legend className="px-1 text-sm font-semibold">{group.name}{group.required ? " *" : ""}</legend>
                {group.showNoAddition && <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted">
                  <input type="radio" name={`modifier-${group.legacyId}`}
                    checked={(selectedOptions[group.legacyId] ?? []).length === 0}
                    onChange={() => setSelectedOptions((current) => ({ ...current, [group.legacyId]: [] }))} />
                  <span className="text-sm">Sin agregado</span>
                  <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{guarani(0)}</span>
                </label>}
                {group.visibleOptions.map((option) => {
                  const checked = (selectedOptions[group.legacyId] ?? []).includes(option.legacyId)
                  return <label key={option.legacyId} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted">
                    <input type={group.multiple ? "checkbox" : "radio"} name={`modifier-${group.legacyId}`}
                      checked={checked} onChange={() => setSelectedOptions((current) => {
                        const chosen = current[group.legacyId] ?? []
                        return { ...current, [group.legacyId]: group.multiple
                          ? checked ? chosen.filter((id) => id !== option.legacyId) : [...chosen, option.legacyId]
                          : [option.legacyId] }
                      })} />
                    <span className="flex-1 text-sm">{option.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold tabular-nums ${option.price > 0 ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"}`}>
                      {option.price > 0 ? `+ ${guarani(option.price)}` : `${guarani(0)} · incluido`}
                    </span>
                  </label>
                })}
              </fieldset>)}
              {modifierQuery && visibleModifierGroups.length === 0 &&
                <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground" role="status">
                  No encontramos agregados para “{modifierSearch.trim()}”. Probá con otro nombre.
                </div>}
            </div>
            <div className="shrink-0 border-t bg-background px-5 py-4">
              <div className="mb-3 space-y-1 text-sm">
                <div className="flex items-center justify-between text-muted-foreground"><span>Producto por unidad</span><span>{guarani(configuredBasePrice)}</span></div>
                <div className="flex items-center justify-between text-muted-foreground"><span>Agregados por unidad</span><span>{guarani(configuredExtrasPrice)}</span></div>
                <div className="flex items-center justify-between border-t pt-2 font-bold"><span>Total{configuring && configuring.quantity > 1 ? ` · ${configuring.quantity} unidades` : ""}</span><span>{guarani(configuredTotal)}</span></div>
              </div>
              <Button className="h-11 w-full" onClick={confirmConfiguredProduct}>Agregar al carrito · {guarani(configuredTotal)}</Button>
            </div>
          </DialogContent>
        </Dialog>
        <CodeCamera open={showScanner} onClose={() => { setShowScanner(false); requestAnimationFrame(() => searchRef.current?.focus()) }} onResult={addProductFromSearch} />
    </ProtectedRoute>
  )
}
