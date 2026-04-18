import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { BackButton } from "@/components/ui/BackButton"
import { Card } from "@/components/ui"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { ArrowRightLeft, AlertTriangle, Sprout, Sun, Scissors, Scale, FileText } from "lucide-react"

const TIPOS_RELEVANTES = ["alta_lote", "traslado", "cambio_etapa", "cosecha", "incidente"]

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  alta_lote:    { label: "Alta de lote",          color: "#166534", bg: "#f0fdf4", border: "#bbf7d0", icon: Sprout },
  traslado:     { label: "Traslado de sala",       color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", icon: ArrowRightLeft },
  cambio_etapa: { label: "Cambio de fotoperiodo",  color: "#92400e", bg: "#fffbeb", border: "#fde68a", icon: Sun },
  cosecha:      { label: "Cosecha",                color: "#14532d", bg: "#dcfce7", border: "#86efac", icon: Scale },
  incidente:    { label: "Incidente",              color: "#991b1b", bg: "#fef2f2", border: "#fecaca", icon: AlertTriangle },
}

export default async function CultivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","biologo","director_de_cultivo","administrativo"].includes(profile?.role ?? "")) redirect("/dashboard")

  const [cycleRes, eventsRes, lotsRes, historyRes] = await Promise.all([
    supabase.from("production_cycles").select("id, name, status, start_date").eq("id", id).single(),
    supabase.from("cycle_events")
      .select("id, event_type, event_date, notes, is_locked, lot:lots(id, lot_code, genetic:genetics(name)), room:rooms(name), created_by_profile:profiles!cycle_events_created_by_fkey(full_name)")
      .eq("cycle_id", id)
      .in("event_type", TIPOS_RELEVANTES)
      .order("event_date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("lots")
      .select("id, lot_code, status, seedling_date, veg_date, flower_date, harvest_date, gross_grams, net_grams, genetic:genetics(name), room:rooms(name)")
      .eq("cycle_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("lot_room_history")
      .select("id, lot_id, entered_at, exited_at, room:rooms(name), lot:lots(lot_code)")
      .order("entered_at", { ascending: true }),
  ])

  if (!cycleRes.data) notFound()
  const cycle = cycleRes.data
  const events = (eventsRes.data ?? []) as any[]
  const lots = (lotsRes.data ?? []) as any[]
  const history = (historyRes.data ?? []) as any[]

  // Filtrar historial de salas solo para lotes de este ciclo
  const lotIds = lots.map((l: any) => l.id)
  const roomHistory = history.filter((h: any) => lotIds.includes(h.lot_id))

  // Combinar eventos con traslados del historial (los traslados ya generan evento tipo "traslado")
  const grouped: Record<string, any[]> = {}
  for (const ev of events) {
    const lotId = ev.lot?.id ?? "sin-lote"
    if (!grouped[lotId]) grouped[lotId] = []
    grouped[lotId].push(ev)
  }

  const totalEventos = events.length
  const incidentes = events.filter((e: any) => e.event_type === "incidente").length

  return (
    <div className="space-y-5">
      <BackButton label={`Volver a ${cycle.name}`} />
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-[#1a2e1a]">Trazabilidad del biologo</h1>
          <p className="text-sm text-[#6b8c65] mt-0.5">{cycle.name} â€” desde {formatDate(cycle.start_date)}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/ciclos/${id}`} className="text-xs text-[#6b8c65] hover:text-[#1a2e1a] underline">
            Ver ciclo completo
          </Link>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#ddecd8] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1a2e1a]">{lots.length}</p>
          <p className="text-xs text-[#9ab894] mt-1">Lotes en ciclo</p>
        </div>
        <div className="bg-white border border-[#ddecd8] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1a2e1a]">{totalEventos}</p>
          <p className="text-xs text-[#9ab894] mt-1">Eventos registrados</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${incidentes > 0 ? "bg-red-50 border-red-200" : "bg-white border-[#ddecd8]"}`}>
          <p className={`text-2xl font-bold ${incidentes > 0 ? "text-red-700" : "text-[#1a2e1a]"}`}>{incidentes}</p>
          <p className={`text-xs mt-1 ${incidentes > 0 ? "text-red-500" : "text-[#9ab894]"}`}>Incidentes</p>
        </div>
        <div className="bg-white border border-[#ddecd8] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1a2e1a]">{lots.filter((l: any) => l.harvest_date).length}</p>
          <p className="text-xs text-[#9ab894] mt-1">Lotes cosechados</p>
        </div>
      </div>

      {/* Eventos por lote */}
      {lots.length === 0 ? (
        <div className="bg-white border border-[#ddecd8] rounded-xl p-8 text-center">
          <p className="text-sm text-[#9ab894]">Sin lotes registrados en este ciclo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lots.map((lot: any) => {
            const lotEvents = grouped[lot.id] ?? []
            const lotHistory = roomHistory.filter((h: any) => h.lot_id === lot.id)

            return (
              <div key={lot.id} className="bg-white border border-[#ddecd8] rounded-xl overflow-hidden">
                {/* Header del lote */}
                <div className="px-5 py-4 bg-[#0f1f12] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#e8f5e3]">{lot.lot_code}</span>
                      <span className="text-xs bg-[#2d5a27] text-[#a8e095] rounded-full px-2.5 py-0.5">
                        {lot.genetic?.name ?? "Sin genetica"}
                      </span>
                      <span className="text-xs text-[#7a9e74]">{lot.room?.name ?? "Sin sala"}</span>
                    </div>
                    <div className="flex gap-4 mt-1.5">
                      {lot.seedling_date && <span className="text-xs text-[#9ab894]">Inicio: {formatDate(lot.seedling_date)}</span>}
                      {lot.veg_date && <span className="text-xs text-[#9ab894]">Vege: {formatDate(lot.veg_date)}</span>}
                      {lot.flower_date && <span className="text-xs text-[#9ab894]">Flora: {formatDate(lot.flower_date)}</span>}
                      {lot.harvest_date && <span className="text-xs text-[#9ab894]">Cosecha: {formatDate(lot.harvest_date)}</span>}
                    </div>
                  </div>
                  <Link href={`/trazabilidad/${lot.id}`} className="text-xs text-[#7a9e74] hover:text-[#a8e095] underline">
                    Ver lote
                  </Link>
                </div>

                {/* Timeline de eventos del lote */}
                {lotEvents.length === 0 ? (
                  <div className="px-5 py-4 text-xs text-[#9ab894] italic">
                    Sin eventos de trazabilidad registrados para este lote
                  </div>
                ) : (
                  <div className="px-5 py-4">
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-[#ddecd8]" />
                      <div className="space-y-2">
                        {lotEvents.map((ev: any) => {
                          const config = TIPO_CONFIG[ev.event_type] ?? TIPO_CONFIG.incidente
                          const Icon = config.icon
                          return (
                            <div key={ev.id} className="flex gap-3 items-start">
                              <div className="relative z-10 shrink-0 mt-0.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: config.bg, border: `1.5px solid ${config.border}` }}>
                                  <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                                </div>
                              </div>
                              <div className="flex-1 pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold" style={{ color: config.color }}>
                                        {formatDate(ev.event_date)}
                                      </span>
                                      <span className="text-xs font-semibold text-[#1a2e1a]">{config.label}</span>
                                      {ev.room && (
                                        <span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{ev.room.name}</span>
                                      )}
                                      {ev.is_locked && (
                                        <span className="text-xs bg-slate-100 text-slate-400 rounded px-1.5 py-0.5">Cerrado</span>
                                      )}
                                    </div>
                                    {ev.notes && <p className="text-xs text-[#6b8c65] mt-0.5">{ev.notes}</p>}
                                    {ev.created_by_profile && <p className="text-xs text-[#9ab894] mt-0.5">{ev.created_by_profile.full_name}</p>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Resumen produccion si fue cosechado */}
                    {(lot.gross_grams || lot.net_grams) && (
                      <div className="mt-3 pt-3 border-t border-[#eef5ea] flex gap-4">
                        {lot.gross_grams && (
                          <div>
                            <p className="text-xs text-[#9ab894]">Peso bruto</p>
                            <p className="text-sm font-bold text-[#1a2e1a]">{lot.gross_grams}g</p>
                          </div>
                        )}
                        {lot.net_grams && (
                          <div>
                            <p className="text-xs text-[#9ab894]">Peso neto</p>
                            <p className="text-sm font-bold text-[#2d6a1f]">{lot.net_grams}g</p>
                          </div>
                        )}
                        {lot.gross_grams && lot.net_grams && (
                          <div>
                            <p className="text-xs text-[#9ab894]">Merma</p>
                            <p className="text-sm font-bold text-amber-600">
                              {(((lot.gross_grams - lot.net_grams) / lot.gross_grams) * 100).toFixed(1)}%
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

