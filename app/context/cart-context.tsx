"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import type { Product } from "../data/products"
export type { Product } from "../data/products"
import { useAuth } from "./auth-context"
import { apiRequest } from "@/lib/api-client"
import { effectivePrice } from "@/lib/product-price"

export interface SelectedModifier {
  groupId: number
  optionId: number
  name: string
  price: number
}

interface CartItem extends Product {
  quantity: number
  cartKey: string
  selectedModifiers: SelectedModifier[]
}

export type OrderType = "dineIn" | "delivery" | "pickup"
const salePrice = (product: Product, orderType: OrderType) => effectivePrice(product, orderType)
const configuredPrice = (product: Product, orderType: OrderType, modifiers: SelectedModifier[]) =>
  salePrice(product, orderType) + modifiers.reduce((sum, modifier) => sum + modifier.price, 0)
const makeCartKey = (id: number, modifiers: SelectedModifier[]) =>
  `${id}:${modifiers.map((modifier) => `${modifier.groupId}-${modifier.optionId}`).sort().join(',')}`

type ProductInput = Omit<Product, "id" | "isActive"> & { isActive?: boolean }

function reconcileCart(items: CartItem[], products: Product[], orderType: OrderType): CartItem[] {
  const byId = new Map(products.map((product) => [product.id, product]))
  return items.flatMap((item) => {
    if (!item || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) return []
    const product = byId.get(item.id)
    if (!product || product.isActive === false || (product.trackStock !== false && product.stock <= 0)) return []
    const selectedModifiers = Array.isArray(item.selectedModifiers) ? item.selectedModifiers : []
    return [{ ...product, selectedModifiers, cartKey: makeCartKey(product.id, selectedModifiers),
      price: configuredPrice(product, orderType, selectedModifiers),
      quantity: product.trackStock === false ? item.quantity : Math.min(item.quantity, product.stock) }]
  })
}

interface CartContextType {
  cart: CartItem[]
  products: Product[]
  orderType: OrderType
  setOrderType: (value: OrderType) => void
  addToCart: (product: Product, quantity?: number, modifiers?: SelectedModifier[]) => void
  removeFromCart: (productId: number | string) => void
  updateQuantity: (productId: number | string, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartItemCount: () => number
  addProduct: (product: ProductInput) => Promise<Product>
  updateProduct: (product: Product) => Promise<void>
  deleteProduct: (productId: number) => Promise<void>
  addPurchase: (purchase: Record<string, unknown>) => Promise<void>
  refreshProducts: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderType, setOrderType] = useState<OrderType>("dineIn")
  const [cartLoadedFor, setCartLoadedFor] = useState<string | null>(null)
  const [productsLoadedFor, setProductsLoadedFor] = useState<string | null>(null)
  const currentUserId = useRef<string | null>(null)
  currentUserId.current = user?.id ?? null

  useEffect(() => {
    if (loading) return
    if (!user) {
      setCart([])
      setCartLoadedFor(null)
      setProducts([])
      setProductsLoadedFor(null)
      return
    }
    try {
      const saved = localStorage.getItem(`cart:${user.id}`)
      const parsed = saved ? JSON.parse(saved) : []
      setCart(Array.isArray(parsed) ? parsed : [])
    } catch {
      setCart([])
    }
    setCartLoadedFor(user.id)
    setProductsLoadedFor(null)
  }, [loading, user?.id])

  useEffect(() => {
    if (user && cartLoadedFor === user.id) localStorage.setItem(`cart:${user.id}`, JSON.stringify(cart))
  }, [cart, cartLoadedFor, user?.id])

  const refreshProducts = useCallback(async () => {
    if (!user) { setProducts([]); setProductsLoadedFor(null); return }
    const result = await apiRequest<{ items: Product[] }>("/api/data/products")
    if (currentUserId.current !== user.id) return
    setProducts(result.items)
    setProductsLoadedFor(user.id)
  }, [user])

  useEffect(() => {
    refreshProducts().catch((error) => console.error("No se pudieron cargar los productos", error))
    const onChange = () => { refreshProducts().catch(console.error) }
    window.addEventListener("products:changed", onChange)
    return () => window.removeEventListener("products:changed", onChange)
  }, [refreshProducts])

  useEffect(() => {
    if (!user || cartLoadedFor !== user.id || productsLoadedFor !== user.id) return
    setCart((current) => reconcileCart(current, products, orderType))
  }, [products, productsLoadedFor, cartLoadedFor, user?.id, orderType])

  const visibleCart = user && cartLoadedFor === user.id && productsLoadedFor === user.id
    ? reconcileCart(cart, products, orderType) : []
  const visibleProducts = user && productsLoadedFor === user.id ? products : []

  const addToCart = (product: Product, quantity = 1, modifiers: SelectedModifier[] = []) => {
    if ((product.trackStock !== false && product.stock <= 0) || product.isActive === false) return
    if (!Number.isSafeInteger(quantity) || quantity <= 0) return
    const cartKey = makeCartKey(product.id, modifiers)
    setCart((current) => {
      const existing = current.find((item) => item.cartKey === cartKey)
      if (existing) {
        return current.map((item) => item.cartKey === cartKey
          ? { ...item, quantity: product.trackStock === false ? item.quantity + quantity : Math.min(item.quantity + quantity, product.stock) }
          : item)
      }
      return [...current, { ...product, selectedModifiers: modifiers, cartKey,
        price: configuredPrice(product, orderType, modifiers),
        quantity: product.trackStock === false ? quantity : Math.min(quantity, product.stock) }]
    })
  }

  const matchesCartItem = (item: CartItem, key: number | string) => typeof key === 'number' ? item.id === key : item.cartKey === key
  const removeFromCart = (key: number | string) => setCart((current) => current.filter((item) => !matchesCartItem(item, key)))

  const updateQuantity = (key: number | string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(key); return }
    setCart((current) => current.map((item) => matchesCartItem(item, key)
      ? { ...item, quantity: item.trackStock === false ? quantity : Math.min(quantity, item.stock) }
      : item))
  }

  const clearCart = () => setCart([])
  const getCartTotal = () => visibleCart.reduce((total, item) => total + item.price * item.quantity, 0)
  const getCartItemCount = () => visibleCart.reduce((total, item) => total + item.quantity, 0)

  const addProduct = async (product: ProductInput) => {
    const result = await apiRequest<{ item: Product }>("/api/data/products", {
      method: "POST",
      body: JSON.stringify({ ...product, isActive: product.isActive ?? true }),
    })
    setProducts((current) => [result.item, ...current])
    return result.item
  }

  const updateProduct = async (product: Product) => {
    const result = await apiRequest<{ item: Product }>(`/api/data/products/${product.id}`, {
      method: "PUT", body: JSON.stringify(product),
    })
    setProducts((current) => current.map((item) => item.id === product.id ? result.item : item))
    setCart((current) => current.map((item) => item.id === product.id ? { ...result.item,
      cartKey: item.cartKey, selectedModifiers: item.selectedModifiers,
      price: configuredPrice(result.item, orderType, item.selectedModifiers),
      quantity: result.item.trackStock === false ? item.quantity : Math.min(item.quantity, result.item.stock) } : item))
  }

  const deleteProduct = async (productId: number) => {
    await apiRequest(`/api/data/products/${productId}`, { method: "DELETE" })
    setProducts((current) => current.filter((item) => item.id !== productId))
    removeFromCart(productId)
  }

  const addPurchase = async (purchase: Record<string, unknown>) => {
    await apiRequest("/api/purchases", { method: "POST", body: JSON.stringify(purchase) })
    await refreshProducts()
    window.dispatchEvent(new Event("purchases:changed"))
  }

  return <CartContext.Provider value={{ cart: visibleCart, products: visibleProducts, orderType, setOrderType, addToCart, removeFromCart, updateQuantity, clearCart,
    getCartTotal, getCartItemCount, addProduct, updateProduct, deleteProduct, addPurchase, refreshProducts }}>
    {children}
  </CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within a CartProvider")
  return context
}
