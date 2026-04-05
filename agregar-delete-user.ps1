# Agregar boton de eliminar usuario
Write-Host "=== Agregando eliminar usuario ===" -ForegroundColor Cyan

# ── API: eliminar usuario ────────────────────────────────────
New-Item -ItemType Directory -Force -Path "src\app\api\admin\delete-user" | Out-Null
$content = @'
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: "Falta el ID" }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: "No podes eliminar tu propio usuario" }, { status: 400 })

  const service = await createServiceClient()

  // Eliminar perfil primero
  await service.from("profiles").delete().eq("id", userId)

  // Eliminar usuario de auth
  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
'@
Set-Content -Path "src\app\api\admin\delete-user\route.ts" -Value $content
Write-Host "[OK] API delete-user" -ForegroundColor Green

# ── Boton eliminar usuario ───────────────────────────────────
$content = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"

export default function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Eliminar el usuario "${userName}"? Esta accion no se puede deshacer.`)) return
    setLoading(true)
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setLoading(false); return }
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 rounded px-2 py-1 transition-colors disabled:opacity-50"
      title={`Eliminar ${userName}`}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
    </button>
  )
}
'@
Set-Content -Path "src\app\usuarios\DeleteUserButton.tsx" -Value $content
Write-Host "[OK] DeleteUserButton" -ForegroundColor Green

# ── Pagina usuarios actualizada ──────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, SectionHeader } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { Users } from "lucide-react"
import NewUserModal from "./NewUserModal"
import DeleteUserButton from "./DeleteUserButton"

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador", administrativo: "Administrativo",
  medico: "Medico", biologo: "Biologo", paciente: "Paciente"
}

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*, patient:patients(full_name)")
    .order("role")
    .order("full_name")

  const staff = (profiles ?? []).filter((p: any) => p.role !== "paciente")
  const patients = (profiles ?? []).filter((p: any) => p.role === "paciente")

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader
        title="Usuarios"
        description="Personal interno y pacientes con acceso al sistema"
        actions={<NewUserModal />}
      />

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Personal interno" />
        </div>
        {staff.length === 0 ? (
          <div className="pb-5"><EmptyState title="Sin usuarios internos" icon={Users} /></div>
        ) : (
          <Table>
            <thead>
              <tr><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {staff.map((p: any) => (
                <tr key={p.id}>
                  <td className="font-medium text-[#1a2e1a]">{p.full_name}</td>
                  <td><span className="text-xs bg-[#f0f4f0] text-[#5a8a52] border border-[#c8dcc4] rounded px-2 py-0.5">{ROLE_LABELS[p.role] ?? p.role}</span></td>
                  <td><span className={`text-xs rounded px-2 py-0.5 border ${p.is_active ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" : "bg-[#f5f5f5] text-[#888] border-[#ddd]"}`}>{p.is_active ? "Activo" : "Inactivo"}</span></td>
                  <td>
                    {p.id !== user.id && (
                      <DeleteUserButton userId={p.id} userName={p.full_name} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Pacientes con acceso" />
        </div>
        {patients.length === 0 ? (
          <div className="pb-5"><EmptyState title="Sin pacientes con acceso" description="Crea un usuario con rol Paciente para darle acceso al portal." icon={Users} /></div>
        ) : (
          <Table>
            <thead>
              <tr><th>Nombre de usuario</th><th>Ficha vinculada</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {patients.map((p: any) => (
                <tr key={p.id}>
                  <td className="font-medium text-[#1a2e1a]">{p.full_name}</td>
                  <td className="text-[#6b8c65]">{p.patient?.full_name ?? <span className="text-[#9ab894] italic">Sin vincular</span>}</td>
                  <td><span className={`text-xs rounded px-2 py-0.5 border ${p.is_active ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" : "bg-[#f5f5f5] text-[#888] border-[#ddd]"}`}>{p.is_active ? "Activo" : "Invitacion pendiente"}</span></td>
                  <td>
                    <DeleteUserButton userId={p.id} userName={p.full_name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\usuarios\page.tsx" -Value $content
Write-Host "[OK] Pagina usuarios" -ForegroundColor Green

Write-Host ""
Write-Host "=== Listo ===" -ForegroundColor Cyan
Write-Host "Ejecuta: npm run build && npx vercel --prod --force" -ForegroundColor Yellow
