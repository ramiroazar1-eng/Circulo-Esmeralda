import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BackButton } from "@/components/ui/BackButton"
import { formatGrams } from "@/lib/utils"
import ComparativaCharts from "./ComparativaCharts"

export default async function ComparativaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","administrativo","biologo"].includes(profile?.role ?? "")) redirect("/dashboard")

  const { data: cycles } = await supabase
    .from("production_cycles")
    .select("*, lots(id, lot_code, net_grams, gross_grams, genetic:genetics(name))")
    .order("start_date", { ascending: false })

  const { data: allocations } = await supabase
    .from("cycle_expense_allocations")
    .select("cycle_id, allocated_amount")

  const { data: supplyMovements } = await supabase
    .from("supply_movements")
    .select("cycle_id, total_cost")
    .eq("movement_type", "consumo")
    .not("cycle_id", "is", null)

  const cycleList = (cycles ?? []) as any[]

  const costByCycle: Record<string, number> = {}
  for (const a of (allocations ?? [])) {
    costByCycle[a.cycle_id] = (costByCycle[a.cycle_id] ?? 0) + parseFloat(a.allocated_amount)
  }
  for (const m of (supplyMovements ?? [])) {
    if (m.total_cost) {
      costByCycle[m.cycle_id] = (costByCycle[m.cycle_id] ?? 0) + parseFloat(m.total_cost)
    }
  }

  const data = cycleList.map((cycle: any) => {
    const lots = (cycle.lots ?? []) as any[]
    const totalNet = lots.reduce((acc: number, l: any) => acc + (l.net_grams ?? 0), 0)
    const totalGross = lots.reduce((acc: number, l: any) => acc + (l.gross_grams ?? 0), 0)
    const totalCost = costByCycle[cycle.id] ?? 0
    const costPerGram = totalNet > 0 && totalCost > 0 ? totalCost / totalNet : null
    const genetics = [...new Set(lots.map((l: any) => l.genetic?.name).filter(Boolean))]
    const startDate = cycle.start_date
    const endDate = cycle.end_date ?? new Date().toISOString().split("T")[0]
    const durationDays = startDate
      ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000*60*60*24))
      : null

    return {
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      totalNet,
      totalGross,
      totalCost,
      costPerGram,
      durationDays,
      lotsCount: lots.length,
      genetics,
    }
  })

  return (
    <div className="space-y-5">
      <BackButton label="Volver a ciclos" />
      <div>
        <h1 className="text-xl font-bold text-[#1a2e1a]">Comparativa de ciclos</h1>
        <p className="text-sm text-[#6b8c65] mt-0.5">{data.length} ciclos registrados</p>
      </div>

      <ComparativaCharts data={data} />
    </div>
  )
}