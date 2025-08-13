import { supabase } from "../lib/supabase"
import type { Database } from "../types/database"

type Tables = Database["public"]["Tables"]

// Servicio de productos
export const productService = {
  async getAll() {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq("is_active", true)
      .order("name")

    if (error) throw error
    return data
  },

  async getByBarcode(barcode: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("barcode", barcode)
      .eq("is_active", true)
      .single()

    if (error) throw error
    return data
  },

  async create(product: Tables["products"]["Insert"]) {
    const { data, error } = await supabase.from("products").insert(product).select().single()

    if (error) throw error
    return data
  },

  async update(id: string, product: Tables["products"]["Update"]) {
    const { data, error } = await supabase.from("products").update(product).eq("id", id).select().single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id)

    if (error) throw error
  },

  async updateStock(id: string, newStock: number, reason?: string, userId?: string) {
    const { data: product } = await supabase.from("products").select("stock").eq("id", id).single()

    if (!product) throw new Error("Producto no encontrado")

    // Actualizar stock del producto
    const { error: updateError } = await supabase.from("products").update({ stock: newStock }).eq("id", id)

    if (updateError) throw updateError

    // Registrar movimiento de stock
    const { error: movementError } = await supabase.from("stock_movements").insert({
      product_id: id,
      movement_type: newStock > product.stock ? "in" : "out",
      quantity: Math.abs(newStock - product.stock),
      previous_stock: product.stock,
      new_stock: newStock,
      reason,
      created_by: userId,
    })

    if (movementError) throw movementError
  },
}

// Servicio de usuarios
export const userService = {
  async getAll() {
    const { data, error } = await supabase.from("users").select("*").order("name")

    if (error) throw error
    return data
  },

  async getByUsername(username: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .single()

    if (error) throw error
    return data
  },

  async create(user: Tables["users"]["Insert"]) {
    const { data, error } = await supabase.from("users").insert(user).select().single()

    if (error) throw error
    return data
  },

  async update(id: string, user: Tables["users"]["Update"]) {
    const { data, error } = await supabase.from("users").update(user).eq("id", id).select().single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("users").delete().eq("id", id)

    if (error) throw error
  },
}

// Servicio de ventas
export const salesService = {
  async getAll() {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        customers (
          id,
          name,
          ruc
        ),
        users (
          id,
          name
        ),
        sale_items (
          *,
          products (
            id,
            name,
            price
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },

  async create(sale: Tables["sales"]["Insert"], items: Tables["sale_items"]["Insert"][]) {
    const { data: saleData, error: saleError } = await supabase.from("sales").insert(sale).select().single()

    if (saleError) throw saleError

    // Insertar items de la venta
    const saleItems = items.map((item) => ({
      ...item,
      sale_id: saleData.id,
    }))

    const { error: itemsError } = await supabase.from("sale_items").insert(saleItems)

    if (itemsError) throw itemsError

    return saleData
  },

  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items (
          *,
          products (
            id,
            name
          )
        )
      `)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  },
}

// Servicio de gastos
export const expenseService = {
  async getAll() {
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        expense_categories (
          id,
          name
        ),
        users (
          id,
          name
        )
      `)
      .order("expense_date", { ascending: false })

    if (error) throw error
    return data
  },

  async create(expense: Tables["expenses"]["Insert"]) {
    const { data, error } = await supabase.from("expenses").insert(expense).select().single()

    if (error) throw error
    return data
  },

  async update(id: string, expense: Tables["expenses"]["Update"]) {
    const { data, error } = await supabase.from("expenses").update(expense).eq("id", id).select().single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id)

    if (error) throw error
  },

  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        expense_categories (
          id,
          name
        )
      `)
      .gte("expense_date", startDate)
      .lte("expense_date", endDate)
      .order("expense_date", { ascending: false })

    if (error) throw error
    return data
  },
}

// Servicio de categorías
export const categoryService = {
  async getAll() {
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) throw error
    return data
  },

  async getExpenseCategories() {
    const { data, error } = await supabase.from("expense_categories").select("*").order("name")

    if (error) throw error
    return data
  },
}

// Servicio de configuración de empresa
export const companyService = {
  async get() {
    const { data, error } = await supabase.from("company_config").select("*").single()

    if (error) throw error
    return data
  },

  async update(config: Tables["company_config"]["Update"]) {
    const { data, error } = await supabase
      .from("company_config")
      .update(config)
      .eq("id", (await this.get()).id)
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// Servicio de clientes
export const customerService = {
  async getAll() {
    const { data, error } = await supabase.from("customers").select("*").order("name")

    if (error) throw error
    return data
  },

  async create(customer: Tables["customers"]["Insert"]) {
    const { data, error } = await supabase.from("customers").insert(customer).select().single()

    if (error) throw error
    return data
  },

  async update(id: string, customer: Tables["customers"]["Update"]) {
    const { data, error } = await supabase.from("customers").update(customer).eq("id", id).select().single()

    if (error) throw error
    return data
  },
}
