import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { ThemeProvider } from "./context/theme-context"
import { AuthProvider } from "./context/auth-context"
import { CartProvider } from "./context/cart-context"
import { NotificationsProvider } from "./context/notifications-context"
import { SalesProvider } from "./context/sales-context"
import { PurchasesProvider } from "./context/purchases-context"
import { SuppliersProvider } from "./context/suppliers-context"
import { CompanyProvider } from "./context/company-context"
import { Toaster } from "react-hot-toast"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
})
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "POS CNID - Sistema de Punto de Venta",
  description: "Sistema completo de punto de venta con gestión de inventario",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <CompanyProvider>
              <CartProvider>
                <NotificationsProvider>
                  <SalesProvider>
                    <PurchasesProvider>
                      <SuppliersProvider>
                        {children}
                        <Toaster position="top-right" />
                      </SuppliersProvider>
                    </PurchasesProvider>
                  </SalesProvider>
                </NotificationsProvider>
              </CartProvider>
            </CompanyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
