import PlanReviewButtons from "./PlanReviewButtons"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, AlertTriangle, CheckCircle2, Clock, FileX, Building2, Pill, CreditCard, ArrowRight, FlaskConical, Package, AlertCircle } from "lucide-react"
import { StatCard, Card, SectionHeader, ComplianceBadge, PaymentStatusBadge, EmptyState } from "@/components/ui"
import { formatDate, formatGrams, daysUntil } from "@/lib/utils"
import type { PatientAlert, ComplianceSummary, CurrentMembership } from "@/types"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const role = profile?.role ?? ""
  const isAdmin = role === "admin"
  const canSeeCultivo = ["admin","administrativo","biologo"].includes(role)

  const [
    complianceRaw, alertsRaw, orgDocs, membershipsRaw,
    recentDispenses, stockData, planRequests, recentLog,
    activeCycle, supplyAlerts, plannedEvents
  ] = await Promise.all([
    supabase.from("v_compliance_summary").select("*").single(),
    supabase.from("v_patient_alerts").select("*").limit(10),
    supabase.from("org_documents").select("id, name, status, is_mandatory").in("status", ["faltante","pendiente_revision","observado"]).order("is_mandatory", { ascending: false }).limit(8),
    supabase.from("v_current_memberships").select("*").in("payment_status", ["pendiente","vencido"]).limit(8),
    supabase.from("dispenses").select("id, dispensed_at, grams, patient:patients(full_name), lot:lots(lot_code)").order("dispensed_at", { ascending: false }).limit(5),
    supabase.from("stock_positions").select("available_grams"),
    supabase.from("plan_requests").select("*, patient:patients(full_name), current_plan:membership_plans!plan_requests_current_plan_id_fkey(name), requested_plan:membership_plans!plan_requests_requested_plan_id_fkey(name)").eq("status", "pendiente").order("created_at", { ascending: false }).limit(10),
    supabase.from("daily_log_entries").select("id, entry_date, title, category, is_incident, created_by_profile:profiles(full_name)").order("created_at", { ascending: false }).limit(4),
    supabase.from("production_cycles").select("id, name, start_date, lots(id, lot_code, status, seedling_date, genetic:genetics(name), room:rooms(name))").eq("status", "activo").order("start_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("v_supply_stock").select("id, name, unit, stock_actual, stock_alert_threshold").eq("is_active", true).filter("stock_actual", "lte", supabase.rpc),
    supabase.from("planned_events").select("id, event_type, planned_date, notes, lot:lots(lot_code), room:rooms(name)").eq("status", "pendiente").gte("planned_date", new Date().toISOString().split("T")[0]).lte("planned_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]).order("planned_date", { ascending: true }).limit(5),
  ])

  const compliance = complianceRaw.data as ComplianceSummary | null
  const alerts = (alertsRaw.data ?? []) as PatientAlert[]
  const memberships = (membershipsRaw.data ?? []) as CurrentMembership[]
  const totalStock = (stockData.data ?? []).reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const cycle = activeCycle.data as any
  const lots = (cycle?.lots ?? []) as any[]
  const upcomingEvents = (plannedEvents.data ?? []) as any[]

  // Alertas de stock bajo
  const { data: supplyStockData } = await supabase.from("v_supply_stock").select("id, name, unit, stock_actual, stock_alert_threshold").eq("is_active", true)
  const lowStockItems = (supplyStockData ?? []).filter((s: any) => s.stock_alert_threshold > 0 && s.stock_actual <= s.stock_alert_threshold)

  const EVENT_LABELS: Record<string, string> = {
    poda: "Poda", nutrientes: "Nutrientes", tratamiento: "Tratamiento",
    transplante: "Transplante", riego: "Riego", defoliacion: "Defoliacion",
    traslado: "Traslado", incidente: "Incidente", descarte: "Descarte", otro: "Otro"
  }

  const LOT_STATUS: Record<string, string> = {
    plantines: "Plantines", vegetativo: "Vegetativo", poda: "Poda",
    floracion: "Floracion", cosecha: "Cosecha", secado: "Secado",
    curado: "Curado", finalizado: "Finalizado", descartado: "Descartado"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Panel de control</h1>
        <p className="text-sm text-slate-500 mt-0.5">{new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Alertas operativas */}
      {canSeeCultivo && (lowStockItems.length > 0 || upcomingEvents.length > 0) && (
        <div className="space-y-2">
          {lowStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Stock bajo de insumos</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {lowStockItems.map((s: any) => (
                    <Link key={s.id} href={`/insumos/${s.id}`} className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 hover:bg-amber-200 transition-colors">
                      {s.name} — {s.stock_actual} {s.unit}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
          {upcomingEvents.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Eventos planificados proximos 7 dias</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {upcomingEvents.map((e: any) => (
                    <span key={e.id} className="text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5">
                      {new Date(e.planned_date + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} — {EVENT_LABELS[e.event_type] ?? e.event_type}{e.room ? ` (${e.room.name})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pacientes activos" value={compliance?.total_activos ?? 0} icon={Users} />
        <StatCard label="En regla" value={compliance?.en_regla ?? 0} variant="ok" icon={CheckCircle2} />
        <StatCard label="Requieren atencion" value={compliance?.en_atencion ?? 0} variant="atencion" icon={Clock} />
        <StatCard label="Estado critico" value={compliance?.criticos ?? 0} variant="critico" icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="REPROCANN vencido" value={compliance?.reprocann_vencido ?? 0} variant={(compliance?.reprocann_vencido ?? 0) > 0 ? "critico" : "ok"} icon={FileX} />
        <StatCard label="REPROCANN proximo" value={compliance?.reprocann_proximo ?? 0} variant={(compliance?.reprocann_proximo ?? 0) > 0 ? "atencion" : "ok"} icon={Clock} />
        <StatCard label="Stock disponible" value={formatGrams(totalStock)} icon={Pill} />
      </div>

      {/* Ciclo activo */}
      {canSeeCultivo && cycle && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div>
              <SectionHeader title={`Ciclo activo — ${cycle.name}`} />
              <p className="text-xs text-slate-500 -mt-3">Desde {formatDate(cycle.start_date)} · {lots.length} lote{lots.length !== 1 ? "s" : ""}</p>
            </div>
            <Link href={`/ciclos/${cycle.id}`} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 shrink-0">
              Ver ciclo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {lots.map((lot: any) => {
                const daysInStage = lot.seedling_date
                  ? Math.round((Date.now() - new Date(lot.seedling_date).getTime()) / (1000*60*60*24))
                  : null
                return (
                  <Link key={lot.id} href={`/trazabilidad/${lot.id}`}>
                    <div className="bg-[#f5faf3] border border-[#ddecd8] rounded-xl p-3 hover:border-[#4d8a3d] hover:bg-[#edf7e8] transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-[#1a2e1a] truncate">{lot.lot_code}</p>
                          <p className="text-xs text-[#6b8c65] mt-0.5">{lot.genetic?.name ?? "Sin genetica"}</p>
                          {lot.room && <p className="text-xs text-[#9ab894]">{lot.room.name}</p>}
                        </div>
                        <span className="text-xs bg-[#2d5a27] text-[#a8e095] rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap">
                          {LOT_STATUS[lot.status] ?? lot.status}
                        </span>
                      </div>
                      {daysInStage && (
                        <p className="text-xs text-[#9ab894] mt-2">{daysInStage} dias en ciclo</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <Link href={`/ciclos/${cycle.id}/timeline`} className="text-xs text-[#2d5a27] hover:underline flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />Ver linea de tiempo
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          {(!recentDispenses.data || recentDispenses.data.length === 0) ? <div className="px-5 pb-5"><EmptyState title="Sin dispensas registradas" icon={Pill} /></div> : (
            <div className="divide-y divide-slate-100">
              {(recentDispenses.data ?? []).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{d.patient?.full_name ?? "-"}</p>
                    <p className="text-xs text-slate-500">Lote {d.lot?.lot_code ?? "-"} · {formatDate(d.dispensed_at)}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-700 tabular-nums">{formatGrams(d.grams)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {recentLog.data && recentLog.data.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Bitacora reciente" actions={<Link href="/bitacora" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver bitacora <ArrowRight className="w-3 h-3" /></Link>} />
          </div>
          <div className="divide-y divide-slate-100">
            {(recentLog.data ?? []).map((entry: any) => (
              <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${entry.is_incident ? "bg-red-500" : "bg-slate-300"}`} />
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 truncate">{entry.title}</p>
                  <p className="text-xs text-slate-400">{formatDate(entry.entry_date)} · {(entry as any).created_by_profile?.full_name ?? "-"}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {planRequests.data && planRequests.data.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title={`Solicitudes de plan (${planRequests.data.length})`} />
          </div>
          <div className="divide-y divide-slate-100">
            {(planRequests.data as any[]).map((req: any) => (
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