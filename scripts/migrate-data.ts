import { supabase } from "../lib/supabase"

// Script para migrar datos de localStorage a Supabase
export async function migrateLocalStorageData() {
  try {
    console.log("Iniciando migración de datos...")

    // Migrar productos
    const localProducts = localStorage.getItem("products")
    if (localProducts) {
      const products = JSON.parse(localProducts)

      // Obtener categorías primero
      const { data: categories } = await supabase.from("categories").select("*")
      const categoryMap = new Map(categories?.map((c) => [c.name, c.id]) || [])

      for (const product of products) {
        const { error } = await supabase.from("products").insert({
          name: product.name,
          description: product.description,
          price: product.price,
          barcode: product.barcode,
          category_id: categoryMap.get(product.category),
          stock: product.stock,
          image: product.image,
        })

        if (error && !error.message.includes("duplicate")) {
          console.error("Error migrando producto:", error)
        }
      }
    }

    // Migrar usuarios
    const localUsers = localStorage.getItem("users")
    if (localUsers) {
      const users = JSON.parse(localUsers)

      for (const user of users) {
        const { error } = await supabase.from("users").insert({
          username: user.username,
          password: user.password,
          name: user.name,
          role: user.role,
          is_active: user.isActive,
        })

        if (error && !error.message.includes("duplicate")) {
          console.error("Error migrando usuario:", error)
        }
      }
    }

    // Migrar ventas
    const localSales = localStorage.getItem("sales")
    if (localSales) {
      const sales = JSON.parse(localSales)

      // Obtener usuarios para mapear cashier
      const { data: users } = await supabase.from("users").select("*")
      const userMap = new Map(users?.map((u) => [u.name, u.id]) || [])

      for (const sale of sales) {
        const { data: saleData, error: saleError } = await supabase
          .from("sales")
          .insert({
            receipt_number: sale.receiptNumber,
            cashier_id: userMap.get(sale.cashier) || users?.[0]?.id,
            subtotal: sale.subtotal,
            tax: sale.tax,
            total: sale.total,
            payment_method: sale.paymentMethod,
            created_at: sale.date,
          })
          .select()
          .single()

        if (saleError) {
          console.error("Error migrando venta:", saleError)
          continue
        }

        // Migrar items de la venta
        for (const item of sale.items) {
          const { data: product } = await supabase
            .from("products")
            .select("id")
            .eq("barcode", item.product.barcode)
            .single()

          if (product) {
            await supabase.from("sale_items").insert({
              sale_id: saleData.id,
              product_id: product.id,
              quantity: item.quantity,
              unit_price: item.product.price,
              subtotal: item.subtotal,
            })
          }
        }
      }
    }

    // Migrar gastos
    const localExpenses = localStorage.getItem("expenses")
    if (localExpenses) {
      const expenses = JSON.parse(localExpenses)

      // Obtener categorías de gastos
      const { data: expenseCategories } = await supabase.from("expense_categories").select("*")
      const categoryMap = new Map(expenseCategories?.map((c) => [c.name, c.id]) || [])

      // Obtener usuarios
      const { data: users } = await supabase.from("users").select("*")
      const userMap = new Map(users?.map((u) => [u.name, u.id]) || [])

      for (const expense of expenses) {
        const { error } = await supabase.from("expenses").insert({
          description: expense.description,
          amount: expense.amount,
          category_id: categoryMap.get(expense.category),
          created_by: userMap.get(expense.createdBy) || users?.[0]?.id,
          expense_date: new Date(expense.date).toISOString().split("T")[0],
          created_at: expense.date,
        })

        if (error) {
          console.error("Error migrando gasto:", error)
        }
      }
    }

    console.log("Migración completada exitosamente!")

    // Limpiar localStorage después de la migración exitosa
    localStorage.removeItem("products")
    localStorage.removeItem("users")
    localStorage.removeItem("sales")
    localStorage.removeItem("expenses")
    localStorage.removeItem("companyConfig")
  } catch (error) {
    console.error("Error durante la migración:", error)
  }
}

// Función para ejecutar la migración
if (typeof window !== "undefined") {
  // Solo ejecutar en el cliente
  ;(window as any).migrateData = migrateLocalStorageData
}
