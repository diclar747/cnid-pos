export interface Database {
  public: {
    Tables: {
      company_config: {
        Row: {
          id: string
          name: string
          ruc: string
          address: string
          phone: string
          email: string | null
          logo: string | null
          website: string | null
          slogan: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          ruc: string
          address: string
          phone: string
          email?: string | null
          logo?: string | null
          website?: string | null
          slogan?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          ruc?: string
          address?: string
          phone?: string
          email?: string | null
          logo?: string | null
          website?: string | null
          slogan?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          username: string
          password: string
          name: string
          role: "admin" | "cashier"
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          password: string
          name: string
          role: "admin" | "cashier"
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          password?: string
          name?: string
          role?: "admin" | "cashier"
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          barcode: string
          category_id: string | null
          stock: number
          min_stock: number
          image: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          barcode: string
          category_id?: string | null
          stock?: number
          min_stock?: number
          image?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          barcode?: string
          category_id?: string | null
          stock?: number
          min_stock?: number
          image?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          ruc: string | null
          address: string | null
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          ruc?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          ruc?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          receipt_number: string
          customer_id: string | null
          cashier_id: string
          subtotal: number
          tax: number
          total: number
          payment_method: "card" | "cash"
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          receipt_number: string
          customer_id?: string | null
          cashier_id: string
          subtotal: number
          tax: number
          total: number
          payment_method: "card" | "cash"
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          receipt_number?: string
          customer_id?: string | null
          cashier_id?: string
          subtotal?: number
          tax?: number
          total?: number
          payment_method?: "card" | "cash"
          status?: string
          notes?: string | null
          created_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string | null
          quantity: number
          unit_price: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id?: string | null
          quantity: number
          unit_price: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
          subtotal?: number
          created_at?: string
        }
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          description: string
          amount: number
          category_id: string | null
          created_by: string
          expense_date: string
          receipt_number: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          description: string
          amount: number
          category_id?: string | null
          created_by: string
          expense_date: string
          receipt_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          description?: string
          amount?: number
          category_id?: string | null
          created_by?: string
          expense_date?: string
          receipt_number?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string | null
          movement_type: "in" | "out" | "adjustment"
          quantity: number
          previous_stock: number
          new_stock: number
          reason: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          movement_type: "in" | "out" | "adjustment"
          quantity: number
          previous_stock: number
          new_stock: number
          reason?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          movement_type?: "in" | "out" | "adjustment"
          quantity?: number
          previous_stock?: number
          new_stock?: number
          reason?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
    }
  }
}
