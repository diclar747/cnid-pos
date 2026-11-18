import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { canRead, canWrite, dataError, isCollection, record, tables, validateRecord } from "@/lib/local-records"

export const runtime = "nodejs"

type Context = { params: Promise<{ entity: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const { entity } = await params
  if (!isCollection(entity)) return NextResponse.json({ error: "Sección desconocida." }, { status: 404 })
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!canRead(user, entity)) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })

  if (entity === "company") {
    const result = await db.query(`SELECT data FROM company_config WHERE id = 1`)
    return NextResponse.json({ item: result.rows[0]?.data ?? {} })
  }
  const result = await db.query(`SELECT id, data FROM ${tables[entity]} ORDER BY id DESC`)
  return NextResponse.json({ items: result.rows.map(record) })
}

export async function POST(request: NextRequest, { params }: Context) {
  const { entity } = await params
  if (!isCollection(entity) || entity === "company") return NextResponse.json({ error: "Sección desconocida." }, { status: 404 })
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!canWrite(user, entity)) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })

  try {
    const data = validateRecord(entity, await request.json())
    if (entity === "products" && data.supplierId) {
      const supplier = await db.query(`SELECT id FROM suppliers WHERE id = $1`, [data.supplierId])
      if (!supplier.rows[0]) return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 400 })
    }
    if (entity === "expenses") {
      data.userId = Number(user.id)
      data.userName = user.name
    }
    const result = await db.query(
      `INSERT INTO ${tables[entity]} (data) VALUES ($1::jsonb) RETURNING id, data`,
      [JSON.stringify(data)],
    )
    return NextResponse.json({ item: record(result.rows[0]) }, { status: 201 })
  } catch (error) {
    const { message, status } = dataError(error)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { entity } = await params
  if (entity !== "company") return NextResponse.json({ error: "Sección desconocida." }, { status: 404 })
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!canWrite(user, entity)) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })

  try {
    const data = validateRecord(entity, await request.json())
    const result = await db.query(
      `INSERT INTO company_config (id, data) VALUES (1, $1::jsonb)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
       RETURNING data`,
      [JSON.stringify(data)],
    )
    return NextResponse.json({ item: result.rows[0].data })
  } catch (error) {
    const { message, status } = dataError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
