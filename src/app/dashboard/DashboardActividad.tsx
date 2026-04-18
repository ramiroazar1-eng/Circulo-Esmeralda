import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Pill, ArrowRight } from "lucide-react"
import { Card, SectionHeader, EmptyState } from "@/components/ui"
import { formatDate, formatDateTime, formatGrams } from "@/lib/utils"
import PlanReviewButtons from "./PlanReviewButtons"

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  nuevo:          { label: "Nuevo",          color: "bg-blue-50 text-blue-700 border-blue-200" },
  aprobado:       { label: "Aprobado",        color: "bg-green-50 text-green-700 border-green-200" },
  en_preparacion: { label: "En preparacion",  color: "bg-amber-50 text-amber-700 border-amber-200" },
  empaquetado:    { label: "Listo",           color: "bg-purple-50 text-purple-700 border-purple-200" },
}

export default async function DashboardActividad({ role }: { role: string }) {
  const supabase = await createClient()
  const isAdmin = role === "admin"

  const [recentDispenses, recentLog, planRequests, pendingOrdersRes] = await Promise.all([
    supabase.from("dispenses").select("id, dispensed_at, grams, patient:patients(full_name), lot:lots(lot_code)").order("dispensed_at", { ascending: false }).limit(5),
    supabase.from("daily_log_entries").select("id, entry_date, title, category, is_incident, created_by_profile:profiles(full_name)").order("created_at", { ascending: false }).limit(4),
    supabase.from("plan_requests").select("*, patient:patients(full_name), current_plan:membership_plans!plan_requests_current_plan_id_fkey(name), requested_plan:membership_plans!plan_requests_requested_plan_id_fkey(name)").eq("status", "pendiente").order("created_at", { ascending: false }).limit(10),
    supabase.from("orders").select("id, status, patient:patients(full_name), created_at").in("status", ["nuevo","aprobado","en_preparacion","empaquetado"]).order("created_at", { ascending: false }).limit(8),
  ])

  const pendingOrders = (pendingOrdersRes.data ?? []) as any[]

  return (
    <div className="space-y-4">
      {/* Pedidos pendientes */}
      {pendingOrders.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title={`Pedidos activos (${pendingOrders.length})`} actions={
              <Link href="/dispensas/pedidos" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver todos <ArrowRight className="w-3 h-3" /></Link>
            } />
          </div>
          <div className="divide-y divide-slate-100">
            {pendingOrders.map((order: any) => {
              const config = ORDER_STATUS[order.status] ?? { label: order.status, color: "bg-slate-50 text-slate-600 border-slate-200" }
              return (
                <div key={order.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{order.patient?.full_name ?? "-"}</p>
                    <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                  </div>
                  <span className={`text-xs rounded-full px-2.5 py-0.5 border font-medium ${config.color}`}>{config.label}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Dispensas recientes */}
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Dispensas recientes" actions={
            <Link href="/dispensas" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver todas <ArrowRight className="w-3 h-3" /></Link>
          } />
        </div>
        {(!recentDispenses.data || recentDispenses.data.length === 0) ? (
          <div className="px-5 pb-5"><EmptyState title="Sin dispensas registradas" icon={Pill} /></div>
        ) : (
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

      {/* Bitacora */}
      {recentLog.data && recentLog.data.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Bitacora reciente" actions={
              <Link href="/bitacora" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">Ver bitacora <ArrowRight className="w-3 h-3" /></Link>
            } />
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

      {/* Solicitudes de plan */}
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
