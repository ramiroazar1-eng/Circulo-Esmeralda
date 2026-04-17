import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate, formatGrams } from "@/lib/utils"
import { Package, FlaskConical } from "lucide-react"
import NewLotModal from "./NewLotModal"
import EditLotModal from "./EditLotModal"
import QRDisplay from "@/components/qr/QRDisplay"

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  plantines:  { label: "Plantines",  color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  vegetativo: { label: "Vegetativo", color: "bg-green-50 text-green-700 border-green-200" },
  poda:       { label: "Poda",       color: "bg-lime-50 text-lime-700 border-lime-200" },
  floracion:  { label: "Floracion",  color: "bg-purple-50 text-purple-700 border-purple-200" },
  cosecha:    { label: "Cosecha",    color: "bg-amber-50 text-amber-700 border-amber-200" },
  secado:     { label: "Secado",     color: "bg-orange-50 text-orange-700 border-orange-200" },
  curado:     { label: "Curado",     color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  finalizado: { label: "Finalizado", color: "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" },
  descartado: { label: "Descartado", color: "bg-slate-50 text-slate-500 border-slate-200" },
  agotado:    { label: "Agotado",    color: "bg-red-50 text-red-700 border-red-200" },
}

export default async function TrazabilidadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canEdit = ["admin","biologo","director_de_cultivo","administrativo"].includes(profile?.role ?? "")

  const { data: lots } = await supabase
    .from("lots")
    .select("*, genetic:genetics(name), room:rooms(name), stock_position:stock_positions(available_grams)")
    .order("created_at", { ascending: false })

  const { data: genetics } = await supabase.from("genetics").select("id, name").eq("is_active", true)
  const { data: rooms } = await supabase.from("rooms").select("id, name").eq("is_active", true)
  const { data: stockData } = await supabase.from("stock_positions").select("available_grams")

  const totalStock = (stockData ?? []).reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const lotsList = (lots ?? []) as any[]
  const enProceso = lotsList.filter(l => !["finalizado","descartado","agotado"].includes(l.status)).length
  const finalizados = lotsList.filter(l => l.status === "finalizado").length

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader
        title="Trazabilidad"
        description="Lotes de produccion y movimientos de stock"
        actions={canEdit ? <NewLotModal genetics={genetics ?? []} rooms={rooms ?? []} /> : undefined}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Lotes en proceso" value={enProceso} icon={FlaskConical} />
        <StatCard label="Lotes finalizados" value={finalizados} icon={Package} variant="ok" />
        <StatCard label="Stock total disponible" value={formatGrams(totalStock)} />
      </div>
      <Card padding={false}>
        {lotsList.length === 0 ? (
          <EmptyState title="Sin lotes registrados" description="Crea el primer lote con el boton de arriba." icon={FlaskConical} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Genetica</th>
                <th>Sala</th>
                <th>Inicio</th>
                <th>Cosecha</th>
                <th>Estado</th>
                <th>Stock disponible</th>
                <th>QR</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {lotsList.map((lot: any) => {
                const statusConfig = STATUS_LABELS[lot.status] ?? { label: lot.status, color: "bg-slate-50 text-slate-500 border-slate-200" }
                return (
                  <tr key={lot.id}>
                    <td className="font-mono font-medium"><a href={`/trazabilidad/${lot.id}`} className="text-[#2d5a27] hover:underline">{lot.lot_code}</a></td>
                    <td>{lot.genetic?.name ?? "â€”"}</td>
                    <td>{lot.room?.name ?? "â€”"}</td>
                    <td>{lot.start_date ? formatDate(lot.start_date) : "â€”"}</td>
                    <td>{lot.harvest_date ? formatDate(lot.harvest_date) : <span className="text-[#9ab894]">â€”</span>}</td>
                    <td>
                      <span className={`text-xs rounded-full px-2.5 py-1 font-bold border ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="tabular-nums font-medium">
                      {lot.stock_position
                        ? <span className="text-[#2d6a1f] font-bold">{formatGrams(lot.stock_position.available_grams)}</span>
                        : <span className="text-[#9ab894]">{["finalizado","agotado"].includes(lot.status) ? "0.0g" : "En proceso"}</span>
                      }
                    </td>
                    <td>
                      <QRDisplay entityId={lot.id} entityType="lot" entityName={lot.lot_code} currentToken={lot.qr_token} />
                    </td>
                    {canEdit && (
                      <td>
                        <EditLotModal lot={lot} genetics={genetics ?? []} rooms={rooms ?? []} />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}

