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
import { InstallBanner } from "./components/install-banner"
import { TableCallsListener } from "./components/table-calls-listener"
import { WorkspaceFrame } from "./components/workspace-shell"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://restopos.cd.com.py"),
  title: "RestoPOS · Tu restaurante en línea",
  description: "Pedidos desde el teléfono, mesas con QR, cocina en vivo, caja y delivery para tu restaurante.",
  openGraph: {
    type: "website", siteName: "RestoPOS", locale: "es_PY", title: "RestoPOS · Tu restaurante en línea",
    description: "Pedidos desde el teléfono, mesas con QR, cocina en vivo, caja y delivery en un solo lugar.",
    images: [{ url: "/brand/restopos-og.jpg", width: 1200, height: 630, alt: "RestoPOS · Tu restaurante en línea" }],
  },
  twitter: { card: "summary_large_image", title: "RestoPOS · Tu restaurante en línea", images: ["/brand/restopos-og.jpg"] },
  appleWebApp: { capable: true, title: "RestoPOS", statusBarStyle: "default" },
  icons: { icon: [{ url: "/brand/restopos-icon.svg", type: "image/svg+xml" }, { url: "/brand/restopos-48.png", sizes: "48x48" }], apple: "/brand/restopos-apple-180.png" },
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
        <InstallBanner />
        <AuthProvider>
          <ThemeProvider>
            <CompanyProvider>
              <SalesProvider>
                <PurchasesProvider>
                  <SuppliersProvider>
                    <CartProvider>
                      <NotificationsProvider><WorkspaceFrame>{children}</WorkspaceFrame><TableCallsListener /></NotificationsProvider>
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
