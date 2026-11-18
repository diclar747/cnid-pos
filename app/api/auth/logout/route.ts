import { NextRequest, NextResponse } from "next/server"
import { authDb } from "@/lib/db"
import { hashToken, SESSION_COOKIE } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token) {
    await authDb.query(`DELETE FROM public.app_sessions WHERE token_hash = $1`, [hashToken(token)])
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.SESSION_COOKIE_SECURE === "true", sameSite: "strict", path: "/", maxAge: 0 })
  return response
}
