import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

interface RucResponse {
  code: number
  name: string
  status: string
  biller: string
}

export async function GET(request: NextRequest) {
  const cleanRuc = (request.nextUrl.searchParams.get("ruc") ?? "").replace(/\D/g, "")
  if (cleanRuc.length < 6 || cleanRuc.length > 9) {
    return NextResponse.json({ error: "Formato de RUC inválido." }, { status: 400 })
  }

  try {
    const response = await fetch(`https://cnid.com.py/set/ruc.php?ruc=${cleanRuc}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })
    if (!response.ok) {
      return NextResponse.json({ error: "No se pudo consultar el RUC. Podés ingresar el nombre manualmente." }, { status: 502 })
    }
    const data = await response.json() as RucResponse
    if (data.code !== 200 || typeof data.name !== "string" || !data.name.trim()) {
      return NextResponse.json({ error: "RUC no encontrado o inválido." }, { status: 404 })
    }
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: "Consulta de RUC no disponible. Podés ingresar el nombre manualmente." }, { status: 503 })
  }
}
