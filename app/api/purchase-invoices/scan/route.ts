import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"
import { db } from "@/lib/db"
import { NiroError, niroConfigured, niroVisionExtract } from "@/lib/niro"
import { scannedDraft } from "@/lib/purchase-invoices"

export const runtime = "nodejs"
export const maxDuration = 120

const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"])

/** Lee una factura de compra (foto o PDF) con Niro IA y devuelve el borrador para revisar y guardar. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "manage_purchases")) return NextResponse.json({ error: "Sin permiso para registrar compras." }, { status: 403 })
  if (!niroConfigured()) return NextResponse.json({ error: "La lectura con IA no está configurada en el servidor (falta NIRO_API_KEY)." }, { status: 503 })
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "Subí la foto o el PDF de la factura." }, { status: 400 })
  if (!allowed.has(file.type)) return NextResponse.json({ error: "Formato no admitido: subí una foto (JPG, PNG, WEBP) o un PDF." }, { status: 415 })
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "El archivo supera 12 MB." }, { status: 413 })
  try {
    const result = await niroVisionExtract(Buffer.from(await file.arrayBuffer()), file.name || "factura", file.type, "invoice")
    if (!result.data || typeof result.data !== "object") {
      return NextResponse.json({ error: file.type === "application/pdf"
        ? "No se pudo leer el PDF. Si es un PDF escaneado (imagen), subí una foto o captura de la factura."
        : "No se pudo interpretar la factura. Probá con una foto más nítida y completa." }, { status: 422 })
    }
    const draft = await scannedDraft(db, result.data)
    return NextResponse.json({ draft, model: result.model, latencyMs: result.latencyMs })
  } catch (error) {
    // 401/402 de Niro no son de la sesión del usuario: se informan como 502 para no cerrar su sesión.
    if (error instanceof NiroError) return NextResponse.json({ error: error.message }, { status: error.status === 503 ? 503 : 502 })
    console.error("Invoice scan failed", error)
    return NextResponse.json({ error: "No se pudo leer la factura." }, { status: 500 })
  }
}
