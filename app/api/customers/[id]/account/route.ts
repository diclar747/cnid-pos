import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { accountSummary, adjustAccount, CreditError, recordAccountPayment } from "@/lib/credit"
import { mapCustomer } from "@/lib/customer-records"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

async function customerId(params: Context["params"]) {
  const id = Number((await params).id)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

// Cuenta corriente: saldo, período de cobro actual y movimientos.
export async function GET(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const id = await customerId(params)
  if (!id) return NextResponse.json({ error: "Cliente inválido." }, { status: 400 })
  try {
    return NextResponse.json({ account: await accountSummary(db, id) })
  } catch (error) {
    if (error instanceof CreditError) return NextResponse.json({ error: error.message }, { status: error.status })
    throw error
  }
}

// Abono (entra en la caja abierta) o ajuste manual del saldo. Solo caja o administración.
export async function POST(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_sales")) return NextResponse.json({ error: "Solo caja o administración registran pagos de cuenta." }, { status: 403 })
  const id = await customerId(params)
  if (!id) return NextResponse.json({ error: "Cliente inválido." }, { status: 400 })
  const body = await request.json().catch(() => null)
  const action = body?.action
  if (action !== "payment" && action !== "adjust") return NextResponse.json({ error: "Acción inválida." }, { status: 400 })
  if (action === "adjust" && !hasPermission(user, "manage_company")) return NextResponse.json({ error: "Solo la administración ajusta saldos." }, { status: 403 })
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : ""
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const result = action === "payment"
      ? await recordAccountPayment(client, id, { method: body.method, amount: body.amount, reference: typeof body.reference === "string" ? body.reference.trim() : "", note }, user)
      : await adjustAccount(client, id, body.amount, note, user)
    await client.query("COMMIT")
    const customer = (await db.query("SELECT * FROM customers WHERE id = $1", [id])).rows[0]
    return NextResponse.json({ result, item: mapCustomer(customer), account: await accountSummary(db, id) }, { status: 201 })
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    if (error instanceof CreditError) return NextResponse.json({ error: error.message }, { status: error.status })
    throw error
  } finally {
    client.release()
  }
}
