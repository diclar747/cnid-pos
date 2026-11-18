import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { canWrite, dataError, isCollection, record, tables, validateRecord } from "@/lib/local-records"

export const runtime = "nodejs"

type Context = { params: Promise<{ entity: string; id: string }> }

async function target(request: NextRequest, params: Context["params"]) {
  const { entity, id } = await params
  const numericId = Number(id)
  if (!isCollection(entity) || ["company", "sales", "purchases"].includes(entity) || !Number.isSafeInteger(numericId) || numericId <= 0) {
    return { error: NextResponse.json({ error: "Registro desconocido." }, { status: 404 }) }
  }
  const user = await getSessionUser(request)
  if (!user) return { error: NextResponse.json({ error: "Iniciá sesión." }, { status: 401 }) }
  if (!canWrite(user, entity)) return { error: NextResponse.json({ error: "Sin permiso." }, { status: 403 }) }
  return { entity, numericId, user }
}

export async function PUT(request: NextRequest, { params }: Context) {
  const result = await target(request, params)
  if (result.error) return result.error
  const { entity, numericId, user } = result

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
    const updated = await db.query(
      `UPDATE ${tables[entity]} SET data = $1::jsonb, updated_at = NOW()
       WHERE id = $2 RETURNING id, data`,
      [JSON.stringify(data), numericId],
    )
    if (!updated.rows[0]) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 })
    return NextResponse.json({ item: record(updated.rows[0]) })
  } catch (error) {
    const { message, status } = dataError(error)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const result = await target(request, params)
  if (result.error) return result.error
  const { entity, numericId } = result
  if (entity === "suppliers") {
    const client = await db.connect()
    try {
      await client.query("BEGIN")
      await client.query(`DELETE FROM auto_orders WHERE (data->>'supplierId')::bigint = $1`, [numericId])
      await client.query(`UPDATE products SET data = data - 'supplierId', updated_at = NOW() WHERE (data->>'supplierId')::bigint = $1`, [numericId])
      const deleted = await client.query(`DELETE FROM suppliers WHERE id = $1 RETURNING id`, [numericId])
      await client.query("COMMIT")
      if (!deleted.rows[0]) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 })
      return NextResponse.json({ ok: true })
    } catch (error) {
      await client.query("ROLLBACK")
      const { message, status } = dataError(error)
      return NextResponse.json({ error: message }, { status })
    } finally {
      client.release()
    }
  }
  try {
    const deleted = await db.query(`DELETE FROM ${tables[entity]} WHERE id = $1 RETURNING id`, [numericId])
    if (!deleted.rows[0]) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const { message, status } = dataError(error)
    return NextResponse.json({ error: message }, { status })
  }
}
