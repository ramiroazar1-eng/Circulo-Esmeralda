import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { AlertCircle, Clock } from "lucide-react"
import { formatGrams } from "@/lib/utils"
import type { ComplianceSummary } from "@/types"

export default async function DashboardStats({ role }: { role: string }) {
  const supabase = await createClient()
  const canSeeCultivo = ["admin","administrativo","biologo","director_de_cultivo"].includes(role)
  const isAdmin = role === "admin"

  const [complianceRaw, stockData, activePlantsRes, plannedEvents, supplyStockData] = await Promise.all([
    supabase.from("v_compliance_summary").select("*").single(),
    supabase.from("stock_positions").select("available_grams"),
    supabase.from("v_active_plants").select("room_id, room_name, plant_count, plants_veg, plants_flower, plants_seedling"),
    supabase.from("planned_events").select("id, event_type, planned_date, notes, lot:lots(lot_code), room:rooms(name)").eq("status", "pendiente").gte("planned_date", new Date().toISOString().split("T")[0]).lte("planned_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]).order("planned_date", { ascending: true }).limit(5),
    supabase.from("v_supply_stock").select("id, name, unit, stock_actual, stock_alert_threshold").eq("is_active", true),
  ])

  const compliance = complianceRaw.data as ComplianceSummary | null
  const totalStock = (stockData.data ?? []).reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const activePlants = (activePlantsRes.data ?? []) as any[]
  const totalActivePlants = activePlants.reduce((acc: number, r: any) => acc + (r.plant_count ?? 0), 0)
  const totalVeg = activePlants.reduce((acc: number, r: any) => acc + (r.plants_veg ?? 0), 0)
  const totalFlower = activePlants.reduce((acc: number, r: any) => acc + (r.plants_flower ?? 0), 0)
  const totalSeedling = activePlants.reduce((acc: number, r: any) => acc + (r.plants_seedling ?? 0), 0)
  const upcomingEvents = (plannedEvents.data ?? []) as any[]
  const lowStockItems = (supplyStockData.data ?? []).filter((s: any) => s.stock_alert_threshold > 0 && s.stock_actual <= s.stock_alert_threshold)

  return (
    <div className="space-y-4">
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
                      {new Date(e.planned_date + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} — {e.room?.name ?? e.lot?.lot_code ?? "General"}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isAdmin && compliance && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">Pacientes</p>
            <p className="text-2xl font-bold text-slate-900">{compliance.total_patients ?? 0}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(compliance.reprocann_proximo ?? 0) > 0 && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5">
                  REPROCANN proximo: {compliance.reprocann_proximo}
                </span>
              )}
            </div>
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">Stock</p>
          <p className="text-2xl font-bold text-slate-900">{formatGrams(totalStock)}</p>
          <p className="text-xs text-slate-400 mt-0.5">disponible</p>
        </div>
        {canSeeCultivo && (
          <div className="bg-white border border-[#ddecd8] rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b8c65] mb-1">Plantas activas</p>
            <p className="text-2xl font-bold text-[#1a2e1a]">{totalActivePlants}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {totalSeedling > 0 && <span className="text-xs text-slate-500">{totalSeedling} plantines</span>}
              {totalVeg > 0 && <span className="text-xs text-[#2d6a1f] font-medium">{totalVeg} vege</span>}
              {totalFlower > 0 && <span className="text-xs text-amber-600 font-medium">{totalFlower} flora</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
