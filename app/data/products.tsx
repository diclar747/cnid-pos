export interface Product {
  id: number
  name: string
  price: number
  category: string
  image: string
  stock: number
  trackStock?: boolean
  barcode: string
  description: string
  isActive: boolean
  supplierId?: number
  menuName?: string
  pricesByOrderType?: { dineIn: number; delivery: number; pickup: number }
  /** Precio promocional: si es menor al precio normal, se cobra este. */
  promoPrice?: number | null
  /** Tiempo estimado de preparación en minutos. */
  prepMinutes?: number | null
  ingredients?: string
  modifierGroups?: Array<{ legacyId: number; name: string; required: boolean; multiple: boolean; options: Array<{ legacyId: number; name: string; price: number }> }>
}

export const products: Product[] = [
  // Comidas Principales
  {
    id: 1,
    name: "Hamburguesa Clásica",
    price: 45000,
    category: "comidas",
    image: "/classic-beef-burger.png",
    stock: 25,
    barcode: "7891234567890",
    description: "Hamburguesa de carne con lechuga, tomate y queso",
    isActive: true,
  },
  {
    id: 2,
    name: "Pizza Margherita",
    price: 65000,
    category: "comidas",
    image: "/delicious-pizza.png",
    stock: 15,
    barcode: "7891234567891",
    description: "Pizza con salsa de tomate, mozzarella y albahaca",
    isActive: true,
  },
  {
    id: 3,
    name: "Ensalada Mixta",
    price: 35000,
    category: "comidas",
    image: "/vibrant-mixed-salad.png",
    stock: 20,
    barcode: "7891234567892",
    description: "Ensalada fresca con vegetales variados",
    isActive: true,
  },
  {
    id: 4,
    name: "Alitas de Pollo",
    price: 40000,
    category: "comidas",
    image: "/crispy-chicken-wings.png",
    stock: 30,
    barcode: "7891234567893",
    description: "Alitas de pollo crujientes con salsa BBQ",
    isActive: true,
  },
  {
    id: 5,
    name: "Papas Fritas",
    price: 25000,
    category: "comidas",
    image: "/crispy-french-fries.png",
    stock: 40,
    barcode: "7891234567894",
    description: "Papas fritas doradas y crujientes",
    isActive: true,
  },

  // Bebidas
  {
    id: 6,
    name: "Coca Cola",
    price: 12000,
    category: "bebidas",
    image: "/refreshing-cola.png",
    stock: 50,
    barcode: "7891234567895",
    description: "Refresco de cola 350ml",
    isActive: true,
  },
  {
    id: 7,
    name: "Té Helado",
    price: 15000,
    category: "bebidas",
    image: "/iced-tea.png",
    stock: 35,
    barcode: "7891234567896",
    description: "Té helado con limón 500ml",
    isActive: true,
  },
  {
    id: 8,
    name: "Jugo de Naranja",
    price: 18000,
    category: "bebidas",
    image: "/glass-of-orange-juice.png",
    stock: 25,
    barcode: "7891234567897",
    description: "Jugo natural de naranja 350ml",
    isActive: true,
  },
  {
    id: 9,
    name: "Café Latte",
    price: 22000,
    category: "bebidas",
    image: "/latte-coffee.png",
    stock: 30,
    barcode: "7891234567898",
    description: "Café latte con leche espumosa",
    isActive: true,
  },
  {
    id: 10,
    name: "Agua Mineral",
    price: 8000,
    category: "bebidas",
    image: "/bottled-water.png",
    stock: 60,
    barcode: "7891234567899",
    description: "Agua mineral sin gas 500ml",
    isActive: true,
  },

  // Postres
  {
    id: 11,
    name: "Torta de Chocolate",
    price: 28000,
    category: "postres",
    image: "/chocolate-cake-slice.png",
    stock: 12,
    barcode: "7891234567800",
    description: "Porción de torta de chocolate con crema",
    isActive: true,
  },
  {
    id: 12,
    name: "Cheesecake",
    price: 32000,
    category: "postres",
    image: "/cheesecake-slice.png",
    stock: 10,
    barcode: "7891234567801",
    description: "Cheesecake de frutillas",
    isActive: true,
  },
  {
    id: 13,
    name: "Helado Sundae",
    price: 24000,
    category: "postres",
    image: "/ice-cream-sundae.png",
    stock: 18,
    barcode: "7891234567802",
    description: "Helado con salsa de chocolate y crema",
    isActive: true,
  },
  {
    id: 14,
    name: "Pie de Manzana",
    price: 26000,
    category: "postres",
    image: "/apple-pie-slice.png",
    stock: 15,
    barcode: "7891234567803",
    description: "Porción de pie de manzana casero",
    isActive: true,
  },
  {
    id: 15,
    name: "Brownie",
    price: 20000,
    category: "postres",
    image: "/chocolate-brownie.png",
    stock: 22,
    barcode: "7891234567804",
    description: "Brownie de chocolate con nueces",
    isActive: true,
  },
]

export const categories = [
  { id: "all", name: "Todos", icon: "🍽️" },
  { id: "comidas", name: "Comidas", icon: "🍔" },
  { id: "bebidas", name: "Bebidas", icon: "🥤" },
  { id: "postres", name: "Postres", icon: "🍰" },
]

export const filters = [
  { id: "", name: "Todos los productos" },
  { id: "low-stock", name: "Stock bajo (< 20)" },
  { id: "out-of-stock", name: "Sin stock" },
  { id: "high-price", name: "Precio alto (> ₲30,000)" },
  { id: "popular", name: "Más populares" },
]
