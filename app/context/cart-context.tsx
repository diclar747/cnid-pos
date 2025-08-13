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

interface CartContextType {
  cart: CartItem[]
  products: Product[]
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
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
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
        // Cargar productos por defecto
        setProducts(defaultProducts)
      }
    } else {
      // Cargar productos por defecto
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

    setIsInitialized(true)
  }, [])

  useEffect(() => {
    // Guardar productos en localStorage solo después de la inicialización
    if (isInitialized && products.length > 0) {
      localStorage.setItem("products", JSON.stringify(products))
    }
  }, [products, isInitialized])

  useEffect(() => {
    // Guardar carrito en localStorage
    if (isInitialized) {
      localStorage.setItem("cart", JSON.stringify(cart))
    }
  }, [cart, isInitialized])

  const addToCart = (product: Product) => {
    // Verificar stock disponible
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

    // Verificar stock
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
    // También remover del carrito si existe
    removeFromCart(productId)
  }

  const updateStock = (productId: number, newStock: number) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)))
  }

  const loadExampleProducts = () => {
    // Cargar productos ejemplo sin duplicar
    const exampleProducts = defaultProducts.filter(
      (example) => !products.some((existing) => existing.barcode === example.barcode),
    )

    if (exampleProducts.length > 0) {
      setProducts((prev) => [...prev, ...exampleProducts])
    }
  }

  const syncWithDatabase = async () => {
    try {
      // Aquí se implementaría la sincronización con Supabase
      console.log("Sincronizando con base de datos...")

      // Simular sincronización
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // En una implementación real, aquí harías:
      // 1. Enviar productos locales a Supabase
      // 2. Obtener productos actualizados de Supabase
      // 3. Actualizar el estado local

      console.log("Sincronización completada")
    } catch (error) {
      console.error("Error en sincronización:", error)
      throw error
    }
  }

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cart,
        products,
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
