import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { FlaskConical } from "lucide-react"
import { Card, SectionHeader } from "@/components/ui"
import { formatDate } from "@/lib/utils"
import CycleRoomPanel from "./CycleRoomPanel"

export default async function DashboardCiclo({ role }: { role: string }) {
  const supabase = await createClient()
  const canSeeCultivo = ["admin","administrativo","biologo","director_de_cultivo"].includes(role)
  if (!canSeeCultivo) return null

  const [activeCycleRes, activePlantsRes, dashProductsRes] = await Promise.all([
    supabase.from("production_cycles").select("id, name, start_date, cycle_type, lots(id, lot_code, status, seedling_date, plant_count, genetic:genetics(name), room:rooms(name))").eq("status", "activo").order("start_date", { ascending: false }),
    supabase.from("v_active_plants").select("room_id, room_name, plant_count, plants_veg, plants_flower, plants_seedling, square_meters"),
    supabase.from("v_supply_stock").select("id, name, unit, stock_actual, last_unit_cost").eq("is_active", true).gt("stock_actual", 0),
  ])

  const activeCycles = (activeCycleRes.data ?? []) as any[]
  const cycle = activeCycles.find((c: any) => c.cycle_type === "productivo") ?? activeCycles[0] ?? null
  if (!cycle) return null

  const lots = (cycle.lots ?? []) as any[]
  const activePlants = (activePlantsRes.data ?? []) as any[]
  const dashProducts = (dashProductsRes.data ?? []) as any[]
  const totalActivePlants = activePlants.reduce((acc: number, r: any) => acc + (r.plant_count ?? 0), 0)

  return (
    <Card padding={false}>
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div>
          <SectionHeader title={`Ciclo activo — ${cycle.name}`} />
          <p className="text-xs text-slate-500 -mt-3">
            Desde {formatDate(cycle.start_date)} · {lots.length} lote{lots.length !== 1 ? "s" : ""} · {totalActivePlants} plantas activas
          </p>
        </div>
        <Link href={`/ciclos/${cycle.id}`} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 shrink-0">
          Ver ciclo <span className="w-3 h-3">→</span>
        </Link>
      </div>
      <div className="px-5 pb-5">
        <CycleRoomPanel
          cycleId={cycle.id}
          rooms={activePlants}
          lots={lots}
          products={dashProducts}
          allRooms={activePlants.map((r: any) => ({ id: r.room_id, name: r.room_name, square_meters: r.square_meters }))}
        />
        <div className="flex gap-2 mt-3">
          <Link href={`/ciclos/${cycle.id}/timeline`} className="text-xs text-[#2d5a27] hover:underline flex items-center gap-1">
            <FlaskConical className="w-3 h-3" />Ver linea de tiempo
          </Link>
        </div>
      </div>
    </Card>
  )
}
