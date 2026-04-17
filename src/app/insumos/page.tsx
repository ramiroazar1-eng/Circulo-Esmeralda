import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { Package, AlertTriangle } from "lucide-react"
import NewSupplyProductModal from "./NewSupplyProductModal"
import NewSupplyMovementModal from "./NewSupplyMovementModal"
import type { SupplyStock } from "@/types"

const CATEGORY_LABELS: Record<string, string> = {
  fertilizante: "Fertilizante", sustrato: "Sustrato", packaging: "Packaging",
  limpieza: "Limpieza", herramienta: "Herramienta", preventivo: "Preventivo", otro: "Otro"
}

export default async function InsumosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canEdit = ["admin","biologo","director_de_cultivo"].includes(profile?.role ?? "")

  const { data: stockRaw } = await supabase
    .from("supply_products").select("id, name, category, unit, stock_alert_threshold, is_active, last_unit_cost, stock_actual:supply_movements(quantity, movement_type)")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("name")

  const { data: cycles } = await supabase
    .from("production_cycles")
    .select("id, name")
    .eq("status", "activo")
    .order("start_date", { ascending: false })

  const { data: lots } = await supabase
    .from("lots")
    .select("id, lot_code")
    .not("status", "in", "(finalizado,descartado,agotado)")
    .order("created_at", { ascending: false })

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("is_active", true)

  const stock = (stockRaw ?? []) as SupplyStock[]
  const bajoStock = stock.filter(s => s.stock_actual <= s.stock_alert_threshold && s.stock_alert_threshold > 0)
  const totalProductos = stock.length

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader
        title="Insumos"
        description="Stock de insumos de cultivo y operativos"
        actions={canEdit ? <NewSupplyProductModal /> : undefined}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Productos activos" value={totalProductos} icon={Package} />
        <StatCard label="Bajo stock" value={bajoStock.length} variant={bajoStock.length > 0 ? "critico" : "ok"} icon={AlertTriangle} />
        <StatCard label="Ciclos activos" value={(cycles ?? []).length} icon={Package} />
      </div>

      {bajoStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-700 mb-1">Productos con stock bajo</p>
          <div className="flex flex-wrap gap-2">
            {bajoStock.map(s => (
              <span key={s.id} className="text-xs bg-red-100 text-red-700 border border-red-200 rounded-full px-2.5 py-1">
                {s.name} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â {s.stock_actual} {s.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Stock actual</h2>
          {canEdit && (
            <NewSupplyMovementModal
              products={stock}
              cycles={cycles ?? []}
              lots={lots ?? []}
              rooms={rooms ?? []}
            />
          )}
        </div>
        {stock.length === 0 ? (
          <div className="pb-5">
            <EmptyState title="Sin insumos registrados" description="Agrega productos al catalogo para comenzar." icon={Package} />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoria</th>
                <th>Stock actual</th>
                <th>Alerta</th>
              </tr>
            </thead>
            <tbody>
              {stock.map(s => (
                <tr key={s.id}>
                  <td className="font-medium text-slate-900"><a href={`/insumos/${s.id}`} className="hover:text-[#2d5a27] hover:underline">{s.name}</a></td>
                  <td><span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">{CATEGORY_LABELS[s.category] ?? s.category}</span></td>
                  <td className={`font-bold tabular-nums ${s.stock_actual <= s.stock_alert_threshold && s.stock_alert_threshold > 0 ? "text-red-600" : "text-slate-900"}`}>
                    {s.stock_actual} {s.unit}
                  </td>
                  <td className="text-slate-400 tabular-nums text-sm">
                    {s.stock_alert_threshold > 0 ? `min. ${s.stock_alert_threshold} ${s.unit}` : "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}

