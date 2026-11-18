import type { Metadata } from "next"
import { listRestaurants } from "@/lib/marketplace"
import MarketplaceHeader from "./marketplace-header"
import MarketplaceList from "./marketplace-list"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Marketplace de restaurantes · RestoPOS",
  description: "Restaurantes con RestoPOS: menú, dirección, horarios y pedidos directos por WhatsApp.",
}

export default async function MarketplacePage() {
  const items = await listRestaurants().catch((error) => { console.error("Marketplace", error); return [] })
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <MarketplaceHeader />
      <MarketplaceList items={items} />
      <footer className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
        ¿Tenés un restaurante? <a href="/#funciones" className="font-semibold text-indigo-600 hover:underline">Sumate a RestoPOS</a> y aparecé acá con tu menú.
      </footer>
    </div>
  )
}
