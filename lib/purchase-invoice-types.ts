// Tipos de facturas de compra compartidos entre servidor y navegador.

export type TaxRate = 0 | 5 | 10

export interface PurchaseInvoiceItem {
  id: number
  description: string
  category: string
  unit: string
  quantity: number
  unitCost: number
  taxRate: TaxRate
  total: number
  productId: number | null
  productName: string
  stockAdded: number
}

export interface PurchaseInvoice {
  id: number
  supplierId: number | null
  supplierName: string
  supplierRuc: string
  invoiceNumber: string
  stamp: string
  invoiceDate: string
  condition: "cash" | "credit"
  dueDate: string | null
  status: "active" | "cancelled"
  exempt: number
  taxed5: number
  taxed10: number
  tax5: number
  tax10: number
  total: number
  notes: string
  source: "manual" | "scan"
  paidFromCash: boolean
  createdByName: string
  createdAt: string
  cancelledAt: string | null
  cancelledByName: string
  cancelReason: string
  items: PurchaseInvoiceItem[]
}

/** Ítem tal como lo arma el formulario (o la lectura de la factura). */
export interface PurchaseItemDraft {
  description: string
  category: string
  unit: string
  quantity: number
  unitCost: number
  taxRate: TaxRate
  productId: number | null
  addStock: boolean
}

/** Borrador que devuelve el escaneo de una factura con Niro IA. */
export interface ScannedInvoice {
  supplier: { name: string; ruc: string; stamp: string; matchId: number | null }
  invoiceNumber: string
  invoiceDate: string
  condition: "cash" | "credit"
  items: PurchaseItemDraft[]
  totals: { exempt: number; tax5: number; tax10: number; total: number }
  warnings: string[]
}

export const PURCHASE_CATEGORIES = ["Insumos", "Carnes", "Pollo y pescado", "Verduras y frutas", "Lácteos", "Almacén", "Panificados",
  "Bebidas", "Descartables", "Limpieza", "Gas y combustible", "Mantenimiento", "Otros"]
export const PURCHASE_UNITS = ["u", "kg", "g", "l", "ml", "caja", "paquete", "bolsa", "docena", "maple"]

/** Totales con IVA incluido (Paraguay): gravadas 10 % y 5 %, IVA de cada tasa y exentas. */
export function invoiceTotals(items: { quantity: number; unitCost: number; taxRate: TaxRate }[]) {
  let exempt = 0, taxed5 = 0, taxed10 = 0
  for (const item of items) {
    const total = Math.round(item.quantity * item.unitCost)
    if (item.taxRate === 10) taxed10 += total
    else if (item.taxRate === 5) taxed5 += total
    else exempt += total
  }
  return { exempt, taxed5, taxed10, tax5: Math.round(taxed5 / 21), tax10: Math.round(taxed10 / 11), total: exempt + taxed5 + taxed10 }
}
