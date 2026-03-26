import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDateTime } from "@/lib/utils"

export default async function AuditoriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")
  const { data: logs } = await supabase.from("audit_logs").select("*, performed_by_profile:profiles(full_name)").order("performed_at", { ascending: false }).limit(100)

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Auditoria" description="Historial completo de acciones registradas en el sistema" />
      <Card padding={false}>
        {(!logs || logs.length === 0) ? <EmptyState title="Sin registros de auditoria" /> : (
          <Table>
            <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Accion</th><th>Entidad</th><th>Registro</th></tr></thead>
            <tbody>{logs.map((log: any) => (
              <tr key={log.id}>
                <td className="text-slate-500 whitespace-nowrap">{formatDateTime(log.performed_at)}</td>
                <td className="font-medium">{log.performed_by_profile?.full_name ?? "—"}</td>
                <td><span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded px-1.5 py-0.5">{log.action}</span></td>
                <td className="text-slate-500">{log.entity_type}</td>
                <td className="text-slate-700">{log.entity_label ?? "—"}</td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
