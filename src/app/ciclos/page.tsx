import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, EmptyState } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { FlaskConical } from "lucide-react"
import NewCycleModal from "./NewCycleModal"
import Link from "next/link"
import { formatDate, formatGrams } from "@/lib/utils"

export default async function CiclosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canEdit = ["admin","biologo","administrativo"].includes(profile?.role ?? "")
  const { data: cycles } = await supabase
    .from("production_cycles")
    .select("*, lots(id, lot_code, status, net_grams, gross_grams, seedling_date, harvest_date, curing_start_date, curing_days, genetic:genetics(name))")
    .order("start_date", { ascending: false })
  const cycleList = (cycles ?? []) as any[]
  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Ciclos de produccion" description="Historial y metricas de cada ciclo productivo" actions={
          <div className="flex gap-2">
            <a href="/ciclos/comparativa" className="inline-flex items-center gap-1.5 text-xs bg-white border border-[#ddecd8] hover:border-[#4d8a3d] text-[#2d5a27] font-medium rounded-lg px-3 py-2 transition-colors">Comparativa</a>
            {canEdit && <NewCycleModal />}
          </div>
        } />
      {cycleList.length === 0 ? (
        <Card><EmptyState title="Sin ciclos registrados" icon={FlaskConical} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cycleList.map((cycle: any) => {
            const lots = (cycle.lots ?? []) as any[]
            const totalNet = lots.reduce((acc: number, l: any) => acc + (l.net_grams ?? 0), 0)
            const genetics = [...new Set(lots.map((l: any) => l.genetic?.name).filter(Boolean))]
            const startDate = cycle.start_date
            const endDate = cycle.end_date
            const durationDays = startDate && endDate
              ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
              : startDate ? Math.round((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : null
            const finalizados = lots.filter((l: any) => l.status === "finalizado").length
            return (
              <Link key={cycle.id} href={`/ciclos/${cycle.id}`}>
                <div className="bg-white border border-[#ddecd8] rounded-xl p-5 hover:border-[#4d8a3d] hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-base font-bold text-[#1a2e1a]">{cycle.name}</h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cycle.status === "activo" ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" : "bg-[#f0f4f0] text-[#5a8a52] border-[#c8dcc4]"}`}>
                          {cycle.status === "activo" ? "Activo" : "Finalizado"}
                        </span>
                      </div>
                      <p className="text-xs text-[#9ab894]">
                        {formatDate(cycle.start_date)}{cycle.end_date && ` â†’ ${formatDate(cycle.end_date)}`}{durationDays && ` Â· ${durationDays} dias`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#1a2e1a]">{formatGrams(totalNet)}</p>
                      <p className="text-xs text-[#9ab894]">producidos</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="bg-[#f5faf3] rounded-lg p-3 text-center">
                      <p className="text-lg font-black text-[#1a2e1a]">{lots.length}</p>
                      <p className="text-[10px] text-[#9ab894] uppercase tracking-wide">Lotes</p>
                    </div>
                    <div className="bg-[#f5faf3] rounded-lg p-3 text-center">
                      <p className="text-lg font-black text-[#1a2e1a]">{finalizados}/{lots.length}</p>
                      <p className="text-[10px] text-[#9ab894] uppercase tracking-wide">Finalizados</p>
                    </div>
                    <div className="bg-[#f5faf3] rounded-lg p-3 text-center">
                      <p className="text-lg font-black text-[#1a2e1a]">{durationDays ?? "â€”"}</p>
                      <p className="text-[10px] text-[#9ab894] uppercase tracking-wide">Dias</p>
                    </div>
                  </div>
                  {genetics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {genetics.map((g: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] rounded-full text-[11px] font-medium">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}