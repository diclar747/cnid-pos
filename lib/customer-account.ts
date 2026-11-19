import "server-only"

import { createHash, randomBytes } from "node:crypto"
import type { NextRequest, NextResponse } from "next/server"
import { authDb } from "./db"
import { hashPassword, verifyPassword } from "./auth"
import { normalizePhone } from "./service-order-server"

// Cuenta del cliente (consumidor) del marketplace: sesión propia, separada de la del personal del restaurante.

export const CUSTOMER_COOKIE = "restopos_customer"
// La sesión del cliente queda abierta (400 días, el máximo que aceptan los navegadores) y se renueva cada vez que vuelve.
const MAX_AGE = 60 * 60 * 24 * 400

export class AccountError extends Error {
  status: number
  constructor(message: string, status = 400) { super(message); this.status = status }
}

export type CustomerAccount = { id: number; name: string; phone: string; email: string; address: string; createdAt: string; isGuest: boolean }
const mapAccount = (row: any): CustomerAccount => ({ id: Number(row.id), name: row.name, phone: row.phone ?? "", email: row.email ?? "", address: row.address ?? "",
  createdAt: new Date(row.created_at).toISOString(), isGuest: Boolean(row.is_guest) })

/** Invitado: identidad creada al escanear el QR, sin registrarse (queda en la cookie de ese teléfono). */
export async function createGuest(name?: unknown) {
  const label = clean(name, 120) || "Invitado"
  const row = (await authDb.query("INSERT INTO public.customer_accounts (name, is_guest) VALUES ($1, TRUE) RETURNING *", [label])).rows[0]
  return mapAccount(row)
}

/** El invitado guarda su cuenta con teléfono y contraseña (conserva sus pedidos). */
export async function claimGuest(accountId: number, body: any) {
  const name = clean(body?.name, 120)
  const phone = normalizePhone(body?.phone)
  if (name.length < 2) throw new AccountError("Escribí tu nombre.")
  if (!phone || phone.length < 9) throw new AccountError("Escribí un teléfono válido (con WhatsApp).")
  const password = validPassword(body?.password)
  const taken = (await authDb.query("SELECT id FROM public.customer_accounts WHERE phone = $1 AND id <> $2", [phone, accountId])).rows[0]
  if (taken) throw new AccountError("Ya hay una cuenta con ese teléfono. Ingresá con tu contraseña.", 409)
  const row = (await authDb.query(`UPDATE public.customer_accounts SET name = $2, phone = $3, password_hash = $4, is_guest = FALSE, updated_at = NOW()
    WHERE id = $1 RETURNING *`, [accountId, name, phone, hashPassword(password)])).rows[0]
  return mapAccount(row)
}
const hash = (token: string) => createHash("sha256").update(token).digest("hex")
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : ""

function validPassword(value: unknown) {
  if (typeof value !== "string" || value.length < 6 || value.length > 200) throw new AccountError("La contraseña debe tener al menos 6 caracteres.")
  return value
}

export async function registerAccount(body: any) {
  const name = clean(body?.name, 120)
  const phone = normalizePhone(body?.phone)
  if (name.length < 2) throw new AccountError("Escribí tu nombre.")
  if (!phone || phone.length < 9) throw new AccountError("Escribí un teléfono válido (con WhatsApp).")
  const password = validPassword(body?.password)
  const created = await authDb.query(`INSERT INTO public.customer_accounts (name, phone, password_hash) VALUES ($1,$2,$3)
    ON CONFLICT (phone) DO NOTHING RETURNING *`, [name, phone, hashPassword(password)])
  if (!created.rows[0]) throw new AccountError("Ya hay una cuenta con ese teléfono. Ingresá con tu contraseña.", 409)
  return mapAccount(created.rows[0])
}

export async function loginAccount(body: any) {
  const phone = normalizePhone(body?.phone)
  const row = phone ? (await authDb.query("SELECT * FROM public.customer_accounts WHERE phone = $1", [phone])).rows[0] : null
  if (!row || !row.password_hash || typeof body?.password !== "string" || !verifyPassword(body.password, row.password_hash)) throw new AccountError("Teléfono o contraseña incorrectos.", 401)
  await authDb.query("UPDATE public.customer_accounts SET last_login_at = NOW() WHERE id = $1", [row.id])
  return mapAccount(row)
}

/** Renueva la sesión del cliente que vuelve (no se cierra sola, solo si el cliente sale). */
export async function renewSession(request: NextRequest, response: NextResponse) {
  const token = request.cookies.get(CUSTOMER_COOKIE)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return
  const renewed = await authDb.query("UPDATE public.customer_sessions SET expires_at = NOW() + make_interval(secs => $2) WHERE token_hash = $1 AND expires_at > NOW()", [hash(token), MAX_AGE])
  if (renewed.rowCount) response.cookies.set(CUSTOMER_COOKIE, token, { httpOnly: true, secure: process.env.SESSION_COOKIE_SECURE === "true", sameSite: "lax", path: "/", maxAge: MAX_AGE })
}

export async function startSession(response: NextResponse, accountId: number) {
  const token = randomBytes(32).toString("hex")
  await authDb.query("INSERT INTO public.customer_sessions (token_hash, account_id, expires_at) VALUES ($1,$2,NOW() + make_interval(secs => $3))", [hash(token), accountId, MAX_AGE])
  response.cookies.set(CUSTOMER_COOKIE, token, { httpOnly: true, secure: process.env.SESSION_COOKIE_SECURE === "true", sameSite: "lax", path: "/", maxAge: MAX_AGE })
}

export async function endSession(request: NextRequest, response: NextResponse) {
  const token = request.cookies.get(CUSTOMER_COOKIE)?.value
  if (token && /^[a-f0-9]{64}$/.test(token)) await authDb.query("DELETE FROM public.customer_sessions WHERE token_hash = $1", [hash(token)])
  response.cookies.set(CUSTOMER_COOKIE, "", { httpOnly: true, secure: process.env.SESSION_COOKIE_SECURE === "true", sameSite: "lax", path: "/", maxAge: 0 })
}

/** Cliente con sesión iniciada, o null. */
export async function getCustomer(request: NextRequest | { cookies: { get: (name: string) => { value: string } | undefined } }): Promise<CustomerAccount | null> {
  const token = request.cookies.get(CUSTOMER_COOKIE)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
  const row = (await authDb.query(`SELECT a.* FROM public.customer_sessions s JOIN public.customer_accounts a ON a.id = s.account_id
    WHERE s.token_hash = $1 AND s.expires_at > NOW()`, [hash(token)])).rows[0]
  return row ? mapAccount(row) : null
}

export async function updateAccount(accountId: number, body: any) {
  const name = clean(body?.name, 120)
  if (name.length < 2) throw new AccountError("Escribí tu nombre.")
  const address = clean(body?.address, 300)
  const email = clean(body?.email, 160)
  if (email && !email.includes("@")) throw new AccountError("Email inválido.")
  const values: unknown[] = [accountId, name, address, email]
  let password = ""
  if (body?.newPassword) {
    const current = (await authDb.query("SELECT password_hash FROM public.customer_accounts WHERE id = $1", [accountId])).rows[0]
    if (!current?.password_hash || typeof body?.currentPassword !== "string" || !verifyPassword(body.currentPassword, current.password_hash)) throw new AccountError("La contraseña actual no coincide.")
    values.push(hashPassword(validPassword(body.newPassword)))
    password = ", password_hash = $5"
  }
  const row = (await authDb.query(`UPDATE public.customer_accounts SET name = $2, address = $3, email = $4${password}, updated_at = NOW() WHERE id = $1 RETURNING *`, values)).rows[0]
  return mapAccount(row)
}
