import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CartProvider } from "./context/cart-context"
import { AuthProvider } from "./context/auth-context"
import { SalesProvider } from "./context/sales-context"
import { CompanyProvider } from "./context/company-context"
import { ThemeProvider } from "./context/theme-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "POS CNID - Sistema de Gestión Integral",
  description: "Sistema de Punto de Venta moderno para Paraguay con gestión completa de inventario, ventas y reportes",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <ThemeProvider>
          <AuthProvider>
            <CompanyProvider>
              <SalesProvider>
                <CartProvider>{children}</CartProvider>
              </SalesProvider>
            </CompanyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
