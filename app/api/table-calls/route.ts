import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"

// Llamados abiertos de las mesas (mozo o cuenta) para mostrar y hacer sonar en el local.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  const result = await db.query(`SELECT c.id, c.table_id, c.table_label, c.kind, c.note, c.created_at, o.id AS order_id, o.waiter_name
    FROM table_calls c LEFT JOIN service_orders o ON o.table_id = c.table_id AND o.status = 'open'
    WHERE c.status = 'open' ORDER BY c.created_at`)
  return NextResponse.json({ items: result.rows.map((row) => ({
    id: Number(row.id), tableId: Number(row.table_id), tableLabel: row.table_label, kind: row.kind, note: row.note ?? "",
    createdAt: new Date(row.created_at).toISOString(), orderId: row.order_id == null ? null : Number(row.order_id), waiterName: row.waiter_name ?? "",
  })) })
}
