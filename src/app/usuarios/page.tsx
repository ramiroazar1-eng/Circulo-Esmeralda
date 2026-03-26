import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate } from "@/lib/utils"
import { Users } from "lucide-react"
import NewUserModal from "./NewUserModal"

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")
  const { data: users } = await supabase.from("profiles").select("*").order("full_name")
  const list = (users ?? []) as any[]
  const activos = list.filter(u => u.is_active).length
  const ROLE_LABELS: Record<string, string> = { admin: "Administrador", administrativo: "Administrativo", medico: "Medico", biologo: "Biologo", paciente: "Paciente" }

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Usuarios" description="Gestion de usuarios y roles del sistema" actions={<NewUserModal />} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Usuarios totales" value={list.length} icon={Users} />
        <StatCard label="Activos" value={activos} variant="ok" />
      </div>
      <Card padding={false}>
        {list.length === 0 ? <EmptyState title="Sin usuarios" icon={Users} /> : (
          <Table>
            <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th><th>Creado</th></tr></thead>
            <tbody>
              {list.map((u: any) => (
                <tr key={u.id}>
                  <td className="font-medium text-slate-900">{u.full_name}</td>
                  <td><span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5">{ROLE_LABELS[u.role] ?? u.role}</span></td>
                  <td><span className={`text-xs rounded px-1.5 py-0.5 border ${u.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{u.is_active ? "Activo" : "Inactivo"}</span></td>
                  <td className="text-slate-500">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
