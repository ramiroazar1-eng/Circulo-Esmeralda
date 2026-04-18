import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { FlaskConical, Sprout } from "lucide-react"
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
  if (activeCycles.length === 0) return null

  const activePlants = (activePlantsRes.data ?? []) as any[]
  const dashProducts = (dashProductsRes.data ?? []) as any[]
  const totalActivePlants = activePlants.reduce((acc: number, r: any) => acc + (r.plant_count ?? 0), 0)

  const productivo = activeCycles.find((c: any) => c.cycle_type === "productivo")
  const reproductivo = activeCycles.find((c: any) => c.cycle_type === "reproductivo")

  return (
    <div className="space-y-4">
      {/* Ciclo productivo */}
      {productivo && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <SectionHeader title={`Ciclo activo — ${productivo.name}`} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 -mt-3">Productivo</span>
              </div>
              <p className="text-xs text-slate-500 -mt-3">
                Desde {formatDate(productivo.start_date)} · {(productivo.lots ?? []).length} lotes · {totalActivePlants} plantas activas
              </p>
            </div>
            <Link href={`/ciclos/${productivo.id}`} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 shrink-0">
              Ver ciclo →
            </Link>
          </div>
          <div className="px-5 pb-5">
            <CycleRoomPanel
              cycleId={productivo.id}
              rooms={activePlants}
              lots={productivo.lots ?? []}
              products={dashProducts}
              allRooms={activePlants.map((r: any) => ({ id: r.room_id, name: r.room_name, square_meters: r.square_meters }))}
            />
            <div className="flex gap-2 mt-3">
              <Link href={`/ciclos/${productivo.id}/timeline`} className="text-xs text-[#2d5a27] hover:underline flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />Ver linea de tiempo
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Ciclo reproductivo */}
      {reproductivo && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <SectionHeader title={`${reproductivo.name}`} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 -mt-3">Reproductivo</span>
              </div>
              <p className="text-xs text-slate-500 -mt-3">
                Madres en vege continuo · {(reproductivo.lots ?? []).length} lotes · Desde {formatDate(reproductivo.start_date)}
              </p>
            </div>
            <Link href={`/ciclos/${reproductivo.id}`} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 shrink-0">
              Ver ciclo →
            </Link>
          </div>
          <div className="px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {(reproductivo.lots ?? []).filter((l: any) => ["plantines","vegetativo","floracion"].includes(l.status)).map((l: any) => (
                <Link key={l.id} href={`/trazabilidad/${l.id}`}
                  className="flex items-center gap-2 bg-[#f5faf3] border border-[#ddecd8] rounded-lg px-3 py-2 hover:border-[#4d8a3d] transition-colors">
                  <Sprout className="w-3 h-3 text-[#2d5a27]" />
                  <div>
                    <p className="text-xs font-medium text-[#1a2e1a]">{l.lot_code}</p>
                    <p className="text-xs text-[#9ab894]">{l.genetic?.name ?? "-"} · {l.plant_count ?? 0} plantas</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Link href={`/ciclos/${reproductivo.id}/timeline`} className="text-xs text-[#2d5a27] hover:underline flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />Ver linea de tiempo
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
