import PlanReviewButtons from "./PlanReviewButtons"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, AlertTriangle, CheckCircle2, Clock, FileX, Building2, Pill, CreditCard, ArrowRight } from "lucide-react"
import { StatCard, Card, SectionHeader, ComplianceBadge, ReprocannBadge, PaymentStatusBadge, EmptyState } from "@/components/ui"
import { formatDate, formatGrams, daysUntil } from "@/lib/utils"
import type { PatientAlert, ComplianceSummary, CurrentMembership } from "@/types"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: complianceRaw } = await supabase.from("v_compliance_summary").select("*").single()
  const compliance = complianceRaw as ComplianceSummary | null
  const { data: alertsRaw } = await supabase.from("v_patient_alerts").select("*").limit(10)
  const alerts = (alertsRaw ?? []) as PatientAlert[]
  const { data: orgDocs } = await supabase.from("org_documents").select("id, name, status, is_mandatory").in("status", ["faltante","pendiente_revision","observado"]).order("is_mandatory", { ascending: false }).limit(8)
  const { data: membershipsRaw } = await supabase.from("v_current_memberships").select("*").in("payment_status", ["pendiente","vencido"]).limit(8)
  const memberships = (membershipsRaw ?? []) as CurrentMembership[]
  const { data: recentDispenses } = await supabase.from("dispenses").select("id, dispensed_at, grams, patient:patients(full_name), lot:lots(lot_code)").order("dispensed_at", { ascending: false }).limit(5)
  const { data: stockData } = await supabase.from("stock_positions").select("available_grams")
  const totalStock = (stockData ?? []).reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const { data: planRequests } = await supabase
    .from("plan_requests")
    .select("*, patient:patients(full_name), current_plan:membership_plans!plan_requests_current_plan_id_fkey(name), requested_plan:membership_plans!plan_requests_requested_plan_id_fkey(name)")
    .eq("status", "pendiente")
    .order("created_at", { ascending: false })
    .limit(10)

  const { data: recentLog } = await supabase.from("daily_log_entries").select("id, entry_date, title, category, is_incident, created_by_profile:profiles(full_name)").order("created_at", { ascending: false }).limit(4)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Panel de control</h1>
        <p className="text-sm text-slate-500 mt-0.5">{new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pacientes activos" value={compliance?.total_activos ?? 0} icon={Users} />
        <StatCard label="En regla" value={compliance?.en_regla ?? 0} variant="ok" icon={CheckCircle2} />
        <StatCard label="Requieren atencion" value={compliance?.en_atencion ?? 0} variant="atencion" icon={Clock} />
        <StatCard label="Estado critico" value={compliance?.criticos ?? 0} variant="critico" icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="REPROCANN vencido" value={compliance?.reprocann_vencido ?? 0} variant={(compliance?.reprocann_vencido ?? 0) > 0 ? "critico" : "ok"} icon={FileX} />
        <StatCard label="REPROCANN proximo" value={compliance?.reprocann_proximo ?? 0} variant={(compliance?.reprocann_proximo ?? 0) > 0 ? "atencion" : "ok"} icon={Clock} />
        <StatCard label="Stock disponible" value={formatGrams(totalStock)} icon={Pill} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Alertas de pacientes" actions={<Link href="/pacientes" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver todos <ArrowRight className="w-3 h-3" /></Link>} />
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

        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Documentacion ONG" actions={<Link href="/documentacion-ong" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver checklist <ArrowRight className="w-3 h-3" /></Link>} />
          </div>
          {(!orgDocs || orgDocs.length === 0) ? (
            <div className="px-5 pb-5"><EmptyState title="Documentacion institucional completa" icon={Building2} /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orgDocs.map((doc: any) => (
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title={`Membresias ${new Date().toLocaleDateString("es-AR", { month: "long" })}`} actions={<Link href="/membresias" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver todas <ArrowRight className="w-3 h-3" /></Link>} />
          </div>
          {memberships.length === 0 ? <div className="px-5 pb-5"><EmptyState title="Sin pagos pendientes" icon={CreditCard} /></div> : (
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

        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Dispensas recientes" actions={<Link href="/dispensas" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver todas <ArrowRight className="w-3 h-3" /></Link>} />
          </div>
          {(!recentDispenses || recentDispenses.length === 0) ? <div className="px-5 pb-5"><EmptyState title="Sin dispensas registradas" icon={Pill} /></div> : (
            <div className="divide-y divide-slate-100">
              {recentDispenses.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{d.patient?.full_name ?? "â€”"}</p>
                    <p className="text-xs text-slate-500">Lote {d.lot?.lot_code ?? "â€”"} Â· {formatDate(d.dispensed_at)}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-700 tabular-nums">{formatGrams(d.grams)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {recentLog && recentLog.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Bitacora reciente" actions={<Link href="/bitacora" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver bitacora <ArrowRight className="w-3 h-3" /></Link>} />
          </div>
          <div className="divide-y divide-slate-100">
            {recentLog.map((entry: any) => (
              <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${entry.is_incident ? "bg-red-500" : "bg-slate-300"}`} />
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 truncate">{entry.title}</p>
                  <p className="text-xs text-slate-400">{formatDate(entry.entry_date)} Â· {(entry as any).created_by_profile?.full_name ?? "â€”"}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Solicitudes de plan pendientes */}
      {planRequests && planRequests.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title={`Solicitudes de plan (${planRequests.length})`} />
          </div>
          <div className="divide-y divide-slate-100">
            {(planRequests as any[]).map((req: any) => (
              <div key={req.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[#1a2e1a]">{req.patient?.full_name ?? "-"}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {req.request_type === "upgrade"
                      ? `Cambio: ${req.current_plan?.name ?? "-"} -> ${req.requested_plan?.name ?? "-"}`
                      : `Excepcion: ${req.requested_grams}g extra`}
                  </p>
                  {req.reason && <p className="text-xs text-slate-400 italic mt-0.5">{req.reason}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PlanReviewButtons requestId={req.id} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  )
}
