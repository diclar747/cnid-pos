import { NextRequest, NextResponse } from "next/server"
import { AccountError, endSession, getCustomer, loginAccount, registerAccount, startSession, updateAccount } from "@/lib/customer-account"
import { clientIp, rateLimited } from "@/lib/table-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const failure = (error: unknown) => {
  if (error instanceof AccountError) return NextResponse.json({ error: error.message }, { status: error.status })
  throw error
}

// Cuenta del cliente: quién está conectado.
export async function GET(request: NextRequest) {
  return NextResponse.json({ account: await getCustomer(request) }, { headers: { "Cache-Control": "no-store" } })
}

// Ingresar o crear cuenta (teléfono + contraseña).
export async function POST(request: NextRequest) {
  if (rateLimited(`customer-auth:${clientIp(request.headers)}`, 12, 10 * 60_000)) return NextResponse.json({ error: "Demasiados intentos. Probá en unos minutos." }, { status: 429 })
  const body = await request.json().catch(() => null)
  try {
    const account = body?.mode === "register" ? await registerAccount(body) : await loginAccount(body)
    const response = NextResponse.json({ account }, { status: body?.mode === "register" ? 201 : 200 })
    await startSession(response, account.id)
    return response
  } catch (error) { return failure(error) }
}

// Editar perfil (nombre, dirección, email y, opcionalmente, la contraseña).
export async function PATCH(request: NextRequest) {
  const account = await getCustomer(request)
  if (!account) return NextResponse.json({ error: "Ingresá a tu cuenta." }, { status: 401 })
  try { return NextResponse.json({ account: await updateAccount(account.id, await request.json().catch(() => null)) }) }
  catch (error) { return failure(error) }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  await endSession(request, response)
  return response
}
