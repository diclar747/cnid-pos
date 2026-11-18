import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AuthProvider } from "./context/auth-context"
import { ThemeProvider } from "./context/theme-context"
import { CartProvider } from "./context/cart-context"
import { NotificationsProvider } from "./context/notifications-context"
import { SalesProvider } from "./context/sales-context"
import { PurchasesProvider } from "./context/purchases-context"
import { SuppliersProvider } from "./context/suppliers-context"
import { CompanyProvider } from "./context/company-context"
import { PwaRegistration } from "./components/pwa-registration"
import { TableCallsListener } from "./components/table-calls-listener"

export const metadata: Metadata = {
  title: "RestoPOS",
  description: "Sistema de punto de venta completo para restaurantes y comercios",
  appleWebApp: { capable: true, title: "RestoPOS", statusBarStyle: "default" },
  icons: { icon: "/pwa-192.png", apple: "/pwa-192.png" },
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0f172a" }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <PwaRegistration />
        <AuthProvider>
          <ThemeProvider>
            <CompanyProvider>
              <SalesProvider>
                <PurchasesProvider>
                  <SuppliersProvider>
                    <CartProvider>
                      <NotificationsProvider>{children}<TableCallsListener /></NotificationsProvider>
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
