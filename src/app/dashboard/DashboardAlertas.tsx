import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { CheckCircle2, Building2, CreditCard, ArrowRight } from "lucide-react"
import { Card, SectionHeader, ComplianceBadge, PaymentStatusBadge, EmptyState } from "@/components/ui"
import { daysUntil } from "@/lib/utils"
import type { PatientAlert, CurrentMembership } from "@/types"

export default async function DashboardAlertas({ role }: { role: string }) {
  const supabase = await createClient()
  const isAdmin = role === "admin"

  const [alertsRaw, orgDocs, membershipsRaw] = await Promise.all([
    supabase.from("v_patient_alerts").select("*").limit(10),
    supabase.from("org_documents").select("id, name, status, is_mandatory").in("status", ["faltante","pendiente_revision","observado"]).order("is_mandatory", { ascending: false }).limit(8),
    supabase.from("v_current_memberships").select("*").in("payment_status", ["pendiente","vencido"]).limit(8),
  ])

  const alerts = (alertsRaw.data ?? []) as PatientAlert[]
  const memberships = (membershipsRaw.data ?? []) as CurrentMembership[]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Alertas de pacientes" actions={
            <Link href="/pacientes" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver todos <ArrowRight className="w-3 h-3" /></Link>
          } />
        </div>
        {alerts.length === 0 ? (
          <div className="px-5 pb-5"><EmptyState title="Sin alertas activas" description="Todos los pacientes estan en regla" icon={CheckCircle2} /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map(alert => {
              const days = daysUntil(alert.reprocann_expiry)
              return (
                <Link key={alert.id} href={`/pacientes/${alert.id}`} className="flex items-start justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{alert.full_name}</p>
                    <p className="text-xs text-slate-500">DNI {alert.dni}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {alert.docs_criticos > 0 && <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5">{alert.docs_criticos} doc. faltante{alert.docs_criticos > 1 ? "s" : ""}</span>}
                      {days !== null && days <= 30 && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">REPROCANN {days < 0 ? "VENCIDO" : `vence en ${days}d`}</span>}
                    </div>
                  </div>
                  <ComplianceBadge status={alert.compliance_status} />
                </Link>
              )
            })}
          </div>
        )}
      </Card>

      {isAdmin && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Documentacion ONG" actions={
              <Link href="/documentacion-ong" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver checklist <ArrowRight className="w-3 h-3" /></Link>
            } />
          </div>
          {(!orgDocs.data || orgDocs.data.length === 0) ? (
            <div className="px-5 pb-5"><EmptyState title="Documentacion institucional completa" icon={Building2} /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(orgDocs.data ?? []).map((doc: any) => (
                <Link key={doc.id} href="/documentacion-ong" className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm text-slate-800 truncate">{doc.name}</p>
                    {doc.is_mandatory && <p className="text-xs text-slate-400">Obligatorio</p>}
                  </div>
                  <span className={`text-xs rounded px-1.5 py-0.5 border whitespace-nowrap ${doc.status === "faltante" ? "bg-red-50 text-red-700 border-red-200" : doc.status === "pendiente_revision" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
                    {doc.status === "faltante" ? "Faltante" : doc.status === "pendiente_revision" ? "Pendiente" : "Observado"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {isAdmin && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title={`Membresias ${new Date().toLocaleDateString("es-AR", { month: "long" })}`} actions={
              <Link href="/membresias" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver todas <ArrowRight className="w-3 h-3" /></Link>
            } />
          </div>
          {memberships.length === 0 ? (
            <div className="px-5 pb-5"><EmptyState title="Sin pagos pendientes" icon={CreditCard} /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {memberships.map(m => (
                <Link key={m.patient_id} href={`/pacientes/${m.patient_id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{m.full_name}</p>
                    <p className="text-xs text-slate-500">{m.plan_name ?? "Sin plan asignado"}</p>
                  </div>
                  <PaymentStatusBadge status={m.payment_status ?? "pendiente"} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
