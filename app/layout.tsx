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
  title: "CNID POS System",
  description: "Sistema de punto de venta completo para restaurantes y comercios",
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
        <AuthProvider>
          <ThemeProvider>
            <CompanyProvider>
              <SalesProvider>
                <PurchasesProvider>
                  <SuppliersProvider>
                    <CartProvider>
                      <NotificationsProvider>{children}</NotificationsProvider>
                    </CartProvider>
                  </SuppliersProvider>
                </PurchasesProvider>
              </SalesProvider>
            </CompanyProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
