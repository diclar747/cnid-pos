import type { Metadata, Viewport } from "next"
import type React from "react"

type Props = { params: Promise<{ code: string }>; children: React.ReactNode }

// Cada mesa se instala como su propia app (nombre del local y de la mesa).
export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const code = encodeURIComponent((await params).code)
  return {
    title: "Carta · RestoPOS",
    manifest: `/api/table/${code}/manifest`,
    appleWebApp: { capable: true, title: "Carta", statusBarStyle: "default" },
  }
}

export const viewport: Viewport = { themeColor: "#4338ca" }

export default function TableLayout({ children }: Props) {
  return children
}
