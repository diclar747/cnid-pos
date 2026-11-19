import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getRestaurant, restaurantTables } from "@/lib/marketplace"
import RestaurantEntry from "./restaurant-entry"

// QR del restaurante: quien lo escanea entra directo (sin registrarse), elige su mesa y pide.

export const dynamic = "force-dynamic"
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getRestaurant((await params).slug).catch(() => null)
  return { title: found ? `${found.restaurant.name} · Pedí desde tu mesa · RestoPOS` : "Restaurante no disponible · RestoPOS" }
}

export default async function RestaurantQrPage({ params }: Props) {
  const slug = (await params).slug
  const [found, tables] = await Promise.all([getRestaurant(slug), restaurantTables(slug)])
  if (!found) notFound()
  const { slug: id, name, slogan, logo, cover, color, serviceModes } = found.restaurant
  return <RestaurantEntry restaurant={{ slug: id, name, slogan, logo, cover, color, takeaway: serviceModes.delivery || serviceModes.pickup }} tables={tables ?? []} />
}
