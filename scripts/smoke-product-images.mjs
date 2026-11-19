// Prueba de fotos de productos y de grupos de opciones compartidos:
// subir en base64 (también con saltos de línea), servir la foto pública, rechazar lo que no es imagen,
// bloquear direcciones de la red local (también dentro de enlaces de Google Imágenes) y cambiar un grupo en todos los productos.
// Requiere la app corriendo (POS_ORIGIN, por defecto http://127.0.0.1:3000) y la base local con De la Casa.
import fs from "node:fs/promises"
import { randomBytes, scryptSync } from "node:crypto"
import { deflateSync } from "node:zlib"
import pg from "pg"

const origin = process.env.POS_ORIGIN ?? "http://127.0.0.1:3000"
const env = await fs.readFile(".env.local", "utf8").catch(() => "")
const db = new pg.Client({ connectionString: process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() })
await db.connect()
const check = (condition, message) => { if (!condition) throw new Error(message) }
let cookie = ""
const api = async (path, method = "GET", body) => {
  const response = await fetch(origin + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const token = response.headers.get("set-cookie")?.split(";")[0]
  if (token) cookie = token
  return { status: response.status, body: await response.json().catch(() => ({})) }
}
const hash = (password) => { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}` }
// PNG de 2×2 válido (con CRC) para no depender de archivos.
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (buf) => { let c = 0xffffffff; for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]) }
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", Buffer.from([0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0])), chunk("IDAT", deflateSync(Buffer.from([0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 255, 255, 0]))), chunk("IEND", Buffer.alloc(0))])

const suffix = randomBytes(4).toString("hex")
const created = { users: [], products: [], images: [] }
try {
  const user = await db.query(`INSERT INTO public.app_users (email, username, name, role, permissions, password_hash, restaurant_id) VALUES ($1,$2,'Fotos prueba','admin',$3,$4,1) RETURNING id`,
    [`fotos-${suffix}@prueba.test`, `fotos_${suffix}`, ["access_pos", "manage_products"], hash("Prueba-2026!")])
  created.users.push(Number(user.rows[0].id))
  check((await api("/api/product-images", "POST", { dataUrl: "data:image/png;base64,AAAA" })).status === 401, "Sin sesión se pudo subir una imagen")
  check((await api("/api/auth/login", "POST", { email: `fotos-${suffix}@prueba.test`, password: "Prueba-2026!" })).status === 200, "Login")

  // 1. Base64 pegado (con saltos de línea, como viene de un buscador).
  const base64 = png.toString("base64").replace(/(.{20})/g, "$1\n")
  const uploaded = await api("/api/product-images", "POST", { dataUrl: `data:image/png;base64,${base64}` })
  check(uploaded.status === 201 && /^\/api\/product-images\/1\/[a-f0-9]{24}$/.test(uploaded.body.url) && uploaded.body.mime === "image/png", `Subida base64: ${uploaded.status} ${JSON.stringify(uploaded.body)}`)
  created.images.push(uploaded.body.id)
  const served = await fetch(origin + uploaded.body.url)
  const bytes = Buffer.from(await served.arrayBuffer())
  check(served.status === 200 && served.headers.get("content-type") === "image/png" && bytes.equals(png), "La foto no se sirve igual a la subida")
  check(/immutable/.test(served.headers.get("cache-control") ?? "") && served.headers.get("x-content-type-options") === "nosniff", "Faltan encabezados de la foto")
  check((await fetch(`${origin}/api/product-images/1/${"0".repeat(24)}`)).status === 404, "Foto inexistente no da 404")
  console.log("✓ Foto en base64: se guarda aparte y se sirve pública")

  // 2. Reemplazo (versión reducida) borra la anterior.
  const replaced = await api("/api/product-images", "POST", { dataUrl: `data:image/png;base64,${png.toString("base64")}`, replace: uploaded.body.id })
  check(replaced.status === 201, "Reemplazo de foto")
  created.images.push(replaced.body.id)
  check((await fetch(origin + uploaded.body.url)).status === 404, "El reemplazo no borró la foto anterior")
  console.log("✓ Reemplazo de foto")

  // 3. Lo que no es imagen se rechaza aunque diga image/png.
  const fake = await api("/api/product-images", "POST", { dataUrl: `data:image/png;base64,${Buffer.from("<svg onload=alert(1)>").toString("base64")}` })
  check(fake.status === 400, `Se aceptó algo que no es imagen: ${fake.status}`)
  check((await api("/api/product-images", "POST", { url: "javascript:alert(1)" })).status === 400, "Se aceptó una dirección javascript:")
  console.log("✓ Rechaza archivos que no son imágenes")

  // 4. Direcciones de la red local bloqueadas (directas, por nombre y dentro de enlaces de Google Imágenes).
  for (const url of ["http://127.0.0.1:3100/brand/restopos-icon-192.png", "http://localhost:5433/", "http://[::1]/", "http://10.0.0.1/a.png", "http://169.254.169.254/latest/meta-data/",
    `https://www.google.com/imgres?imgurl=${encodeURIComponent("http://192.168.1.1/foto.jpg")}&imgrefurl=x`]) {
    const blocked = await api("/api/product-images", "POST", { url })
    check(blocked.status === 400 && /pública/.test(blocked.body.error ?? ""), `No se bloqueó ${url}: ${blocked.status} ${JSON.stringify(blocked.body)}`)
  }
  console.log("✓ Bloquea direcciones de la red local (también en enlaces de Google)")

  // 5. Grupo de opciones compartido: pasar a «elige varias» y quitar de todos los productos.
  const group = `Guarnición prueba ${suffix}`
  const base = { category: "Pruebas fotos", stock: 0, trackStock: false, description: "", isActive: true, image: replaced.body.url }
  for (const n of [1, 2]) {
    const saved = await api("/api/data/products", "POST", { ...base, name: `Plato ${n} ${suffix}`, price: 20000, barcode: `FOTO-${suffix}-${n}`,
      modifierGroups: [{ legacyId: 900000000 + n, name: group, required: false, multiple: false, options: [{ legacyId: 910000000 + n, name: "Arroz", price: 0 }, { legacyId: 920000000 + n, name: "Puré", price: 3000 }] },
        { legacyId: 930000000 + n, name: `Otro ${suffix}`, required: false, multiple: false, options: [{ legacyId: 940000000 + n, name: "Pan", price: 0 }] }] })
    check(saved.status === 201, `Crear producto: ${saved.status} ${JSON.stringify(saved.body)}`)
    created.products.push(Number(saved.body.item.id))
  }
  const listed = await api("/api/product-groups")
  const row = listed.body.groups?.find((entry) => entry.name === group)
  check(row && row.products === 2 && row.multiple === false, `Listado de grupos: ${JSON.stringify(row)}`)
  const changed = await api("/api/product-groups", "PATCH", { name: group, multiple: true })
  check(changed.status === 200 && changed.body.updated === 2, `Cambiar grupo: ${JSON.stringify(changed.body)}`)
  const after = (await db.query("SELECT data->'modifierGroups' AS groups, data->>'image' AS image FROM products WHERE id = ANY($1)", [created.products])).rows
  check(after.every((r) => r.groups[0].name === group && r.groups[0].multiple === true && r.groups[1].multiple === false && r.groups[0].options.length === 2), "El cambio no quedó bien (o tocó otro grupo)")
  check(after.every((r) => r.image === replaced.body.url), "La foto del producto no quedó guardada")
  const removed = await api("/api/product-groups", "PATCH", { name: group, remove: true })
  check(removed.body.updated === 2, "Quitar grupo")
  const left = (await db.query("SELECT data->'modifierGroups' AS groups FROM products WHERE id = ANY($1)", [created.products])).rows
  check(left.every((r) => r.groups.length === 1 && r.groups[0].name === `Otro ${suffix}`), "Quitar el grupo borró otros grupos")
  console.log("✓ Grupo de opciones: «elige varias» y quitar en todos los productos")
  console.log("Prueba de fotos y opciones: OK")
} finally {
  for (const id of created.products) await db.query("DELETE FROM products WHERE id = $1", [id])
  for (const id of created.images) await db.query("DELETE FROM product_images WHERE id = $1", [id])
  for (const id of created.users) { await db.query("DELETE FROM public.app_sessions WHERE user_id = $1", [id]).catch(() => undefined); await db.query("DELETE FROM public.app_users WHERE id = $1", [id]) }
  await db.end()
}
