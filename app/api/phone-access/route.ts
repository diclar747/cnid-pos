import { readFile } from "node:fs/promises"
import { isIP } from "node:net"
import { resolve } from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasPermission } from "@/lib/auth"

export const runtime = "nodejs"
const privateIpv4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 })
  if (!hasPermission(user, "access_pos")) return NextResponse.json({ error: "Sin permiso." }, { status: 403 })
  try {
    const address = (await readFile(resolve(".local-cert", "address.txt"), "utf8")).trim()
    if (isIP(address) === 4 && privateIpv4.test(address)) {
      return NextResponse.json({ baseUrl: `https://${address}:3443` })
    }
  } catch { /* El acceso desde teléfono todavía no está configurado. */ }
  return NextResponse.json({ baseUrl: null })
}
