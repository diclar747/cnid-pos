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
  items: OrderLine[]
  notes: string
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
