import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getRestaurant } from "@/lib/marketplace"
import MarketplaceHeader from "../marketplace-header"
import RestaurantMenu from "./restaurant-menu"

export const dynamic = "force-dynamic"
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getRestaurant((await params).slug).catch(() => null)
  if (!found) return { title: "Restaurante no disponible · RestoPOS" }
  const { restaurant } = found
  return {
    title: `${restaurant.name} · Menú y pedidos · RestoPOS`,
    description: restaurant.description || restaurant.slogan || `Menú de ${restaurant.name}${restaurant.city ? ` en ${restaurant.city}` : ""}. Pedí por WhatsApp.`,
    openGraph: restaurant.cover && !restaurant.cover.startsWith("data:") ? { images: [restaurant.cover] } : undefined,
  }
}

export default async function RestaurantPage({ params }: Props) {
  const found = await getRestaurant((await params).slug)
  if (!found) notFound()
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <MarketplaceHeader />
      <RestaurantMenu restaurant={found.restaurant} products={found.products} />
    </div>
  )
}
