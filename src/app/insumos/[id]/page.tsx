import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { BackButton } from "@/components/ui/BackButton"
import { Card, SectionHeader, StatCard } from "@/components/ui"
import { formatDate } from "@/lib/utils"
import { Package, TrendingDown, TrendingUp, ArrowUpDown } from "lucide-react"

const MOVEMENT_LABELS: Record<string, { label: string; color: string; sign: string }> = {
  compra:  { label: "Compra",  color: "text-green-600",  sign: "+" },
  consumo: { label: "Consumo", color: "text-red-500",    sign: "-" },
  ajuste:  { label: "Ajuste",  color: "text-blue-500",   sign: "~" },
  merma:   { label: "Merma",   color: "text-amber-500",  sign: "-" },
}

const CATEGORY_LABELS: Record<string, string> = {
  fertilizante: "Fertilizante", sustrato: "Sustrato", packaging: "Packaging",
  limpieza: "Limpieza", herramienta: "Herramienta", preventivo: "Preventivo", otro: "Otro"
}

export default async function SupplyProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","administrativo","biologo","director_de_cultivo"].includes(profile?.role ?? "")) redirect("/dashboard")

  const [productRes, movementsRes] = await Promise.all([
    supabase.from("v_supply_stock").select("*").eq("id", id).single(),
    supabase.from("supply_movements")
      .select("id, movement_type, quantity, unit_cost, total_cost, movement_date, notes, cycle:production_cycles(name), lot:lots(lot_code), room:rooms(name), created_by_profile:profiles!supply_movements_created_by_fkey(full_name)")
      .eq("supply_product_id", id)
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ])

  if (!productRes.data) notFound()
  const product = productRes.data as any
  const movements = (movementsRes.data ?? []) as any[]

  const totalComprado = movements.filter(m => m.movement_type === "compra").reduce((acc, m) => acc + m.quantity, 0)
  const totalConsumido = movements.filter(m => m.movement_type === "consumo").reduce((acc, m) => acc + m.quantity, 0)
  const totalGastado = movements.filter(m => m.movement_type === "compra").reduce((acc, m) => acc + (m.total_cost ?? 0), 0)

  return (
    <div className="space-y-5">
      <BackButton label="Volver a insumos" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {CATEGORY_LABELS[product.category] ?? product.category} - unidad: {product.unit}
            {product.last_unit_cost && ` - ultimo precio: $${product.last_unit_cost}/${product.unit}`}
          </p>
        </div>
        <div className={`text-right px-4 py-2 rounded-xl border ${product.stock_actual <= product.stock_alert_threshold && product.stock_alert_threshold > 0 ? "bg-red-50 border-red-200" : "bg-[#edf7e8] border-[#b8daa8]"}`}>
          <p className="text-2xl font-black text-[#1a2e1a]">{product.stock_actual}</p>
          <p className="text-xs text-[#9ab894]">{product.unit} disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Total comprado" value={`${totalComprado} ${product.unit}`} icon={TrendingUp} variant="ok" />
        <StatCard label="Total consumido" value={`${totalConsumido} ${product.unit}`} icon={TrendingDown} />
        <StatCard label="Total invertido" value={`$${totalGastado.toLocaleString("es-AR")}`} icon={Package} />
      </div>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Historial de movimientos" />
          <p className="text-xs text-slate-500 mt-1">{movements.length} movimientos registrados</p>
        </div>
        {movements.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="text-sm text-slate-400">Sin movimientos registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {movements.map((m: any) => {
              const config = MOVEMENT_LABELS[m.movement_type] ?? { label: m.movement_type, color: "text-slate-600", sign: "" }
              return (
                <div key={m.id} className="px-5 py-3 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      m.movement_type === "compra" ? "bg-green-100" :
                      m.movement_type === "consumo" ? "bg-red-100" :
                      m.movement_type === "ajuste" ? "bg-blue-100" : "bg-amber-100"
                    }`}>
                      <ArrowUpDown className={`w-3.5 h-3.5 ${config.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
                        <span className="text-sm text-slate-900">{config.sign}{m.quantity} {product.unit}</span>
                        {m.unit_cost && <span className="text-xs text-slate-400">a ${m.unit_cost}/{product.unit}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400">{formatDate(m.movement_date)}</span>
                        {m.cycle && <span className="text-xs bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] rounded px-1.5 py-0.5">{m.cycle.name}</span>}
                        {m.lot && <span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{m.lot.lot_code}</span>}
                        {m.room && <span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{m.room.name}</span>}
                      </div>
                      {m.notes && <p className="text-xs text-slate-500 italic mt-0.5">{m.notes}</p>}
                      {m.created_by_profile && <p className="text-xs text-slate-400 mt-0.5">{m.created_by_profile.full_name}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {m.total_cost ? (
                      <p className={`text-sm font-bold ${m.movement_type === "compra" ? "text-green-600" : "text-red-500"}`}>
                        {m.movement_type === "compra" ? "+" : "-"}${parseFloat(m.total_cost).toLocaleString("es-AR")}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300">-</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
