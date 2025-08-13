"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { products as defaultProducts } from "../data/products"

export interface Product {
  id: number
  name: string
  price: number
  image: string
  category: string
  barcode: string
  description: string
  stock: number
}

interface CartItem extends Product {
  quantity: number
}

export interface Purchase {
  id: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  total: number
  date: string
  supplier?: string
  notes?: string
  createdBy: string
}

interface CartContextType {
  cart: CartItem[]
  products: Product[]
  purchases: Purchase[]
  addToCart: (product: Product) => void
  addToCartByBarcode: (barcode: string) => boolean
  removeFromCart: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
  cartTotal: number
  itemCount: number
  updateProduct: (product: Product) => void
  addProduct: (product: Omit<Product, "id">) => void
  deleteProduct: (productId: number) => void
  updateStock: (productId: number, newStock: number) => void
  loadExampleProducts: () => void
  syncWithDatabase: () => Promise<void>
  addPurchase: (purchase: Omit<Purchase, "id">) => void
  getPurchasesByDate: (startDate: string, endDate: string) => Purchase[]
  getTotalPurchases: (startDate?: string, endDate?: string) => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Cargar productos desde localStorage o usar productos por defecto
    const savedProducts = localStorage.getItem("products")
    if (savedProducts) {
      try {
        const parsedProducts = JSON.parse(savedProducts)
        setProducts(parsedProducts)
      } catch (error) {
        console.error("Error al cargar productos:", error)
        setProducts(defaultProducts)
      }
    } else {
      setProducts(defaultProducts)
    }

    // Cargar carrito desde localStorage
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (error) {
        console.error("Error al cargar carrito:", error)
      }
    }

    // Cargar compras desde localStorage
    const savedPurchases = localStorage.getItem("purchases")
    if (savedPurchases) {
      try {
        setPurchases(JSON.parse(savedPurchases))
      } catch (error) {
        console.error("Error al cargar compras:", error)
      }
    }

    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (isInitialized && products.length > 0) {
      localStorage.setItem("products", JSON.stringify(products))
    }
  }, [products, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("cart", JSON.stringify(cart))
    }
  }, [cart, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("purchases", JSON.stringify(purchases))
    }
  }, [purchases, isInitialized])

  const addToCart = (product: Product) => {
    const availableStock = product.stock
    const currentInCart = cart.find((item) => item.id === product.id)?.quantity || 0

    if (currentInCart >= availableStock) {
      alert("No hay suficiente stock disponible")
      return
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)

      if (existingItem) {
        return prevCart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }

      return [...prevCart, { ...product, quantity: 1 }]
    })
  }

  const addToCartByBarcode = (barcode: string): boolean => {
    const product = products.find((p: Product) => p.barcode === barcode)

    if (product) {
      addToCart(product)
      return true
    }
    return false
  }

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId))
  }

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = products.find((p) => p.id === productId)
    if (product && quantity > product.stock) {
      alert("No hay suficiente stock disponible")
      return
    }

    setCart((prevCart) => prevCart.map((item) => (item.id === productId ? { ...item, quantity } : item)))
  }

  const clearCart = () => {
    setCart([])
  }

  const updateProduct = (product: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)))
  }

  const addProduct = (productData: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...productData,
      id: Math.max(...products.map((p) => p.id), 0) + 1,
    }
    setProducts((prev) => [...prev, newProduct])
  }

  const deleteProduct = (productId: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    removeFromCart(productId)
  }

  const updateStock = (productId: number, newStock: number) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)))
  }

  const loadExampleProducts = () => {
    const exampleProducts = defaultProducts.filter(
      (example) => !products.some((existing) => existing.barcode === example.barcode),
    )

    if (exampleProducts.length > 0) {
      setProducts((prev) => [...prev, ...exampleProducts])
    }
  }

  const syncWithDatabase = async () => {
    try {
      console.log("Sincronizando con base de datos...")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log("Sincronización completada")
    } catch (error) {
      console.error("Error en sincronización:", error)
      throw error
    }
  }

  const addPurchase = (purchase: Omit<Purchase, "id">) => {
    const newPurchase: Purchase = {
      ...purchase,
      id: Date.now(),
    }
    setPurchases((prev) => [...prev, newPurchase])
  }

  const getPurchasesByDate = (startDate: string, endDate: string): Purchase[] => {
    return purchases.filter((purchase) => {
      const purchaseDate = new Date(purchase.date).toISOString().split("T")[0]
      return purchaseDate >= startDate && purchaseDate <= endDate
    })
  }

  const getTotalPurchases = (startDate?: string, endDate?: string): number => {
    let filteredPurchases = purchases

    if (startDate && endDate) {
      filteredPurchases = getPurchasesByDate(startDate, endDate)
    }

    return filteredPurchases.reduce((total, purchase) => total + purchase.total, 0)
  }

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cart,
        products,
        purchases,
        addToCart,
        addToCartByBarcode,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        itemCount,
        updateProduct,
        addProduct,
        deleteProduct,
        updateStock,
        loadExampleProducts,
        syncWithDatabase,
        addPurchase,
        getPurchasesByDate,
        getTotalPurchases,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart debe usarse dentro de un CartProvider")
  }
  return context
}
