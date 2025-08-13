import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "./context/auth-context"
import { ThemeProvider } from "./context/theme-context"
import { CartProvider } from "./context/cart-context"
import { NotificationsProvider } from "./context/notifications-context"
import { SalesProvider } from "./context/sales-context"
import { PurchasesProvider } from "./context/purchases-context"
import { SuppliersProvider } from "./context/suppliers-context"
import { CompanyProvider } from "./context/company-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "POS CNID - Sistema de Gestión Integral",
  description: "Sistema completo de punto de venta y gestión empresarial",
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
              <NotificationsProvider>
                <SalesProvider>
                  <PurchasesProvider>
                    <SuppliersProvider>
                      <CartProvider>{children}</CartProvider>
                    </SuppliersProvider>
                  </PurchasesProvider>
                </SalesProvider>
              </NotificationsProvider>
            </CompanyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
