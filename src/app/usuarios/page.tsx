import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, SectionHeader } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { Users } from "lucide-react"
import NewUserModal from "./NewUserModal"
import DeleteUserButton from "./DeleteUserButton"

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador", administrativo: "Administrativo",
  medico: "Medico", biologo: "Director de Cultivo", director_de_cultivo: "Director de Cultivo", paciente: "Paciente", delivery: "Delivery"
}

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")
  const { data: profiles } = await supabase.from("profiles").select("*, patient:patients!profiles_patient_id_fkey(full_name)").order("role").order("full_name")
  const staff = (profiles ?? []).filter((p: any) => p.role !== "paciente")
  const patients = (profiles ?? []).filter((p: any) => p.role === "paciente")

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Usuarios" description="Personal interno y pacientes con acceso al sistema" actions={<NewUserModal />} />
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Personal interno" /></div>
        {staff.length === 0 ? (
          <div className="pb-5"><EmptyState title="Sin usuarios internos" icon={Users} /></div>
        ) : (
          <Table>
            <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {staff.map((p: any) => (
                <tr key={p.id}>
                  <td className="font-medium text-[#1a2e1a]">{p.full_name}</td>
                  <td><span className="text-xs bg-[#f0f4f0] text-[#5a8a52] border border-[#c8dcc4] rounded px-2 py-0.5">{ROLE_LABELS[p.role] ?? p.role}</span></td>
                  <td><span className={`text-xs rounded px-2 py-0.5 border ${p.is_active ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" : "bg-[#f5f5f5] text-[#888] border-[#ddd]"}`}>{p.is_active ? "Activo" : "Inactivo"}</span></td>
                  <td>{p.id !== user.id && <DeleteUserButton userId={p.id} userName={p.full_name} />}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Pacientes con acceso" /></div>
        {patients.length === 0 ? (
          <div className="pb-5"><EmptyState title="Sin pacientes con acceso" description="Crea un usuario con rol Paciente para darle acceso al portal." icon={Users} /></div>
        ) : (
          <Table>
            <thead><tr><th>Nombre</th><th>Ficha vinculada</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {patients.map((p: any) => (
                <tr key={p.id}>
                  <td className="font-medium text-[#1a2e1a]">{p.full_name}</td>
                  <td className="text-[#6b8c65]">{p.patient?.full_name ?? <span className="text-[#9ab894] italic">Sin vincular</span>}</td>
                  <td><span className={`text-xs rounded px-2 py-0.5 border ${p.is_active ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" : "bg-[#f5f5f5] text-[#888] border-[#ddd]"}`}>{p.is_active ? "Activo" : "Invitacion pendiente"}</span></td>
                  <td><DeleteUserButton userId={p.id} userName={p.full_name} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}



