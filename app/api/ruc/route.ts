import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// Consulta de RUC o cédula (Paraguay): devuelve el nombre completo y el RUC con su dígito verificador para el ticket.
// Fuente principal: oietema.com; respaldo: cnid.com.py.

type Found = { code: 200; name: string; legalName: string; status: string; biller: string; ruc: string }

/** «APELLIDOS, NOMBRES» → «NOMBRES APELLIDOS» (personas); las empresas quedan igual. */
const naturalName = (value: string) => {
  const [last, first] = value.split(",").map((part) => part.trim())
  return first && last ? `${first} ${last}` : value.trim()
}

async function fromOietema(base: string): Promise<Found | null | "missing"> {
  const response = await fetch(`https://oietema.com/ruc/?ruc=${base}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000), cache: "no-store" })
  // Un RUC inexistente vuelve con estado de error pero con el mensaje en JSON.
  if (response.status >= 500) return null
  const data = await response.json().catch(() => null) as { razon_social?: string; ruc?: string; estado?: string; mensaje?: string; success?: boolean } | null
  if (!data) return null
  if (typeof data.razon_social === "string" && data.razon_social.trim()) {
    return { code: 200, name: naturalName(data.razon_social), legalName: data.razon_social.trim(), status: String(data.estado ?? "").toUpperCase() || "ACTIVO",
      biller: "", ruc: typeof data.ruc === "string" && /^\d{3,9}-\d$/.test(data.ruc) ? data.ruc : base }
  }
  return data.mensaje || data.success === false ? "missing" : null
}

async function fromCnid(base: string): Promise<Found | null> {
  const response = await fetch(`https://cnid.com.py/set/ruc.php?ruc=${base}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000), cache: "no-store" })
  if (!response.ok) return null
  const data = await response.json().catch(() => null) as { code?: number; name?: string; status?: string; biller?: string } | null
  if (!data || data.code !== 200 || typeof data.name !== "string" || !data.name.trim()) return null
  return { code: 200, name: naturalName(data.name), legalName: data.name.trim(), status: String(data.status ?? ""), biller: String(data.biller ?? ""), ruc: base }
}

export async function GET(request: NextRequest) {
  // Acepta cédula o RUC con o sin dígito verificador (3626142 o 3626142-4).
  const raw = (request.nextUrl.searchParams.get("ruc") ?? "").trim()
  const base = raw.split("-")[0].replace(/\D/g, "")
  if (base.length < 5 || base.length > 9) return NextResponse.json({ error: "Escribí un RUC o cédula válido (solo números)." }, { status: 400 })
  let missing = false
  try {
    const found = await fromOietema(base)
    if (found && found !== "missing") return NextResponse.json({ success: true, data: found })
    missing = found === "missing"
  } catch { /* se intenta con el respaldo */ }
  try {
    const found = await fromCnid(base)
    if (found) return NextResponse.json({ success: true, data: found })
  } catch { /* sin respaldo disponible */ }
  return missing
    ? NextResponse.json({ error: "Ese RUC o cédula no figura en la SET. Podés escribir el nombre a mano." }, { status: 404 })
    : NextResponse.json({ error: "Consulta de RUC no disponible ahora. Podés escribir el nombre a mano." }, { status: 503 })
}
