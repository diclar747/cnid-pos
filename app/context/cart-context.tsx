"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Product } from "../data/products"

interface CartItem extends Product {
  quantity: number
}

interface CartContextType {
  cart: CartItem[]
  products: Product[]
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartItemCount: () => number
  addProduct: (product: Product) => void
  updateProduct: (product: Product) => void
  deleteProduct: (productId: string) => void
  addPurchase: (purchase: any) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("cart")
      if (savedCart) {
        setCart(JSON.parse(savedCart))
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(cart))
    }
  }, [cart])

  // Load products
  useEffect(() => {
    import("../data/products").then(({ products }) => {
      setProducts(products)
    })
  }, [])

  const addToCart = (product: Product) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id)

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item,
        )
      }

      return [...currentCart, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart((currentCart) =>
      currentCart.map((item) => (item.id === productId ? { ...item, quantity: Math.min(quantity, item.stock) } : item)),
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  const addProduct = (product: Product) => {
    setProducts((currentProducts) => {
      const newProducts = [...currentProducts, product]
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("products", JSON.stringify(newProducts))
      }
      return newProducts
    })
  }

  const updateProduct = (updatedProduct: Product) => {
    setProducts((currentProducts) => {
      const newProducts = currentProducts.map((product) =>
        product.id === updatedProduct.id ? updatedProduct : product
      )
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("products", JSON.stringify(newProducts))
      }
      return newProducts
    })
  }

  const deleteProduct = (productId: string) => {
    setProducts((currentProducts) => {
      const newProducts = currentProducts.filter((product) => product.id !== productId)
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("products", JSON.stringify(newProducts))
      }
      return newProducts
    })
    // También remover del carrito si existe
    removeFromCart(productId)
  }

  const addPurchase = (purchase: any) => {
    // Para este ejemplo, solo guardamos las compras en localStorage
    if (typeof window !== "undefined") {
      const purchases = JSON.parse(localStorage.getItem("purchases") || "[]")
      purchases.push(purchase)
      localStorage.setItem("purchases", JSON.stringify(purchases))
    }
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        products,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartItemCount,
        addProduct,
        updateProduct,
        deleteProduct,
        addPurchase,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
