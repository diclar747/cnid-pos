import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "./context/auth-context"
import { CompanyProvider } from "./context/company-context"
import { CartProvider } from "./context/cart-context"
import { SalesProvider } from "./context/sales-context"
import { PurchasesProvider } from "./context/purchases-context"
import { NotificationsProvider } from "./context/notifications-context"
import { SuppliersProvider } from "./context/suppliers-context"
import { ThemeProvider } from "./context/theme-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "HeroUI POS - Sistema de Punto de Venta",
  description: "Sistema completo de punto de venta con gestión de inventario, ventas y reportes",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <CompanyProvider>
              <CartProvider>
                <SalesProvider>
                  <PurchasesProvider>
                    <NotificationsProvider>
                      <SuppliersProvider>{children}</SuppliersProvider>
                    </NotificationsProvider>
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
