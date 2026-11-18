import "server-only"

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import type { NextRequest } from "next/server"
import { authDb } from "./db"

export const SESSION_COOKIE = "cnidpos_session"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export interface SessionUser {
  id: string
  name: string
  email: string
  username: string
  role: "superadmin" | "admin" | "manager" | "cashier" | "waiter"
  permissions: string[]
  isActive: boolean
  restaurantId: string | null
  restaurantName: string | null
  avatarData: string
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, originalHex] = stored.split(":")
  if (!salt || !originalHex) return false
  const original = Buffer.from(originalHex, "hex")
  if (original.length !== 64) return false
  const candidate = scryptSync(password, salt, original.length)
  return timingSafeEqual(original, candidate)
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function publicUser(row: Record<string, unknown>): SessionUser {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    username: String(row.username),
    role: row.role as SessionUser["role"],
    permissions: Array.isArray(row.permissions) ? row.permissions as string[] : [],
    isActive: row.is_active === true,
    restaurantId: row.restaurant_id == null ? null : String(row.restaurant_id),
    restaurantName: row.restaurant_name == null ? null : String(row.restaurant_name),
    avatarData: typeof row.avatar_data === "string" ? row.avatar_data : "",
  }
}

export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null

  const result = await authDb.query(
    `SELECT u.id, u.name, u.email, u.username, u.role, u.permissions, u.is_active,
            u.restaurant_id, u.avatar_data, r.name AS restaurant_name
       FROM public.app_sessions s JOIN public.app_users u ON u.id = s.user_id
       LEFT JOIN public.restaurants r ON r.id = u.restaurant_id
      WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_active = TRUE
        AND (u.role = 'superadmin' OR r.status = 'active')`,
    [hashToken(token)],
  )
  return result.rows[0] ? publicUser(result.rows[0]) : null
}

export function hasPermission(user: SessionUser, permission: string): boolean {
  return user.role === "superadmin" ? permission === "manage_restaurants" : user.permissions.includes(permission)
}

/** Meseros (take_orders) y cajeros (manage_sales) pueden abrir cuentas, enviar a cocina e imprimir precuentas. */
export function canTakeOrders(user: SessionUser): boolean {
  return hasPermission(user, "access_pos") && (hasPermission(user, "take_orders") || hasPermission(user, "manage_sales"))
}
