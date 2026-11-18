import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { paymentRow } from "@/lib/cash"
import { cleanText } from "@/lib/service-order-server"
import { revertAccountPayment } from "@/lib/credit"

export const runtime = "nodejs"
type Context = { params: Promise<{ id: string }> }

// Verificar una transferencia o pago QR: solo una persona de caja puede confirmarlo o rechazarlo.
export async function PATCH(request: NextRequest, { params }: Context) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_sales")) return NextResponse.json({ error: "Solo caja puede verificar pagos." }, { status: 403 })
  const id = Number((await params).id)
  const body = await request.json().catch(() => null)
  if (!Number.isSafeInteger(id) || id <= 0 || (body?.action !== "confirm" && body?.action !== "reject")) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 })
  }
  const note = cleanText(body.note, 200)
  if (body.action === "reject" && !note) return NextResponse.json({ error: "Indicá por qué se rechaza el pago." }, { status: 400 })
  const reference = cleanText(body.reference, 80)
  const client = await db.connect()
  try {
    await client.query("BEGIN")
    const updated = await client.query(`UPDATE payments SET status = $2, verified_by = $3, verified_by_name = $4, verified_at = NOW(), verify_note = $5,
      reference = CASE WHEN $6 = '' THEN reference ELSE $6 END WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id, body.action === "confirm" ? "confirmed" : "rejected", Number(user.id), user.name, note, reference])
    const payment = updated.rows[0]
    if (!payment) { await client.query("ROLLBACK"); return NextResponse.json({ error: "El pago ya fue verificado o no existe." }, { status: 409 }) }
    // Con pago dividido, la venta queda rechazada si algún pago se rechazó, pendiente si falta verificar alguno.
    if (payment.sale_id) await client.query(`UPDATE sales SET data = data || jsonb_build_object('paymentStatus', (
        SELECT CASE WHEN bool_or(status = 'rejected') THEN 'rejected' WHEN bool_or(status = 'pending') THEN 'pending' ELSE 'confirmed' END
        FROM payments WHERE sale_id = $1 AND purpose = 'sale')), updated_at = NOW() WHERE id = $1`, [payment.sale_id])
    if (payment.purpose === "account" && payment.status === "rejected" && payment.customer_id) {
      await revertAccountPayment(client, { id: Number(payment.id), customerId: Number(payment.customer_id), amount: Number(payment.amount), methodName: payment.method_name }, note, user)
    }
    await client.query("COMMIT")
    return NextResponse.json({ payment: paymentRow(payment) })
  } catch (cause) {
    await client.query("ROLLBACK").catch(() => undefined)
    console.error("Payment verification failed", cause)
    return NextResponse.json({ error: "No se pudo verificar el pago." }, { status: 500 })
  } finally { client.release() }
}
