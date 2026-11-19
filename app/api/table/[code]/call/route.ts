import { NextRequest, NextResponse } from "next/server"
import { clientIp, findTable, locateTable, rateLimited } from "@/lib/table-access"
import { notifyStaff } from "@/lib/web-push"

export const runtime = "nodejs"
type Context = { params: Promise<{ code: string }> }

const kinds = { waiter: "llama al mozo", bill: "pide la cuenta", request: "pide" } as const

// El cliente llama al mozo o pide la cuenta desde el QR de la mesa.
// Un llamado abierto por mesa y tipo: tocar varias veces no duplica avisos.
export async function POST(request: NextRequest, { params }: Context) {
  const place = await locateTable((await params).code)
  if (!place) return NextResponse.json({ error: "Mesa no disponible." }, { status: 404 })
  const body = await request.json().catch(() => null)
  if (body?.kind !== "waiter" && body?.kind !== "bill" && body?.kind !== "request") return NextResponse.json({ error: "Tipo de llamado inválido." }, { status: 400 })
  const kind: "waiter" | "bill" | "request" = body.kind
  const note = kind === "request" && typeof body.note === "string" ? body.note.trim().replace(/\s+/g, " ").slice(0, 140) : ""
  if (kind === "request" && !note) return NextResponse.json({ error: "Escribí qué necesitás." }, { status: 400 })
  if (rateLimited(`call:${clientIp(request.headers)}:${place.code}`, 6, 60_000)) {
    return NextResponse.json({ error: "Esperá un momento antes de volver a llamar." }, { status: 429 })
  }
  const table = await findTable(place)
  if (!table) return NextResponse.json({ error: "Mesa inactiva." }, { status: 404 })
  const label = `${table.roomName} · ${table.label}`
  const inserted = kind === "request"
    ? await place.query(`INSERT INTO table_calls (table_id, table_label, kind, note) VALUES ($1, $2, 'request', $3) RETURNING id, created_at`, [table.id, label, note])
    : await place.query(`INSERT INTO table_calls (table_id, table_label, kind) VALUES ($1, $2, $3)
      ON CONFLICT (table_id, kind) WHERE status = 'open' AND kind IN ('waiter', 'bill', 'order') DO NOTHING RETURNING id, created_at`, [table.id, label, kind])
  const call = inserted.rows[0] ?? (await place.query("SELECT id, created_at FROM table_calls WHERE table_id = $1 AND kind = $2 AND status = 'open'", [table.id, kind])).rows[0]
  if (inserted.rows[0]) {
    void notifyStaff(place.query, { title: kind === "request" ? `${table.label} pide: ${note}` : `${table.label} ${kinds[kind]}`, body: `${table.roomName}${table.orderId ? ` · orden #${table.orderId}` : ""}`, url: "/orders", tag: `table-call-${table.id}-${kind}${kind === "request" ? `-${inserted.rows[0].id}` : ""}` })
  }
  return NextResponse.json({ call: { id: Number(call.id), kind, createdAt: new Date(call.created_at).toISOString(), repeated: !inserted.rows[0] } }, { status: inserted.rows[0] ? 201 : 200 })
}
