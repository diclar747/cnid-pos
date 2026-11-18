"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Camera, KeyRound, Save, ShieldCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ProtectedRoute from "@/app/components/protected-route"
import { useAuth } from "@/app/context/auth-context"
import { apiRequest } from "@/lib/api-client"
import toast from "react-hot-toast"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [avatarData, setAvatarData] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name); setEmail(user.email); setUsername(user.username); setAvatarData(user.avatarData)
  }, [user])

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 500_000) {
      toast.error("Elegí PNG, JPG o WebP de hasta 500 KB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setAvatarData(String(reader.result ?? ""))
    reader.readAsDataURL(file)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) { toast.error("Las nuevas contraseñas no coinciden."); return }
    setSaving(true)
    try {
      await apiRequest("/api/profile", { method: "PATCH", body: JSON.stringify({ name, email, username, avatarData, currentPassword, newPassword }) })
      await refreshUser()
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
      toast.success("Perfil actualizado.")
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo guardar el perfil.") }
    finally { setSaving(false) }
  }

  return <ProtectedRoute><main className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/70 to-cyan-50 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:p-8">
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-5 gap-2"><ArrowLeft className="h-4 w-4" />Volver</Button>
      <div className="mb-7 rounded-3xl bg-gradient-to-r from-indigo-700 via-violet-700 to-sky-600 p-7 text-white shadow-xl sm:p-9">
        <div className="flex flex-wrap items-center gap-5">
          {avatarData ? <img src={avatarData} alt="Avatar de perfil" className="h-20 w-20 rounded-2xl border-2 border-white/60 object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold">{user?.name?.slice(0, 1) || "U"}</div>}
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">Mi cuenta</p><h1 className="text-3xl font-bold">{user?.name}</h1><p className="mt-1 text-sm text-indigo-100">{user?.restaurantName ?? "Administración general"} · {user?.role === "superadmin" ? "Superadministrador" : user?.role === "admin" ? "Administrador" : user?.role === "manager" ? "Gerente" : "Cajero"}</p></div>
        </div>
      </div>
      <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-2xl border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserRound className="h-5 w-5 text-indigo-600" />Datos personales</CardTitle></CardHeader><CardContent className="space-y-4">
          <div><Label htmlFor="profile-name">Nombre completo</Label><Input id="profile-name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label htmlFor="profile-email">Email</Label><Input id="profile-email" className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label htmlFor="profile-user">Usuario</Label><Input id="profile-user" className="mt-1" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
          <div><Label htmlFor="profile-avatar" className="flex items-center gap-2"><Camera className="h-4 w-4" />Foto de perfil</Label><Input id="profile-avatar" className="mt-1" type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar} /><p className="mt-1 text-xs text-muted-foreground">PNG, JPG o WebP · máximo 500 KB</p>{avatarData && <Button type="button" variant="link" className="h-7 px-0" onClick={() => setAvatarData("")}>Quitar foto</Button>}</div>
        </CardContent></Card>
        <div className="space-y-5"><Card className="rounded-2xl border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5 text-violet-600" />Seguridad</CardTitle></CardHeader><CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Para cambiar la contraseña, ingresá la actual y una nueva de al menos 10 caracteres.</p>
          <div><Label htmlFor="profile-current">Contraseña actual</Label><Input id="profile-current" className="mt-1" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" /></div>
          <div><Label htmlFor="profile-new">Nueva contraseña</Label><Input id="profile-new" className="mt-1" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></div>
          <div><Label htmlFor="profile-confirm">Confirmar nueva contraseña</Label><Input id="profile-confirm" className="mt-1" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" /></div>
        </CardContent></Card><div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900"><ShieldCheck className="mb-2 h-5 w-5" />Tus permisos y restaurante se gestionan desde la administración. La foto, los datos personales y la contraseña se actualizan aquí.</div><Button disabled={saving} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"><Save className="h-4 w-4" />{saving ? "Guardando…" : "Guardar perfil"}</Button></div>
      </form>
    </div>
  </main></ProtectedRoute>
}
