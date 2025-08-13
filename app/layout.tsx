import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "./context/auth-context"
import { CartProvider } from "./context/cart-context"
import { ThemeProvider } from "./context/theme-context"
import { CompanyProvider } from "./context/company-context"
import { SalesProvider } from "./context/sales-context"
import { PurchasesProvider } from "./context/purchases-context"
import { SuppliersProvider } from "./context/suppliers-context"
import { NotificationsProvider } from "./context/notifications-context"
import { Toaster } from "react-hot-toast"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "HeroUI POS - Sistema de Punto de Venta",
  description: "Sistema completo de punto de venta para restaurantes y comercios",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <CompanyProvider>
              <CartProvider>
                <SalesProvider>
                  <PurchasesProvider>
                    <SuppliersProvider>
                      <NotificationsProvider>
                        {children}
                        <Toaster position="top-right" />
                      </NotificationsProvider>
                    </SuppliersProvider>
                  </PurchasesProvider>
                </SalesProvider>
              </CartProvider>
            </CompanyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
