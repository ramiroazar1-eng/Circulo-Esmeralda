import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { BackButton } from "@/components/ui/BackButton"
import { Card, SectionHeader } from "@/components/ui"
import { formatDate, formatGrams } from "@/lib/utils"
import EditLotModal from "../EditLotModal"
import QRDisplay from "@/components/qr/QRDisplay"

const TIMELINE_STEPS = [
  { key: "seedling_date",     label: "Plantines" },
  { key: "veg_date",          label: "Vegetativo" },
  { key: "pruning_date",      label: "Poda" },
  { key: "flower_date",       label: "Floracion" },
  { key: "harvest_date",      label: "Cosecha" },
  { key: "drying_start_date", label: "Secado" },
  { key: "curing_start_date", label: "Curado" },
]

const EVENT_LABELS: Record<string, string> = {
  poda: "Poda", nutrientes: "Nutrientes", tratamiento: "Tratamiento / preventivo",
  transplante: "Transplante", riego: "Riego", defoliacion: "Defoliacion",
  traslado: "Traslado", incidente: "Incidente", descarte: "Descarte parcial", otro: "Otro"
}

function daysBetween(d1: string, d2: string) {
  return Math.round((new Date(d2).getTime() - new Date(d1).getTime()) / (1000*60*60*24))
}

export default async function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canEdit = ["admin","biologo","administrativo"].includes(profile?.role ?? "")

  const [lotRes, geneticsRes, roomsRes, eventsRes, costsRes, supplyMovementsRes] = await Promise.all([
    supabase.from("lots")
      .select("*, genetic:genetics(name, strain_type, thc_percentage, cbd_percentage), room:rooms(name), stock_position:stock_positions(available_grams, reserved_grams), cycle:production_cycles(name, id)")
      .eq("id", id).single(),
    supabase.from("genetics").select("id, name").eq("is_active", true),
    supabase.from("rooms").select("id, name").eq("is_active", true),
    supabase.from("cycle_events")
      .select("id, event_type, event_date, notes, room:rooms(name), is_locked")
      .eq("lot_id", id)
      .order("event_date", { ascending: false }),
    supabase.from("v_lot_costs").select("*").eq("lot_id", id).maybeSingle(),
    supabase.from("supply_movements")
      .select("id, movement_type, quantity, unit_cost, total_cost, movement_date, notes, supply_product:supply_products(name, unit)")
      .eq("lot_id", id)
      .eq("movement_type", "consumo")
      .order("movement_date", { ascending: false }),
  ])

  const lot = lotRes.data
  if (!lot) notFound()
  const genetics = geneticsRes.data ?? []
  const rooms = roomsRes.data ?? []
  const events = (eventsRes.data ?? []) as any[]
  const costs = costsRes.data as any
  const supplyMovements = (supplyMovementsRes.data ?? []) as any[]

  const steps = TIMELINE_STEPS.map((step, i) => {
    const date = (lot as any)[step.key]
    const nextStep = TIMELINE_STEPS[i + 1]
    const nextDate = nextStep ? (lot as any)[nextStep.key] : null
    const days = date && nextDate ? daysBetween(date, nextDate) : null
    return { ...step, date, days }
  })
  const completedSteps = steps.filter(s => s.date).length
  const progress = Math.round((completedSteps / steps.length) * 100)
  const stockPosition = (lot as any).stock_position
  const dispensed = stockPosition && lot.net_grams
    ? Math.max((lot.net_grams ?? 0) - stockPosition.available_grams - stockPosition.reserved_grams, 0)
    : null

  const totalSupplyCost = supplyMovements.reduce((acc, m) => acc + (m.total_cost ?? 0), 0)
  const costPerGramSupply = lot.net_grams && lot.net_grams > 0 && totalSupplyCost > 0
    ? (totalSupplyCost / lot.net_grams).toFixed(2)
    : null

  return (
    <div className="space-y-5">
      <BackButton label="Volver a trazabilidad" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a2e1a] font-mono">{lot.lot_code}</h1>
          <p className="text-[#6b8c65] text-sm mt-0.5">
            {(lot as any).genetic?.name ?? "Sin genetica"} - {(lot as any).room?.name ?? "Sin sala"}
            {(lot as any).cycle && ` - ${(lot as any).cycle.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QRDisplay entityId={lot.id} entityType="lot" entityName={lot.lot_code} currentToken={lot.qr_token} />
          {canEdit && <EditLotModal lot={lot} genetics={genetics} rooms={rooms} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-2">
          <SectionHeader title="Timeline del ciclo" />
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[#9ab894] mb-1">
              <span>Progreso</span>
              <span>{completedSteps}/{steps.length} etapas - {progress}%</span>
            </div>
            <div className="w-full bg-[#f0f4f0] rounded-full h-2">
              <div className="h-2 rounded-full bg-[#2d5a27]" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div>
            {steps.map((step, i) => (
              <div key={step.key} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: step.date ? "#2d5a27" : "#f0f4f0", border: step.date ? "none" : "2px solid #ddecd8" }}>
                    {step.date
                      ? <span className="text-white text-xs font-bold">ok</span>
                      : <span className="text-[#c8dcc4] text-xs">{i + 1}</span>
                    }
                  </div>
                  {i < steps.length - 1 && <div className="w-0.5 h-8" style={{ background: step.date ? "#ddecd8" : "#f0f4f0" }} />}
                </div>
                <div className="pb-6 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${step.date ? "text-[#1a2e1a]" : "text-[#c8dcc4]"}`}>{step.label}</p>
                    {step.date && <p className="text-xs text-[#6b8c65]">{formatDate(step.date)}</p>}
                  </div>
                  {step.days !== null && step.days > 0 && <p className="text-xs text-[#9ab894] mt-0.5">{step.days} dias hasta siguiente etapa</p>}
                  {step.key === "curing_start_date" && lot.curing_days && <p className="text-xs text-[#9ab894] mt-0.5">{lot.curing_days} dias de curado</p>}
                  {!step.date && <p className="text-xs text-[#c8dcc4] mt-0.5">Pendiente</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionHeader title="Stock" />
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-[#9ab894]">Stock inicial</dt><dd className="font-semibold text-[#1a2e1a]">{lot.net_grams ? formatGrams(lot.net_grams) : "-"}</dd></div>
              {stockPosition && (
                <>
                  <div><dt className="text-xs text-[#9ab894]">Stock disponible</dt><dd className="font-semibold text-[#2d6a1f]">{formatGrams(stockPosition.available_grams)}</dd></div>
                  {stockPosition.reserved_grams > 0 && <div><dt className="text-xs text-[#9ab894]">Reservado (pedidos)</dt><dd className="font-semibold text-amber-600">{formatGrams(stockPosition.reserved_grams)}</dd></div>}
                  {dispensed !== null && dispensed > 0 && <div><dt className="text-xs text-[#9ab894]">Dispensado</dt><dd className="font-semibold text-red-500">{formatGrams(dispensed)}</dd></div>}
                </>
              )}
            </dl>
          </Card>

          <Card>
            <SectionHeader title="Costos del lote" />
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-[#9ab894]">Insumos consumidos</dt>
                <dd className="font-semibold text-[#1a2e1a]">{totalSupplyCost > 0 ? `$${totalSupplyCost.toLocaleString("es-AR")}` : "-"}</dd>
              </div>
              {costs?.total_cost > 0 && (
                <div>
                  <dt className="text-xs text-[#9ab894]">Gastos del ciclo asignados</dt>
                  <dd className="font-semibold text-[#1a2e1a]">${parseFloat(costs.total_cost).toLocaleString("es-AR")}</dd>
                </div>
              )}
              {costPerGramSupply && (
                <div className="pt-2 border-t border-[#eef5ea]">
                  <dt className="text-xs text-[#9ab894]">Costo por gramo (insumos)</dt>
                  <dd className="text-lg font-black text-[#2d6a1f]">${costPerGramSupply}</dd>
                </div>
              )}
              {costs?.cost_per_gram && (
                <div className="pt-2 border-t border-[#eef5ea]">
                  <dt className="text-xs text-[#9ab894]">Costo por gramo (ciclo)</dt>
                  <dd className="text-lg font-black text-[#1a2e1a]">${parseFloat(costs.cost_per_gram).toFixed(2)}</dd>
                </div>
              )}
            </dl>
          </Card>

          {(lot as any).genetic && (
            <Card>
              <SectionHeader title="Genetica" />
              <dl className="space-y-2 text-sm">
                <div><dt className="text-xs text-[#9ab894]">Variedad</dt><dd className="font-semibold">{(lot as any).genetic.name}</dd></div>
                {(lot as any).genetic.strain_type && <div><dt className="text-xs text-[#9ab894]">Tipo</dt><dd className="capitalize">{(lot as any).genetic.strain_type}</dd></div>}
                {(lot as any).genetic.thc_percentage && <div><dt className="text-xs text-[#9ab894]">THC</dt><dd className="font-semibold">{(lot as any).genetic.thc_percentage}%</dd></div>}
                {(lot as any).genetic.cbd_percentage && <div><dt className="text-xs text-[#9ab894]">CBD</dt><dd className="font-semibold">{(lot as any).genetic.cbd_percentage}%</dd></div>}
              </dl>
            </Card>
          )}

          {lot.notes && <Card><SectionHeader title="Notas" /><p className="text-sm text-[#6b8c65]">{lot.notes}</p></Card>}
        </div>
      </div>

      {supplyMovements.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Insumos consumidos" />
            <p className="text-xs text-[#6b8c65] mt-1">Total: <span className="font-bold text-[#1a2e1a]">${totalSupplyCost.toLocaleString("es-AR")}</span></p>
          </div>
          <div className="divide-y divide-[#f5faf3]">
            {supplyMovements.map((m: any) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#1a2e1a]">{m.supply_product?.name ?? "-"}</p>
                  <p className="text-xs text-[#9ab894]">{formatDate(m.movement_date)} - {m.quantity} {m.supply_product?.unit ?? ""}{m.unit_cost ? ` - $${m.unit_cost}/u` : ""}</p>
                  {m.notes && <p className="text-xs text-[#6b8c65] italic">{m.notes}</p>}
                </div>
                <span className="text-sm font-bold text-[#1a2e1a] shrink-0 ml-4">
                  {m.total_cost ? `$${parseFloat(m.total_cost).toLocaleString("es-AR")}` : "-"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {events.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4"><SectionHeader title="Eventos registrados en este lote" /></div>
          <div className="divide-y divide-[#f5faf3]">
            {events.map((ev: any) => (
              <div key={ev.id} className="px-5 py-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#1a2e1a]">{EVENT_LABELS[ev.event_type] ?? ev.event_type}</p>
                    {ev.is_locked && <span className="text-xs bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">Cerrado</span>}
                  </div>
                  {ev.notes && <p className="text-xs text-[#6b8c65] mt-0.5">{ev.notes}</p>}
                  {ev.room && <p className="text-xs text-[#9ab894] mt-0.5">{ev.room.name}</p>}
                </div>
                <span className="text-xs text-[#9ab894] shrink-0 ml-4">{formatDate(ev.event_date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}