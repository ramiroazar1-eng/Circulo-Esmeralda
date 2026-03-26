import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { UserPlus, Search } from "lucide-react"
import { PageHeader, Table, ComplianceBadge, ReprocannBadge, PatientStatusBadge, EmptyState, Button, Card } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate, daysUntil } from "@/lib/utils"

export default async function PacientesPage({ searchParams }: { searchParams: Promise<{ estado?: string; compliance?: string; q?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const params = await searchParams
  const { estado, compliance, q } = params
  let query = supabase.from("patients").select("id, full_name, dni, status, compliance_status, reprocann_status, reprocann_expiry, created_at, treating_physician:profiles!patients_treating_physician_id_fkey(full_name), membership_plan:membership_plans(name)").is("deleted_at", null).order("full_name")
  if (q) query = query.or(`full_name.ilike.%${q}%,dni.ilike.%${q}%`)
  if (estado) query = query.eq("status", estado)
  if (compliance) query = query.eq("compliance_status", compliance)
  const { data: patients } = await query
  const list = (patients ?? []) as any[]

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Pacientes" description={`${list.length} paciente${list.length !== 1 ? "s" : ""} encontrado${list.length !== 1 ? "s" : ""}`} actions={<Link href="/pacientes/nuevo"><Button size="sm"><UserPlus className="w-3.5 h-3.5" />Nuevo paciente</Button></Link>} />
      <div className="flex items-center gap-3 flex-wrap">
        <form className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Buscar por nombre o DNI..." className="input-ong pl-9 py-1.5 text-xs" />
          </div>
          <select name="estado" defaultValue={estado ?? ""} className="input-ong w-auto py-1.5 text-xs">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="pendiente_documental">Pendiente documental</option>
            <option value="suspendido">Suspendido</option>
            <option value="inactivo">Inactivo</option>
            <option value="baja">Baja</option>
          </select>
          <select name="compliance" defaultValue={compliance ?? ""} className="input-ong w-auto py-1.5 text-xs">
            <option value="">Todo compliance</option>
            <option value="critico">Critico</option>
            <option value="atencion">Atencion</option>
            <option value="ok">En regla</option>
          </select>
          <Button type="submit" variant="secondary" size="sm">Filtrar</Button>
        </form>
      </div>
      <Card padding={false}>
        {list.length === 0 ? (
          <EmptyState title="Sin pacientes" description="No hay pacientes que coincidan con los filtros." icon={UserPlus} action={<Link href="/pacientes/nuevo"><Button size="sm">Agregar primer paciente</Button></Link>} />
        ) : (
          <Table>
            <thead><tr><th>Paciente</th><th>DNI</th><th>Estado</th><th>Compliance</th><th>REPROCANN</th><th>Vencimiento</th><th>Alta</th></tr></thead>
            <tbody>
              {list.map((p: any) => {
                const days = daysUntil(p.reprocann_expiry)
                return (
                  <tr key={p.id}>
                    <td><Link href={`/pacientes/${p.id}`} className="font-medium text-slate-900 hover:text-slate-700 hover:underline">{p.full_name}</Link>{p.treating_physician?.full_name && <p className="text-xs text-slate-400">{p.treating_physician.full_name}</p>}</td>
                    <td className="font-mono text-xs">{p.dni}</td>
                    <td><PatientStatusBadge status={p.status} /></td>
                    <td><ComplianceBadge status={p.compliance_status} /></td>
                    <td><ReprocannBadge status={p.reprocann_status} /></td>
                    <td>{p.reprocann_expiry ? <span className={days !== null && days < 0 ? "text-red-600 font-medium" : days !== null && days <= 30 ? "text-amber-600" : "text-slate-600"}>{formatDate(p.reprocann_expiry)}{days !== null && days >= 0 && days <= 30 && <span className="text-xs ml-1 text-amber-500">({days}d)</span>}</span> : <span className="text-slate-400">—</span>}</td>
                    <td className="text-slate-500">{formatDate(p.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
