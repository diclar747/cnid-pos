import "server-only"

import type { SessionUser } from "./auth"

export const tables = {
  products: "products",
  sales: "sales",
  expenses: "expenses",
  purchases: "purchases",
  suppliers: "suppliers",
  auto_orders: "auto_orders",
  company: "company_config",
} as const

export type Collection = keyof typeof tables

export function isCollection(value: string): value is Collection {
  return Object.prototype.hasOwnProperty.call(tables, value)
}

export function canRead(user: SessionUser, collection: Collection): boolean {
  switch (collection) {
    case "products":
      return user.permissions.includes("access_pos") || user.permissions.includes("manage_products")
    case "sales":
      return user.permissions.includes("view_reports") || user.permissions.includes("manage_sales")
    case "expenses":
      return user.permissions.includes("manage_expenses") || user.permissions.includes("view_expenses")
    case "purchases":
      return user.permissions.includes("manage_purchases")
    case "suppliers":
    case "auto_orders":
      return user.permissions.includes("manage_suppliers")
    case "company":
      return true
  }
}

export function canWrite(user: SessionUser, collection: Collection): boolean {
  switch (collection) {
    case "products": return user.permissions.includes("manage_products")
    case "expenses": return user.permissions.includes("manage_expenses")
    case "suppliers":
    case "auto_orders": return user.permissions.includes("manage_suppliers")
    case "company": return user.permissions.includes("manage_company")
    case "sales":
    case "purchases": return false
  }
}

export function record(row: { id: string | number; data: Record<string, unknown> }) {
  return { ...row.data, id: Number(row.id) }
}

export function validateRecord(collection: Collection, body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Los datos deben ser un objeto.")
  }
  const data = { ...(body as Record<string, unknown>) }
  delete data.id

  if (collection === "products") {
    if (typeof data.name !== "string" || !data.name.trim()) throw new Error("El producto necesita un nombre.")
    if (!Number.isSafeInteger(data.price) || (data.price as number) < 0) throw new Error("El precio no es válido.")
    if (!Number.isSafeInteger(data.stock) || (data.stock as number) < 0) throw new Error("El stock no es válido.")
    if (typeof data.barcode !== "string" || !data.barcode.trim()) throw new Error("Ingresá un código de barras.")
    if (typeof data.category !== "string" || !data.category.trim()) throw new Error("Seleccioná una categoría.")
    if (data.supplierId !== undefined && (!Number.isSafeInteger(data.supplierId) || (data.supplierId as number) <= 0)) throw new Error("El proveedor asignado no es válido.")
    data.isActive = data.isActive !== false
  } else if (collection === "expenses") {
    if (typeof data.description !== "string" || !data.description.trim()) throw new Error("El gasto necesita una descripción.")
    if (!Number.isSafeInteger(data.amount) || (data.amount as number) <= 0) throw new Error("El monto no es válido.")
    if (typeof data.date !== "string" || Number.isNaN(Date.parse(data.date))) throw new Error("La fecha no es válida.")
  } else if (collection === "suppliers") {
    if (typeof data.name !== "string" || !data.name.trim()) throw new Error("El proveedor necesita un nombre.")
    data.contacts = Array.isArray(data.contacts) ? data.contacts : []
  } else if (collection === "auto_orders") {
    if (!Number.isSafeInteger(data.supplierId) || !Number.isSafeInteger(data.productId)) {
      throw new Error("El proveedor o producto no es válido.")
    }
    if (!Number.isSafeInteger(data.orderQuantity) || (data.orderQuantity as number) <= 0) {
      throw new Error("La cantidad del pedido no es válida.")
    }
  }
  return data
}

export function dataError(error: unknown): { message: string; status: number } {
  if (error instanceof Error && !("code" in error)) return { message: error.message, status: 400 }
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    return { message: "Ya existe un registro con ese código o valor.", status: 409 }
  }
  if (typeof error === "object" && error && "code" in error && error.code === "23503") {
    return { message: "Este registro está asociado a órdenes de compra y no se puede eliminar.", status: 409 }
  }
  console.error("Database request failed", error)
  return { message: "No se pudo guardar en PostgreSQL.", status: 500 }
}
