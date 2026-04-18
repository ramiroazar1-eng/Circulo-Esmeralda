import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, EmptyState } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { FlaskConical, Sprout, Leaf } from "lucide-react"
import NewCycleModal from "./NewCycleModal"
import Link from "next/link"
import { formatDate, formatGrams } from "@/lib/utils"

export default async function CiclosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canEdit = ["admin","biologo","director_de_cultivo","administrativo"].includes(profile?.role ?? "")

  const { data: cycles } = await supabase
    .from("production_cycles")
    .select("*, lots(id, lot_code, status, net_grams, gross_grams, seedling_date, harvest_date, curing_start_date, curing_days, plant_count, lot_subtype, genetic:genetics(name))")
    .order("start_date", { ascending: false })

  const cycleList = (cycles ?? []) as any[]
  const activeCycles = cycleList.filter(c => c.status === "activo")
  const finishedCycles = cycleList.filter(c => c.status !== "activo")

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Ciclos de produccion" description="Historial y metricas de cada ciclo" actions={
        <div className="flex gap-2">
          <a href="/ciclos/comparativa" className="inline-flex items-center gap-1.5 text-xs bg-white border border-[#ddecd8] hover:border-[#4d8a3d] text-[#2d5a27] font-medium rounded-lg px-3 py-2 transition-colors">Comparativa</a>
          {canEdit && <NewCycleModal />}
        </div>
      } />

      {cycleList.length === 0 ? (
        <Card><EmptyState title="Sin ciclos registrados" icon={FlaskConical} /></Card>
      ) : (
        <div className="space-y-6">

          {/* Ciclos activos */}
          {activeCycles.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">En curso</p>
              {activeCycles.map((cycle: any) => <CycleCard key={cycle.id} cycle={cycle} />)}
            </div>
          )}

          {/* Ciclos finalizados */}
          {finishedCycles.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Historial</p>
              {finishedCycles.map((cycle: any) => <CycleCard key={cycle.id} cycle={cycle} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CycleCard({ cycle }: { cycle: any }) {
  const lots = (cycle.lots ?? []) as any[]
  const isReproductivo = cycle.cycle_type === "reproductivo"

  const totalNet = lots.reduce((acc: number, l: any) => acc + (l.net_grams ?? 0), 0)
  const totalPlants = lots.reduce((acc: number, l: any) => acc + (l.plant_count ?? 0), 0)
  const genetics = [...new Set(lots.map((l: any) => l.genetic?.name).filter(Boolean))] as string[]
  const finalizados = lots.filter((l: any) => l.status === "finalizado").length
  const activeLots = lots.filter((l: any) => ["plantines","vegetativo","floracion"].includes(l.status))

  const startDate = cycle.start_date
  const endDate = cycle.end_date
  const durationDays = startDate && endDate
    ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    : startDate ? Math.round((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : null

  // Para reproductivo: madres por genetica
  const madresByGenetic: Record<string, number> = {}
  if (isReproductivo) {
    for (const lot of activeLots) {
      const name = lot.genetic?.name ?? "Sin genetica"
      madresByGenetic[name] = (madresByGenetic[name] ?? 0) + (lot.plant_count ?? 0)
    }
  }

  // Proxima cosecha estimada (lote mas avanzado en floracion)
  const floraLots = lots.filter((l: any) => l.status === "floracion" && l.flower_date)
  const nextHarvest = floraLots.length > 0
    ? floraLots.map((l: any) => {
        const flowerDate = new Date(l.flower_date)
        const estimatedHarvest = new Date(flowerDate.getTime() + 63 * 24 * 60 * 60 * 1000) // 9 semanas
        return estimatedHarvest
      }).sort((a, b) => a.getTime() - b.getTime())[0]
    : null

  const daysToHarvest = nextHarvest
    ? Math.round((nextHarvest.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Link href={`/ciclos/${cycle.id}`}>
      <div className={`bg-white rounded-xl p-5 hover:shadow-md transition-all cursor-pointer border ${
        cycle.status === "activo"
          ? isReproductivo ? "border-emerald-200 hover:border-emerald-400" : "border-[#ddecd8] hover:border-[#4d8a3d]"
          : "border-slate-200 hover:border-slate-300"
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isReproductivo
                ? <Sprout className="w-4 h-4 text-emerald-600" />
                : <Leaf className="w-4 h-4 text-[#2d5a27]" />
              }
              <h2 className="text-base font-bold text-[#1a2e1a]">{cycle.name}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                cycle.status === "activo" ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" : "bg-[#f0f4f0] text-[#5a8a52] border-[#c8dcc4]"
              }`}>
                {cycle.status === "activo" ? "Activo" : "Finalizado"}
              </span>
              {isReproductivo
                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">Reproductivo</span>
                : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">Productivo</span>
              }
            </div>
            <p className="text-xs text-[#9ab894]">
              {formatDate(cycle.start_date)}{cycle.end_date && ` → ${formatDate(cycle.end_date)}`}{durationDays && ` · ${durationDays} dias`}
            </p>
          </div>
          <div className="text-right">
            {isReproductivo ? (
              <div>
                <p className="text-2xl font-black text-[#1a2e1a]">{totalPlants}</p>
                <p className="text-xs text-[#9ab894]">plantas madres</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-black text-[#1a2e1a]">{formatGrams(totalNet)}</p>
                <p className="text-xs text-[#9ab894]">producidos</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {isReproductivo ? (
          <div className="space-y-3">
            {/* Madres por genetica */}
            {Object.keys(madresByGenetic).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(madresByGenetic).map(([name, count]) => (
                  <div key={name} className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <Sprout className="w-3 h-3 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-800">{name}</span>
                    <span className="text-xs text-emerald-600">{count} plantas</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-[#f5faf3] rounded-lg p-3 text-center">
                <p className="text-lg font-black text-[#1a2e1a]">{genetics.length}</p>
                <p className="text-[10px] text-[#9ab894] uppercase tracking-wide">Geneticas</p>
              </div>
              <div className="bg-[#f5faf3] rounded-lg p-3 text-center">
                <p className="text-lg font-black text-[#1a2e1a]">{activeLots.length}</p>
                <p className="text-[10px] text-[#9ab894] uppercase tracking-wide">Lotes activos</p>
              </div>
              <div className="bg-[#f5faf3] rounded-lg p-3 text-center">
                <p className="text-lg font-black text-[#1a2e1a]">{durationDays ?? "-"}</p>
                <p className="text-[10px] text-[#9ab894] uppercase tracking-wide">Dias en curso</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#f5faf3] rounded-lg p-3 text-center">
                <p className="text-lg font-black text-[#1a2e1a]">{lots.length}</p>
                <p className="text-[10px] text-[#9ab894] uppercase tracking-wide">Lotes</p>
              </div>
              <div className="bg-[#f5faf3] rounded-lg p-3 text-center">
                <p className="text-lg font-black text-[#1a2e1a]">{finalizados}/{lots.length}</p>
                <p className="text-[10px] text-[#9ab894] uppercase tracking-wide">Finalizados</p>
              </div>
              <div className="bg-[#f5faf3] rounded-lg p-3 text-center">
                <p className="text-lg font-black text-[#1a2e1a]">{durationDays ?? "-"}</p>
                <p className="text-[10px] text-[#9ab894] uppercase tracking-wide">Dias</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${daysToHarvest !== null && daysToHarvest <= 14 ? "bg-amber-50" : "bg-[#f5faf3]"}`}>
                <p className={`text-lg font-black ${daysToHarvest !== null && daysToHarvest <= 14 ? "text-amber-700" : "text-[#1a2e1a]"}`}>
                  {daysToHarvest !== null ? (daysToHarvest <= 0 ? "Hoy" : `${daysToHarvest}d`) : "-"}
                </p>
                <p className="text-[10px] text-[#9ab894] uppercase tracking-wide">Prox. cosecha</p>
              </div>
            </div>
            {genetics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {genetics.map((g: string) => (
                  <span key={g} className="text-xs bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] rounded-full px-2.5 py-0.5">{g}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
