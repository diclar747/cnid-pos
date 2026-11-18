import { randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { cleanText } from "@/lib/service-order-server"
import type { DiningRoom, DiningTable } from "@/lib/dining-types"

export const runtime = "nodejs"

const roomRow = (row: any): DiningRoom => ({ id: Number(row.id), name: row.name, description: row.description,
  imageData: row.image_data, isActive: row.is_active })
const tableRow = (row: any): DiningTable => ({ id: Number(row.id), roomId: Number(row.room_id), roomName: row.room_name,
  label: row.label, seats: Number(row.seats), shape: row.shape, code: row.code, isActive: row.is_active && row.room_active !== false,
  openOrderId: row.open_order_id == null ? null : Number(row.open_order_id) })
const validImage = (value: unknown) => typeof value === "string" &&
  (value === "" || (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length <= 1_400_000))
const validShape = (value: unknown): value is DiningTable["shape"] => ["round", "square", "rectangular"].includes(String(value))
const idOf = (value: unknown) => { const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : null }

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos") && !hasPermission(user, "manage_company")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const compact = request.nextUrl.searchParams.get("compact") === "1"
  const [rooms, tables] = await Promise.all([
    db.query(compact ? "SELECT id,name,description,''::text AS image_data,is_active FROM dining_rooms ORDER BY id" : "SELECT * FROM dining_rooms ORDER BY id"),
    db.query(`SELECT t.*, r.name AS room_name, r.is_active AS room_active, o.id AS open_order_id FROM dining_tables t
      JOIN dining_rooms r ON r.id = t.room_id
      LEFT JOIN service_orders o ON o.table_id = t.id AND o.status = 'open'
      ORDER BY r.id, t.label`),
  ])
  return NextResponse.json({ rooms: rooms.rows.map(roomRow), tables: tables.rows.map(tableRow) })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Sin permiso para configurar salones." }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (body?.kind === "room") {
    const name = cleanText(body.name, 80)
    if (!name || !validImage(body.imageData ?? "")) return NextResponse.json({ error: "Nombre o imagen inválida (máximo 1 MB)." }, { status: 400 })
    const result = await db.query("INSERT INTO dining_rooms (name, description, image_data) VALUES ($1,$2,$3) RETURNING *",
      [name, cleanText(body.description, 300), body.imageData ?? ""])
    return NextResponse.json({ room: roomRow(result.rows[0]) }, { status: 201 })
  }
  if (body?.kind !== "table") return NextResponse.json({ error: "Tipo de registro inválido." }, { status: 400 })
  const roomId = idOf(body.roomId)
  const label = cleanText(body.label, 40)
  const seats = Number(body.seats)
  if (!roomId || !label || !Number.isSafeInteger(seats) || seats < 1 || seats > 30 || !validShape(body.shape))
    return NextResponse.json({ error: "Completá salón, mesa, sillas y forma." }, { status: 400 })
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const room = await client.query("SELECT id FROM dining_rooms WHERE id = $1 AND is_active = TRUE", [roomId])
    if (!room.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Salón no disponible." }, { status: 404 }) }
    const code = `CNID-TABLE-${randomBytes(12).toString("hex").toUpperCase()}`
    const result = await client.query("INSERT INTO dining_tables (room_id, label, seats, shape, code) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [roomId, label, seats, body.shape, code])
    await client.query("INSERT INTO public.table_directory (code, restaurant_id) VALUES ($1,$2)", [code, user.restaurantId])
    await client.query("COMMIT")
    return NextResponse.json({ table: tableRow({ ...result.rows[0], room_name: "", open_order_id: null }) }, { status: 201 })
  } catch (error: any) {
    await client.query("ROLLBACK").catch(() => undefined)
    if (error?.code === "23505") return NextResponse.json({ error: "Ya existe una mesa con ese nombre en el salón." }, { status: 409 })
    console.error("Create dining table failed", error)
    return NextResponse.json({ error: "No se pudo crear la mesa." }, { status: 500 })
  } finally { client.release() }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_company")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const body = await request.json().catch(() => null)
  const id = idOf(body?.id)
  if (!id) return NextResponse.json({ error: "Registro inválido." }, { status: 400 })
  try {
    if (body.kind === "room") {
      if (!validImage(body.imageData ?? "")) return NextResponse.json({ error: "Imagen inválida (máximo 1 MB)." }, { status: 400 })
      const name = cleanText(body.name, 80)
      if (!name) return NextResponse.json({ error: "Indicá el nombre del salón." }, { status: 400 })
      if (body.isActive === false) {
        const occupied = await db.query(`SELECT 1 FROM service_orders o JOIN dining_tables t ON t.id=o.table_id
          WHERE t.room_id=$1 AND o.status='open' LIMIT 1`, [id])
        if (occupied.rows[0]) return NextResponse.json({ error: "Cerrá las cuentas del salón antes de desactivarlo." }, { status: 409 })
      }
      const result = await db.query(`UPDATE dining_rooms SET name=$1, description=$2, image_data=$3, is_active=$4
        WHERE id=$5 RETURNING *`, [name, cleanText(body.description, 300), body.imageData ?? "", body.isActive !== false, id])
      return result.rows[0] ? NextResponse.json({ room: roomRow(result.rows[0]) }) : NextResponse.json({ error: "Salón no encontrado." }, { status: 404 })
    }
    if (body.kind === "table") {
      const roomId = idOf(body.roomId), label = cleanText(body.label, 40), seats = Number(body.seats)
      if (!roomId || !label || !Number.isSafeInteger(seats) || seats < 1 || seats > 30 || !validShape(body.shape))
        return NextResponse.json({ error: "Datos de mesa inválidos." }, { status: 400 })
      const occupied = await db.query("SELECT 1 FROM service_orders WHERE table_id=$1 AND status='open'", [id])
      if (body.isActive === false && occupied.rows[0]) return NextResponse.json({ error: "Cerrá la cuenta de la mesa antes de desactivarla." }, { status: 409 })
      const result = await db.query(`UPDATE dining_tables SET room_id=$1, label=$2, seats=$3, shape=$4, is_active=$5
        WHERE id=$6 RETURNING *`, [roomId, label, seats, body.shape, body.isActive !== false, id])
      return result.rows[0] ? NextResponse.json({ table: tableRow({ ...result.rows[0], room_name: "", open_order_id: null }) }) : NextResponse.json({ error: "Mesa no encontrada." }, { status: 404 })
    }
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 })
  } catch (error: any) {
    if (error?.code === "23505") return NextResponse.json({ error: "Ya existe esa mesa en el salón." }, { status: 409 })
    if (error?.code === "23503") return NextResponse.json({ error: "Salón no encontrado." }, { status: 404 })
    throw error
  }
}
