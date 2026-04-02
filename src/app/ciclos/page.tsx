import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, SectionHeader, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { FlaskConical, Leaf } from "lucide-react"
import NewCycleModal from "./NewCycleModal"
import { formatDate, formatGrams } from "@/lib/utils"
import Link from "next/link"

export default async function CiclosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canEdit = ["admin","biologo","administrativo"].includes(profile?.role ?? "")

  const { data: cycles } = await supabase
    .from("production_cycles")
    .select("*, lots(id, lot_code, status, net_grams, genetic:genetics(name), stock_position:stock_positions(available_grams))")
    .order("start_date", { ascending: false })

  const cycleList = (cycles ?? []) as any[]
  const activos = cycleList.filter(c => c.status === "activo").length
  const finalizados = cycleList.filter(c => c.status === "finalizado").length
  const totalGrams = cycleList.reduce((acc, c) => {
    return acc + (c.lots ?? []).reduce((a: number, l: any) => a + (l.net_grams ?? 0), 0)
  }, 0)

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader
        title="Ciclos de produccion"
        description="Seguimiento de ciclos completos de cultivo"
        actions={canEdit ? <NewCycleModal /> : undefined}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Ciclos activos" value={activos} variant="ok" icon={Leaf} />
        <StatCard label="Ciclos finalizados" value={finalizados} icon={FlaskConical} />
        <StatCard label="Total producido" value={formatGrams(totalGrams)} />
      </div>

      {cycleList.length === 0 ? (
        <Card><EmptyState title="Sin ciclos registrados" description="Crea el primer ciclo de produccion." icon={FlaskConical} /></Card>
      ) : (
        cycleList.map((cycle: any) => {
          const lots = (cycle.lots ?? []) as any[]
          const totalNet = lots.reduce((acc: number, l: any) => acc + (l.net_grams ?? 0), 0)
          const totalStock = lots.reduce((acc: number, l: any) => acc + (l.stock_position?.available_grams ?? 0), 0)
          return (
            <Card key={cycle.id} padding={false}>
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-bold text-[#1a2e1a]">{cycle.name}</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        cycle.status === "activo" ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" :
                        cycle.status === "finalizado" ? "bg-[#f0f4f0] text-[#5a8a52] border-[#c8dcc4]" :
                        "bg-[#fdf0f0] text-[#8a1f1f] border-[#e8aaaa]"
                      }`}>
                        {cycle.status === "activo" ? "Activo" : cycle.status === "finalizado" ? "Finalizado" : "Cancelado"}
                      </span>
                    </div>
                    <p className="text-xs text-[#9ab894]">
                      Inicio: {formatDate(cycle.start_date)}
                      {cycle.end_date && ` · Fin: ${formatDate(cycle.end_date)}`}
                    </p>
                    {cycle.description && <p className="text-xs text-[#6b8c65] mt-1">{cycle.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[#9ab894]">Produccion total</p>
                    <p className="text-lg font-black text-[#1a2e1a]">{formatGrams(totalNet)}</p>
                    <p className="text-xs text-[#5a8a52]">Stock: {formatGrams(totalStock)}</p>
                  </div>
                </div>
              </div>
              {lots.length > 0 && (
                <Table>
                  <thead><tr><th>Lote</th><th>Genetica</th><th>Estado</th><th>Produccion neta</th><th>Stock disponible</th></tr></thead>
                  <tbody>
                    {lots.map((lot: any) => (
                      <tr key={lot.id}>
                        <td className="font-mono font-medium">{lot.lot_code}</td>
                        <td>{lot.genetic?.name ?? "—"}</td>
                        <td>
                          <span className={`text-xs rounded-full px-2 py-0.5 font-bold border ${
                            lot.status === "finalizado" ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" :
                            lot.status === "en_proceso" ? "bg-[#fdf8ec] text-[#8a6010] border-[#e8d48a]" :
                            "bg-[#f5f5f5] text-[#888] border-[#ddd]"
                          }`}>
                            {lot.status === "en_proceso" ? "En proceso" : lot.status === "finalizado" ? "Finalizado" : "Descartado"}
                          </span>
                        </td>
                        <td className="tabular-nums">{lot.net_grams ? formatGrams(lot.net_grams) : "—"}</td>
                        <td className="tabular-nums font-medium text-[#2d6a1f]">{lot.stock_position ? formatGrams(lot.stock_position.available_grams) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {lots.length === 0 && (
                <div className="px-5 pb-4 text-xs text-[#9ab894]">Sin lotes asignados a este ciclo</div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
