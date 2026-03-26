import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate, formatGrams } from "@/lib/utils"
import { Package, FlaskConical } from "lucide-react"
import NewLotModal from "./NewLotModal"
import QRDisplay from "@/components/qr/QRDisplay"

export default async function TrazabilidadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canCreate = ["admin","biologo"].includes(profile?.role ?? "")

  const { data: lots } = await supabase
    .from("lots")
    .select("*, genetic:genetics(name), room:rooms(name), stock_position:stock_positions(available_grams)")
    .order("created_at", { ascending: false })

  const { data: genetics } = await supabase.from("genetics").select("id, name").eq("is_active", true)
  const { data: rooms } = await supabase.from("rooms").select("id, name").eq("is_active", true)
  const { data: stockData } = await supabase.from("stock_positions").select("available_grams")

  const totalStock = (stockData ?? []).reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const lotsList = (lots ?? []) as any[]
  const enProceso = lotsList.filter(l => l.status === "en_proceso").length
  const finalizados = lotsList.filter(l => l.status === "finalizado").length

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader
        title="Trazabilidad"
        description="Lotes de produccion y movimientos de stock"
        actions={canCreate ? <NewLotModal genetics={genetics ?? []} rooms={rooms ?? []} /> : undefined}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Lotes en proceso" value={enProceso} icon={FlaskConical} />
        <StatCard label="Lotes finalizados" value={finalizados} icon={Package} />
        <StatCard label="Stock total disponible" value={formatGrams(totalStock)} />
      </div>
      <Card padding={false}>
        {lotsList.length === 0 ? (
          <EmptyState
            title="Sin lotes registrados"
            description="Crea el primer lote con el boton de arriba."
            icon={FlaskConical}
          />
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
              </tr>
            </thead>
            <tbody>
              {lotsList.map((lot: any) => (
                <tr key={lot.id}>
                  <td className="font-mono font-medium">{lot.lot_code}</td>
                  <td>{lot.genetic?.name ?? "—"}</td>
                  <td>{lot.room?.name ?? "—"}</td>
                  <td>{formatDate(lot.start_date)}</td>
                  <td>{lot.harvest_date ? formatDate(lot.harvest_date) : <span className="text-slate-400">—</span>}</td>
                  <td>
                    <span className={`text-xs rounded px-1.5 py-0.5 border ${
                      lot.status === "finalizado" ? "bg-green-50 text-green-700 border-green-200" :
                      lot.status === "en_proceso" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-slate-50 text-slate-500 border-slate-200"
                    }`}>
                      {lot.status === "en_proceso" ? "En proceso" : lot.status === "finalizado" ? "Finalizado" : "Descartado"}
                    </span>
                  </td>
                  <td className="tabular-nums font-medium">
                    {lot.stock_position ? formatGrams(lot.stock_position.available_grams) : "—"}
                  </td>
                  <td>
                    <QRDisplay
                      entityId={lot.id}
                      entityType="lot"
                      entityName={lot.lot_code}
                      currentToken={lot.qr_token}
                    />
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
