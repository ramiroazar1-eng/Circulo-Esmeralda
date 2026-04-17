import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { BackButton } from "@/components/ui/BackButton"
import { Card, SectionHeader } from "@/components/ui"
import { formatDate, formatGrams } from "@/lib/utils"
import Link from "next/link"
import NewExpenseModal from "./NewExpenseModal"
import NewEventModal from "./NewEventModal"
import CloseCycleButton from "./CloseCycleButton"
import DailyClosureModal from "./DailyClosureModal"
import QuickActionsPanel from "./QuickActionsPanel"
import PeriodPdfButton from "./PeriodPdfButton"

const ETAPAS = [
  { key: "seedling_date",     label: "Plantines" },
  { key: "veg_date",          label: "Vegetativo" },
  { key: "flower_date",       label: "Floracion" },
  { key: "harvest_date",      label: "Cosecha" },
  { key: "drying_start_date", label: "Secado" },
  { key: "curing_start_date", label: "Curado" },
]

const EVENT_LABELS: Record<string, string> = {
  poda: "Poda", nutrientes: "Nutrientes", tratamiento: "Tratamiento",
  transplante: "Transplante", riego: "Riego", defoliacion: "Defoliacion",
  traslado: "Traslado", incidente: "Incidente", descarte: "Descarte parcial", otro: "Otro"
}

const CATEGORY_LABELS: Record<string, string> = {
  sueldo: "Sueldo", alquiler: "Alquiler", expensas: "Expensas",
  servicios: "Servicios", insumos: "Insumos", equipamiento: "Equipamiento",
  mantenimiento: "Mantenimiento", otros: "Otros"
}

function daysBetween(d1: string, d2: string) {
  return Math.round((new Date(d2).getTime() - new Date(d1).getTime()) / (1000*60*60*24))
}

export default async function CycleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const role = profile?.role ?? ""
  const isAdmin = role === "admin"
  const canEdit = ["admin","biologo","director_de_cultivo","director_de_cultivo","administrativo"].includes(role)

  const [cycleRes, expensesRes, eventsRes, roomsRes, closuresRes, productsRes] = await Promise.all([
    supabase.from("production_cycles")
      .select("*, lots(id, lot_code, status, net_grams, gross_grams, seedling_date, veg_date, flower_date, harvest_date, drying_start_date, drying_days, curing_start_date, curing_days, plant_count, genetic:genetics(name), room:rooms(name))")
      .eq("id", id).single(),
    supabase.from("cycle_expense_allocations")
      .select("allocated_amount, expense:cycle_expenses(id, category, description, supplier, total_amount, useful_cycles, purchase_date, notes)")
      .eq("cycle_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("cycle_events")
      .select("id, event_type, event_date, notes, lot:lots(lot_code), room:rooms(name), is_locked")
      .eq("cycle_id", id)
      .order("event_date", { ascending: false }),
    supabase.from("rooms").select("id, name").eq("is_active", true),
    supabase.from("daily_closures")
      .select("id, closure_date, events_count, events_hash, closed_by_profile:profiles!daily_closures_closed_by_fkey(full_name)")
      .eq("cycle_id", id)
      .order("closure_date", { ascending: false }),
    supabase.from("v_supply_stock").select("id, name, unit, stock_actual, last_unit_cost").eq("is_active", true).order("name"),
  ])

  if (!cycleRes.data) notFound()
  const cycle = cycleRes.data
  const expenses = (expensesRes.data ?? []) as any[]
  const events = (eventsRes.data ?? []) as any[]
  const lots = (cycle.lots ?? []) as any[]
  const rooms = (roomsRes.data ?? []) as any[]
  const closures = (closuresRes.data ?? []) as any[]
  const products = (productsRes.data ?? []) as any[]

  const totalNet = lots.reduce((acc: number, l: any) => acc + (l.net_grams ?? 0), 0)
  const totalGross = lots.reduce((acc: number, l: any) => acc + (l.gross_grams ?? 0), 0)
  const genetics = [...new Set(lots.map((l: any) => l.genetic?.name).filter(Boolean))]
  const totalExpenses = expenses.reduce((acc: number, e: any) => acc + parseFloat(e.allocated_amount), 0)
  const totalPlants = lots.reduce((acc: number, l: any) => acc + (l.plant_count ?? 0), 0)
  const costPerGram = totalNet > 0 && totalExpenses > 0 ? (totalExpenses / totalNet).toFixed(2) : null

  const startDate = cycle.start_date
  const endDate = cycle.end_date
  const durationDays = startDate && endDate
    ? daysBetween(startDate, endDate)
    : startDate ? Math.round((Date.now() - new Date(startDate).getTime()) / (1000*60*60*24)) : null

  const avgEtapas = ETAPAS.map((etapa, idx) => {
    const next = ETAPAS[idx + 1]
    if (!next) return null
    const values = lots.map((l: any) => {
      const d1 = l[etapa.key]; const d2 = l[next.key]
      if (!d1 || !d2) return null
      return daysBetween(d1, d2)
    }).filter((v: number | null): v is number => v !== null)
    const avg = values.length > 0 ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : null
    return avg !== null ? { label: etapa.label, avg } : null
  }).filter(Boolean) as { label: string; avg: number }[]

  const expensesByCategory = expenses.reduce((acc: Record<string, number>, e: any) => {
    const cat = e.expense?.category ?? "otros"
    acc[cat] = (acc[cat] ?? 0) + parseFloat(e.allocated_amount)
    return acc
  }, {})

  // Agrupar lotes por sala
  const lotsBySala: Record<string, { room_name: string; lots: any[] }> = {}
  for (const lot of lots) {
    const roomKey = lot.room?.name ?? "Sin sala"
    if (!lotsBySala[roomKey]) lotsBySala[roomKey] = { room_name: roomKey, lots: [] }
    lotsBySala[roomKey].lots.push(lot)
  }
  const salasList = Object.values(lotsBySala).sort((a, b) => a.room_name.localeCompare(b.room_name))

  const lotsForPanel = lots.map((l: any) => ({
    id: l.id,
    lot_code: l.lot_code,
    status: l.status,
    genetic_name: l.genetic?.name ?? null,
    room_name: l.room?.name ?? null,
    room_id: l.room_id ?? null,
  }))

  return (
    <div className="space-y-5">
      <BackButton label="Volver a ciclos" />
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[#1a2e1a]">{cycle.name}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cycle.status === "activo" ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" : "bg-[#f0f4f0] text-[#5a8a52] border-[#c8dcc4]"}`}>
              {cycle.status === "activo" ? "Activo" : "Finalizado"}
            </span>
          </div>
          <p className="text-sm text-[#6b8c65]">
            {formatDate(cycle.start_date)}{cycle.end_date && ` -> ${formatDate(cycle.end_date)}`}{durationDays && ` - ${durationDays} dias totales`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/ciclos/${id}/timeline`} className="inline-flex items-center gap-1.5 text-xs bg-white border border-[#ddecd8] hover:border-[#4d8a3d] text-[#2d5a27] font-medium rounded-lg px-3 py-2 transition-colors">
            Ver linea de tiempo
          </Link>
          {["admin","biologo","director_de_cultivo","director_de_cultivo","administrativo"].includes(role) && (
            <Link href={`/ciclos/${id}/biologo`} className="inline-flex items-center gap-1.5 text-xs bg-[#edf7e8] border border-[#b8daa8] hover:border-[#4d8a3d] text-[#2d5a27] font-medium rounded-lg px-3 py-2 transition-colors">
              Trazabilidad biologo
            </Link>
          )}
          {canEdit && <PeriodPdfButton cycleId={id} />}
          {cycle.status === "activo" && ["admin","biologo","director_de_cultivo","director_de_cultivo","administrativo"].includes(role) && (
            <DailyClosureModal cycleId={id} closures={closures} />
          )}
          {cycle.status === "activo" && isAdmin && <CloseCycleButton cycleId={id} cycleName={cycle.name} cycleType={cycle.cycle_type ?? "productivo"} />}
          {isAdmin && cycle.status === "activo" && <NewExpenseModal cycleId={id} />}
          {["admin","biologo","director_de_cultivo","director_de_cultivo"].includes(role) && cycle.status === "activo" && (
            <NewEventModal cycleId={id} lots={lotsForPanel} rooms={rooms} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-[#ddecd8] rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-[#1a2e1a]">{formatGrams(totalNet)}</p>
          <p className="text-[10px] text-[#9ab894] uppercase tracking-wide mt-1">Produccion neta</p>
        </div>
        <div className="bg-white border border-[#ddecd8] rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-[#1a2e1a]">{formatGrams(totalGross)}</p>
          <p className="text-[10px] text-[#9ab894] uppercase tracking-wide mt-1">Produccion bruta</p>
        </div>
        <div className="bg-white border border-[#ddecd8] rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-[#1a2e1a]">{lots.length}</p>
          <p className="text-[10px] text-[#9ab894] uppercase tracking-wide mt-1">Lotes</p>
        </div>
        <div className="bg-white border border-[#ddecd8] rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-[#1a2e1a]">{totalPlants > 0 ? totalPlants : "-"}</p>
          <p className="text-[10px] text-[#9ab894] uppercase tracking-wide mt-1">Plantas</p>
        </div>
        <div className="bg-white border border-[#ddecd8] rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-[#1a2e1a]">{durationDays ?? "-"}</p>
          <p className="text-[10px] text-[#9ab894] uppercase tracking-wide mt-1">Dias totales</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${costPerGram ? "bg-[#edf7e8] border-[#b8daa8]" : "bg-white border-[#ddecd8]"}`}>
          <p className="text-2xl font-black text-[#1a2e1a]">{costPerGram ? `$${costPerGram}` : "-"}</p>
          <p className="text-[10px] text-[#9ab894] uppercase tracking-wide mt-1">Costo por gramo</p>
        </div>
      </div>

      {cycle.status === "activo" && canEdit && (
        <QuickActionsPanel
          cycleId={id}
          lots={lotsForPanel}
          products={products}
          rooms={rooms}
          canManageTemplates={["admin","biologo","director_de_cultivo","director_de_cultivo"].includes(role)}
        />
      )}

      <div className="space-y-3">
        <SectionHeader title="Salas del ciclo" />
        {salasList.map((sala: any) => {
          const salaPlants = sala.lots.reduce((acc: number, l: any) => acc + (l.plant_count ?? 0), 0)
          const salaStatus = sala.lots.map((l: any) => l.status).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
          return (
            <div key={sala.room_name} className="bg-white border border-[#ddecd8] rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-[#0f1f12] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#e8f5e3]">{sala.room_name}</p>
                  <p className="text-xs text-[#7a9e74] mt-0.5">
                    {sala.lots.length} lote{sala.lots.length !== 1 ? "s" : ""}
                    {salaPlants > 0 && ` Â· ${salaPlants} plantas`}
                    {salaStatus.length > 0 && ` Â· ${salaStatus.join(", ")}`}
                  </p>
                </div>
              </div>
              <div className="divide-y divide-[#f5faf3]">
                {sala.lots.map((lot: any) => {
                  const daysInCycle = lot.seedling_date
                    ? Math.round((Date.now() - new Date(lot.seedling_date).getTime()) / (1000*60*60*24))
                    : null
                  return (
                    <Link key={lot.id} href={`/trazabilidad/${lot.id}`}>
                      <div className="flex items-center justify-between px-5 py-3 hover:bg-[#f5faf3] transition-colors">
                        <div>
                          <p className="font-mono font-medium text-[#1a2e1a]">{lot.lot_code}</p>
                          <p className="text-xs text-[#6b8c65]">
                            {lot.genetic?.name ?? "Sin genetica"}
                            {lot.plant_count && ` Â· ${lot.plant_count} plantas`}
                            {daysInCycle && ` Â· ${daysInCycle} dias`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {lot.net_grams > 0 && (
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[#1a2e1a]">{formatGrams(lot.net_grams)}</p>
                              <p className="text-xs text-[#9ab894]">cosechados</p>
                            </div>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${lot.status === "finalizado" ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" : "bg-[#fdf8ec] text-[#8a6010] border-[#e8d48a]"}`}>
                            {lot.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Geneticas del ciclo" />
          <div className="flex flex-wrap gap-2">
            {(genetics as string[]).map((g: string, i: number) => (
              <span key={i} className="px-3 py-1.5 bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] rounded-full text-sm font-medium">{g}</span>
            ))}
          </div>
        </Card>
        {avgEtapas.length > 0 && (
          <Card>
            <SectionHeader title="Duracion promedio por etapa" />
            <div className="space-y-2">
              {avgEtapas.map((e, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-[#6b8c65]">{e.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-[#f0f4f0] rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#2d5a27]" style={{ width: `${Math.min((e.avg / 60) * 100, 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-[#1a2e1a] w-12 text-right">{e.avg}d</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {isAdmin && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div>
              <SectionHeader title="Gastos del ciclo" />
              {totalExpenses > 0 && <p className="text-xs text-[#6b8c65] mt-1">Total: <span className="font-bold text-[#1a2e1a]">${totalExpenses.toLocaleString("es-AR")}</span></p>}
            </div>
          </div>
          {expenses.length === 0 ? (
            <div className="px-5 pb-5"><p className="text-sm text-[#9ab894]">Sin gastos registrados</p></div>
          ) : (
            <div>
              {Object.entries(expensesByCategory).map(([cat, total]) => (
                <div key={cat} className="px-5 py-2 border-b border-[#f5faf3] flex justify-between items-center">
                  <span className="text-sm text-[#6b8c65]">{CATEGORY_LABELS[cat] ?? cat}</span>
                  <span className="text-sm font-semibold text-[#1a2e1a]">${(total as number).toLocaleString("es-AR")}</span>
                </div>
              ))}
              <div className="divide-y divide-[#f5faf3]">
                {expenses.map((e: any, i: number) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#1a2e1a]">{e.expense?.description}</p>
                        <p className="text-xs text-[#9ab894]">{CATEGORY_LABELS[e.expense?.category] ?? e.expense?.category} - {formatDate(e.expense?.purchase_date)}{e.expense?.supplier ? ` - ${e.expense.supplier}` : ""}</p>
                        {e.expense?.useful_cycles > 1 && <p className="text-xs text-[#9ab894]">Total: ${parseFloat(e.expense.total_amount).toLocaleString("es-AR")} / {e.expense.useful_cycles} ciclos</p>}
                      </div>
                      <span className="text-sm font-bold text-[#1a2e1a]">${parseFloat(e.allocated_amount).toLocaleString("es-AR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {events.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4"><SectionHeader title="Eventos del ciclo" /></div>
          <div className="divide-y divide-[#f5faf3]">
            {events.map((ev: any) => (
              <div key={ev.id} className="px-5 py-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#1a2e1a]">{EVENT_LABELS[ev.event_type] ?? ev.event_type}</p>
                    {ev.is_locked && <span className="text-xs bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">Cerrado</span>}
                  </div>
                  {ev.notes && <p className="text-xs text-[#6b8c65] mt-0.5">{ev.notes}</p>}
                  {(ev.lot || ev.room) && (
                    <div className="flex gap-1.5 mt-1">
                      {ev.lot && <span className="text-xs bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] rounded px-1.5 py-0.5">{ev.lot.lot_code}</span>}
                      {ev.room && <span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{ev.room.name}</span>}
                    </div>
                  )}
                </div>
                <span className="text-xs text-[#9ab894] shrink-0 ml-4">{formatDate(ev.event_date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {cycle.notes && (
        <Card>
          <SectionHeader title="Notas" />
          <p className="text-sm text-[#6b8c65]">{cycle.notes}</p>
        </Card>
      )}
    </div>
  )
}


