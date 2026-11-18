export type ServiceOrderType = "dineIn" | "delivery" | "pickup"
export type KitchenStatus = "pending" | "preparing" | "ready" | "served" | "out_for_delivery" | "delivered" | "cancelled"

export interface OrderModifier {
  groupId: number
  groupName: string
  optionId: number
  name: string
  price: number
}

export interface OrderLine {
  lineId: string
  productId: number
  productName: string
  quantity: number
  price: number
  subtotal: number
  modifiers: OrderModifier[]
  stockReserved: boolean
  ticketId: number | null
}

export interface ServiceOrder {
  id: number
  cardId: number | null
  cardCode: string | null
  tableId: number | null
  status: "open" | "paid" | "cancelled"
  orderType: ServiceOrderType
  tableLabel: string
  customerName: string
  customerPhone: string
  notes: string
  items: OrderLine[]
  total: number
  createdAt: string
  updatedAt: string
  closedAt: string | null
  saleId: number | null
  waiterId: number | null
  waiterName: string
  /** Última precuenta impresa; null si nunca se imprimió o si se agregaron consumos después. */
  billedAt: string | null
  billCount: number
  customerId: number | null
  /** Por dónde entró el pedido. */
  source: OrderSource
  /** Los pedidos remotos entran «pending» y el local los confirma o rechaza. */
  confirmation: OrderConfirmation
  deliveryZoneId: number | null
  deliveryZoneName: string
  /** Costo de envío; no está incluido en `total` (suma de productos). */
  deliveryFee: number
  deliveryAddress: string
  /** Ubicación compartida por el cliente (WhatsApp), para el repartidor. */
  deliveryLocation: { lat: number; lng: number } | null
  courierId: number | null
  courierName: string
  /** total + deliveryFee: lo que paga el cliente. */
  grandTotal: number
}

export type OrderSource = "pos" | "table_qr" | "whatsapp" | "web"
export type OrderConfirmation = "pending" | "confirmed" | "rejected"

export interface OrderEvent {
  id: number
  orderId: number
  ticketId: number | null
  event: string
  status: string
  note: string
  actorName: string
  createdAt: string
}

export interface Customer {
  id: number
  name: string
  phone: string
  ruc: string
  email: string
  address: string
  notes: string
  ordersCount: number
  totalSpent: number
  lastOrderAt: string | null
  createdAt: string
  /** Cuenta corriente: si puede comprar a crédito, límite (null = sin límite), ciclo de cobro y saldo pendiente. */
  creditEnabled: boolean
  creditLimit: number | null
  billingCycle: "weekly" | "biweekly" | "monthly" | "none"
  balance: number
}

export interface DeliveryZone {
  id: number
  name: string
  areas: string
  fee: number
  freeOver: number | null
  etaMinutes: number | null
  /** Radio de la zona en km desde el local; con la ubicación del cliente se elige la zona sola. */
  maxKm: number | null
  isActive: boolean
  sortOrder: number
}

export interface Courier {
  id: number
  name: string
  phone: string
  vehicle: string
  isActive: boolean
}

export interface StaffMember {
  id: number
  name: string
  role: "admin" | "manager" | "cashier" | "waiter"
}

export interface KitchenTicket {
  id: number
  orderId: number
  status: KitchenStatus
  orderType: ServiceOrderType
  tableLabel: string
  customerName: string
  cardCode: string | null
  waiterName: string
  courierName: string
  deliveryAddress: string
  items: OrderLine[]
  notes: string
  priority: "normal" | "high"
  delayMinutes: number | null
  createdAt: string
  updatedAt: string
}

export interface OrderCard {
  id: number
  code: string
  label: string
  isActive: boolean
  openOrderId: number | null
  createdAt: string
}
