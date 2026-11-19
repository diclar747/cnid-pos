import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Grupos de opciones repetidos en varios productos (Guarniciones, Agregados…): verlos juntos y cambiarlos de una vez.

async function guard(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_products")) return NextResponse.json({ error: "Sin permiso para editar productos." }, { status: 403 })
  return null
}

export async function GET(request: NextRequest) {
  const denied = await guard(request); if (denied) return denied
  const rows = await db.query(`SELECT g->>'name' AS name, COUNT(*)::int AS products,
      BOOL_AND(COALESCE((g->>'multiple')::boolean, FALSE)) AS all_multiple, BOOL_OR(COALESCE((g->>'multiple')::boolean, FALSE)) AS any_multiple,
      BOOL_OR(COALESCE((g->>'required')::boolean, FALSE)) AS any_required, MAX(JSONB_ARRAY_LENGTH(COALESCE(g->'options', '[]'::jsonb)))::int AS options,
      (ARRAY_AGG((SELECT STRING_AGG(o->>'name', ', ') FROM JSONB_ARRAY_ELEMENTS(g->'options') o) ORDER BY JSONB_ARRAY_LENGTH(COALESCE(g->'options', '[]'::jsonb)) DESC))[1] AS sample
    FROM products p, JSONB_ARRAY_ELEMENTS(CASE WHEN JSONB_TYPEOF(p.data->'modifierGroups') = 'array' THEN p.data->'modifierGroups' ELSE '[]'::jsonb END) g
    GROUP BY 1 ORDER BY 2 DESC, 1`)
  return NextResponse.json({ groups: rows.rows.map((row) => ({ name: row.name, products: row.products, multiple: row.all_multiple ? true : row.any_multiple ? "mixed" : false,
    required: row.any_required, options: row.options, sample: String(row.sample ?? "").slice(0, 200) })) }, { headers: { "Cache-Control": "no-store" } })
}

// { name, multiple?: boolean, required?: boolean } cambia el grupo en todos los productos; { name, remove: true } lo quita de todos.
export async function PATCH(request: NextRequest) {
  const denied = await guard(request); if (denied) return denied
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.slice(0, 120) : ""
  if (!name.trim()) return NextResponse.json({ error: "Indicá el grupo." }, { status: 400 })
  const changes: Record<string, boolean> = {}
  if (typeof body?.multiple === "boolean") changes.multiple = body.multiple
  if (typeof body?.required === "boolean") changes.required = body.required
  if (!body?.remove && !Object.keys(changes).length) return NextResponse.json({ error: "Nada para cambiar." }, { status: 400 })
  const result = await db.query(`UPDATE products SET data = JSONB_SET(data, '{modifierGroups}', COALESCE((
      SELECT JSONB_AGG(CASE WHEN g->>'name' = $1 THEN g || $2::jsonb ELSE g END ORDER BY n)
      FROM JSONB_ARRAY_ELEMENTS(data->'modifierGroups') WITH ORDINALITY AS t(g, n) WHERE NOT ($3::boolean AND g->>'name' = $1)), '[]'::jsonb)), updated_at = NOW()
    WHERE JSONB_TYPEOF(data->'modifierGroups') = 'array' AND data->'modifierGroups' @> JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT('name', $1::text))`,
    [name, JSON.stringify(changes), body?.remove === true])
  return NextResponse.json({ updated: result.rowCount ?? 0 })
}
