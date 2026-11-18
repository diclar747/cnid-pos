// Carga datos de demostración en la base local usando la API (la app debe estar corriendo).
// Uso: POS_ORIGIN=http://127.0.0.1:3000 node scripts/seed-demo.mjs
// Es idempotente: si los datos demo ya existen, no los duplica.
import { readFile } from "node:fs/promises"
import { randomBytes, scryptSync } from "node:crypto"
import pg from "pg"

const origin = process.env.POS_ORIGIN ?? "http://127.0.0.1:3000"
const env = await readFile(".env.local", "utf8").catch(() => "")
const connectionString = process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim()
if (!connectionString) throw new Error("DATABASE_URL no configurada")

// Credenciales de demostración, solo para la base local.
export const DEMO = {
  superadmin: { email: "superadmin@cnid.local", username: "superadmin", password: "SuperDemo2026!" },
  casa: {
    admin: { email: "admin@heroui.com", password: "admin123" },
    waiters: [
      { email: "dani@delacasa.local", username: "dani", password: "Mesero2026", name: "Dani" },
      { email: "cesar@delacasa.local", username: "cesar", password: "Mesero2026", name: "Cesar" },
    ],
  },
  demo: {
    restaurant: { name: "Restaurante Demo", slug: "demo" },
    admin: { email: "demo@cnid.local", username: "demo", password: "Demo2026cnid", name: "Administrador Demo" },
    manager: { email: "gerente.demo@cnid.local", username: "gerente_demo", password: "Gerente2026", name: "Gerente Demo" },
    cashier: { email: "cajero.demo@cnid.local", username: "cajero_demo", password: "Cajero2026", name: "Cajero Demo" },
    waiter: { email: "mesero.demo@cnid.local", username: "mesero_demo", password: "Mesero2026", name: "Mesero Demo" },
  },
}

// Mesero: abre cuentas, envía a cocina e imprime precuentas, pero no cobra ni cancela.
const WAITER_PERMISSIONS = ["view_products", "access_pos", "take_orders"]
const db = new pg.Pool({ connectionString })
const DAY = 24 * 60 * 60 * 1000
const pick = (list, i) => list[i % list.length]

function client() {
  let cookie = ""
  return async function request(path, method = "GET", body) {
    const response = await fetch(origin + path, {
      method,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const token = response.headers.get("set-cookie")?.split(";")[0]
    if (token) cookie = token
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${result.error ?? "error"}`)
    return result
  }
}

async function login(email, password) {
  const request = client()
  await request("/api/auth/login", "POST", { email, password })
  return request
}

// Reparte las ventas recién creadas en los últimos días para que los reportes tengan historia.
async function spreadSales(schema, ids, days) {
  for (const [i, id] of ids.entries()) {
    const when = new Date(Date.now() - (i % days) * DAY - ((i * 37) % 600) * 60 * 1000)
    await db.query(
      `UPDATE "${schema}".sales SET created_at = $1, data = jsonb_set(data, '{date}', to_jsonb($2::text)) WHERE id = $3`,
      [when, when.toISOString(), id],
    )
  }
}

async function seedOperations(request, schema, { suppliers, expenses, sales, days }) {
  const count = async (table) => Number((await db.query(`SELECT COUNT(*) AS n FROM "${schema}".${table}`)).rows[0].n)

  if ((await count("suppliers")) === 0) {
    for (const s of suppliers) {
      await request("/api/data/suppliers", "POST", {
        name: s, ruc: "", contact: "", email: "", phone: "", address: "",
        category: "general", rating: 4, isActive: true, creditLimit: 0, paymentTerms: "30 días", contacts: [],
      })
    }
    console.log(`  proveedores: ${suppliers.length}`)
  }

  const products = (await request("/api/data/products")).items.filter((p) => p.isActive !== false)
  if ((await count("purchases")) === 0) {
    for (const [i, p] of products.entries()) {
      await request("/api/purchases", "POST", {
        productId: p.id, quantity: 20, unitPrice: Math.round(p.price * 0.55), supplier: pick(suppliers, i),
      })
    }
    console.log(`  compras (reposición de stock): ${products.length}`)
  }

  if ((await count("expenses")) === 0) {
    for (const [i, [description, amount, category]] of expenses.entries()) {
      await request("/api/data/expenses", "POST", {
        description, amount, category, date: new Date(Date.now() - i * 3 * DAY).toISOString(),
      })
    }
    console.log(`  gastos: ${expenses.length}`)
  }

  if ((await count("sales")) === 0) {
    const methods = ["cash", "card", "transfer", "cash"]
    const types = ["dineIn", "dineIn", "pickup", "delivery"]
    const ids = []
    for (let i = 0; i < sales; i++) {
      const items = [pick(products, i * 3), pick(products, i * 5 + 1)]
        .filter((p, j, all) => all.findIndex((x) => x.id === p.id) === j)
        .map((p, j) => ({ id: p.id, quantity: 1 + ((i + j) % 2) }))
      const total = items.reduce((sum, it) => sum + products.find((p) => p.id === it.id).price * it.quantity, 0)
      const method = pick(methods, i)
      const sale = await request("/api/checkout", "POST", {
        items, paymentMethod: method, orderType: pick(types, i),
        ...(method === "cash" ? { cashReceived: Math.ceil(total / 10000) * 10000 + 50000 } : {}),
        customerName: i % 4 === 0 ? "Cliente General" : `Cliente demo ${i}`,
      })
      ids.push(Number(sale.sale?.id ?? sale.saleId ?? sale.id))
    }
    if (ids.every(Number.isFinite)) await spreadSales(schema, ids, days)
    console.log(`  ventas: ${sales} (repartidas en ${days} días)`)
  }
}

try {
  // 1. Superadministrador
  const superUser = await db.query(`SELECT id FROM public.app_users WHERE role = 'superadmin' LIMIT 1`)
  if (!superUser.rows[0]) {
    const salt = randomBytes(16).toString("hex")
    const hash = `${salt}:${scryptSync(DEMO.superadmin.password, salt, 64).toString("hex")}`
    await db.query(
      `INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id)
       VALUES ($1,$2,'Superadministrador CNID','superadmin',ARRAY['manage_restaurants']::text[],$3,NULL)`,
      [DEMO.superadmin.email, DEMO.superadmin.username, hash],
    )
    console.log("Superadministrador creado.")
  }

  // 2. De la Casa (restaurante 1): meseros y operaciones de ejemplo
  console.log("De la Casa:")
  const casaRequest = await login(DEMO.casa.admin.email, DEMO.casa.admin.password)
  const casaUsers = (await casaRequest("/api/users")).users ?? []
  for (const waiter of DEMO.casa.waiters) {
    if (!casaUsers.some((x) => x.email === waiter.email)) {
      await casaRequest("/api/users", "POST", { ...waiter, role: "waiter", permissions: WAITER_PERMISSIONS, status: "active" })
      console.log(`  mesero: ${waiter.email}`)
    }
  }
  await seedOperations(casaRequest, "public", {
    suppliers: ["Distribuidora Central", "Bebidas del Este", "Panadería San José"],
    expenses: [["Alquiler del local", 3500000, "alquiler"], ["ANDE - energía", 850000, "servicios"],
      ["Internet y telefonía", 250000, "servicios"], ["Limpieza", 180000, "insumos"]],
    sales: 30, days: 14,
  })

  // 3. Restaurante Demo con sus propios usuarios y catálogo
  const superRequest = await login(DEMO.superadmin.email, DEMO.superadmin.password)
  const { restaurants } = await superRequest("/api/restaurants")
  let demo = restaurants.find((r) => r.slug === DEMO.demo.restaurant.slug)
  if (!demo) {
    const created = await superRequest("/api/restaurants", "POST", {
      ...DEMO.demo.restaurant, email: DEMO.demo.admin.email,
      adminName: DEMO.demo.admin.name, adminEmail: DEMO.demo.admin.email,
      adminUsername: DEMO.demo.admin.username, adminPassword: DEMO.demo.admin.password,
    })
    demo = created.restaurant
    console.log("Restaurante Demo creado.")
  }
  const schema = (await db.query("SELECT schema_name FROM public.restaurants WHERE id = $1", [demo.id])).rows[0].schema_name
  const demoRequest = await login(DEMO.demo.admin.email, DEMO.demo.admin.password)

  const users = (await demoRequest("/api/users")).users ?? []
  for (const [role, u, permissions] of [
    ["manager", DEMO.demo.manager, ["view_dashboard", "view_reports", "view_products", "view_expenses", "access_pos", "manage_sales"]],
    ["cashier", DEMO.demo.cashier, ["view_products", "access_pos", "manage_sales"]],
    ["waiter", DEMO.demo.waiter, WAITER_PERMISSIONS],
  ]) {
    if (!users.some((x) => x.email === u.email)) {
      await demoRequest("/api/users", "POST", { name: u.name, email: u.email, username: u.username, role, permissions, status: "active", password: u.password })
      console.log(`  usuario ${role}: ${u.email}`)
    }
  }

  if ((await demoRequest("/api/data/products")).items.length === 0) {
    const catalog = [
      ["Lomito completo", 38000, "comidas"], ["Milanesa napolitana", 42000, "comidas"], ["Empanada de carne", 8000, "comidas"],
      ["Pizza muzzarella", 55000, "comidas"], ["Coca-Cola 500 ml", 9000, "bebidas"], ["Agua mineral", 6000, "bebidas"],
      ["Cerveza Pilsen 1 L", 15000, "bebidas"], ["Flan casero", 12000, "postres"],
    ]
    for (const [i, [name, price, category]] of catalog.entries()) {
      await demoRequest("/api/data/products", "POST", {
        name, price, category, image: "/placeholder.svg", stock: 0, trackStock: true,
        barcode: `DEMO-${String(i + 1).padStart(4, "0")}`, description: "", isActive: true,
      })
    }
    console.log(`  productos: ${catalog.length}`)
  }

  console.log("Restaurante Demo:")
  await seedOperations(demoRequest, schema, {
    suppliers: ["Frigorífico Demo", "Bebidas Demo"],
    expenses: [["Alquiler", 2500000, "alquiler"], ["Gas", 300000, "servicios"]],
    sales: 20, days: 10,
  })

  console.log("Datos demo listos.")
} finally {
  await db.end()
}
