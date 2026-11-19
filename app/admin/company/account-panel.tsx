"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { KeyRound, Loader2, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/app/context/auth-context"
import { StaffPushButton } from "@/app/components/table-calls-listener"
import { apiRequest } from "@/lib/api-client"

// Cuenta del dueño: cambiar la contraseña y activar o desactivar los avisos (push) en este teléfono o computadora.

export function AccountPanel() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({ current: "", next: "", confirm: "" })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    if (form.next.length < 10) { setMessage({ tone: "error", text: "La nueva contraseña debe tener al menos 10 caracteres." }); return }
    if (form.next !== form.confirm) { setMessage({ tone: "error", text: "Las nuevas contraseñas no coinciden." }); return }
    setBusy(true); setMessage(null)
    try {
      // El perfil se guarda completo: se mandan los datos actuales (nombre, email, usuario y foto) sin cambios.
      await apiRequest("/api/profile", { method: "PATCH", body: JSON.stringify({ name: user.name, email: user.email, username: user.username,
        avatarData: (user as { avatarData?: string }).avatarData ?? "", currentPassword: form.current, newPassword: form.next }) })
      await refreshUser()
      setForm({ current: "", next: "", confirm: "" })
      setMessage({ tone: "ok", text: "Contraseña cambiada." })
    } catch (problem) { setMessage({ tone: "error", text: problem instanceof Error ? problem.message : "No se pudo cambiar la contraseña." }) }
    finally { setBusy(false) }
  }

  return <div className="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />Cambiar contraseña</CardTitle>
        <CardDescription>De tu usuario {user?.email ? `(${user.email})` : ""}. Mínimo 10 caracteres.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="acc-current">Contraseña actual</Label>
            <Input id="acc-current" type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label htmlFor="acc-new">Nueva contraseña</Label>
            <Input id="acc-new" type="password" autoComplete="new-password" minLength={10} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label htmlFor="acc-confirm">Repetir la nueva contraseña</Label>
            <Input id="acc-confirm" type="password" autoComplete="new-password" minLength={10} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required /></div>
          {message && <p className={`rounded-lg px-3 py-2 text-sm ${message.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
          <Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cambiar contraseña</Button>
        </form>
      </CardContent>
    </Card>
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Notificaciones push</CardTitle>
          <CardDescription>Recibí en este teléfono o computadora los pedidos nuevos (web, QR de mesa, WhatsApp) y los llamados de mesa, aunque la app esté cerrada.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <StaffPushButton />
          <p className="text-xs text-muted-foreground">Se activa por equipo: hacelo en cada teléfono o PC donde quieras recibir avisos. En iPhone, primero agregá RestoPOS a la pantalla de inicio. Tocá el botón de nuevo para desactivarlos.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />Mi perfil</CardTitle>
          <CardDescription>Nombre, email, usuario y foto.</CardDescription></CardHeader>
        <CardContent><Button asChild variant="outline"><Link href="/profile">Editar mi perfil</Link></Button></CardContent>
      </Card>
    </div>
  </div>
}
