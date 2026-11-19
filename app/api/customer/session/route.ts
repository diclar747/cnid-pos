import { NextRequest, NextResponse } from "next/server"
import { AccountError, claimGuest, createGuest, endSession, getCustomer, loginAccount, registerAccount, renewSession, startSession, updateAccount } from "@/lib/customer-account"
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
  const body = await request.json().catch(() => null)
  // Invitado: al escanear el QR se entra directo. Si ya tiene sesión, se mantiene y se renueva.
  // Límite propio y amplio: muchos clientes del mismo local comparten el Wi-Fi (misma IP).
  if (body?.mode === "guest") {
    const current = await getCustomer(request)
    if (current) {
      const response = NextResponse.json({ account: current })
      await renewSession(request, response)
      return response
    }
    if (rateLimited(`customer-guest:${clientIp(request.headers)}`, 120, 10 * 60_000)) return NextResponse.json({ error: "Demasiados intentos. Probá en unos minutos." }, { status: 429 })
  } else if (rateLimited(`customer-auth:${clientIp(request.headers)}`, 12, 10 * 60_000)) return NextResponse.json({ error: "Demasiados intentos. Probá en unos minutos." }, { status: 429 })
  try {
    if (body?.mode === "guest") {
      const guest = await createGuest()
      const response = NextResponse.json({ account: guest }, { status: 201 })
      await startSession(response, guest.id)
      return response
    }
    if (body?.mode === "claim") {
      const current = await getCustomer(request)
      if (!current?.isGuest) return NextResponse.json({ error: "Tu cuenta ya está guardada." }, { status: 409 })
      return NextResponse.json({ account: await claimGuest(current.id, body) })
    }
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
