// Precio de venta de un producto según la modalidad, con el precio promocional si está vigente.
// Se usa igual en el POS, el QR de mesa, el cobro y el asistente de WhatsApp.

type Priced = { price: number; promoPrice?: number | null; pricesByOrderType?: Partial<Record<string, number>> | null }

export function basePrice(product: Priced, orderType: string): number {
  return product.pricesByOrderType?.[orderType] ?? product.price
}

export function effectivePrice(product: Priced, orderType: string): number {
  const base = basePrice(product, orderType)
  const promo = product.promoPrice
  return typeof promo === "number" && Number.isSafeInteger(promo) && promo >= 0 && promo < base ? promo : base
}

export const hasPromo = (product: Priced, orderType: string) => effectivePrice(product, orderType) < basePrice(product, orderType)
