import "server-only"

export function userRecord(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    username: String(row.username),
    role: String(row.role),
    permissions: row.permissions,
    status: row.is_active ? "active" : "inactive",
    lastLogin: row.last_login ? new Date(String(row.last_login)).toISOString() : "",
    createdAt: new Date(String(row.created_at)).toISOString(),
  }
}

export function validateUser(body: unknown, requirePassword: boolean) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Datos de usuario inválidos.")
  const input = body as Record<string, unknown>
  const name = typeof input.name === "string" ? input.name.trim() : ""
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  const username = typeof input.username === "string" ? input.username.trim() : ""
  const role = input.role
  const password = typeof input.password === "string" ? input.password : ""
  const status = input.status
  const permissions = input.permissions

  if (!name || !email.includes("@") || !username || !["admin", "manager", "cashier", "waiter"].includes(String(role))) {
    throw new Error("Completá nombre, email, usuario y rol.")
  }
  if (requirePassword && password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.")
  if (password && password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.")
  if (!Array.isArray(permissions) || !permissions.every((item) => typeof item === "string")) {
    throw new Error("Los permisos no son válidos.")
  }
  return { name, email, username, role, password, isActive: status !== "inactive", permissions }
}
