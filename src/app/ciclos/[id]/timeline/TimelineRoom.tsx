"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, CheckCircle2, Clock, Lock, CalendarDays } from "lucide-react"
import { Button, Alert } from "@/components/ui"

const EVENT_TYPES = [
  { value: "riego",       label: "Riego" },
  { value: "nutrientes",  label: "Nutrientes" },
  { value: "poda",        label: "Poda" },
  { value: "defoliacion", label: "Defoliacion" },
  { value: "tratamiento", label: "Tratamiento / preventivo" },
  { value: "transplante", label: "Transplante" },
  { value: "traslado",    label: "Traslado" },
  { value: "incidente",   label: "Incidente" },
  { value: "descarte",    label: "Descarte parcial" },
  { value: "otro",        label: "Otro" },
]

const EVENT_LABELS: Record<string, string> = {
  poda: "Poda", nutrientes: "Nutrientes", tratamiento: "Tratamiento / preventivo",
  transplante: "Transplante", riego: "Riego", defoliacion: "Defoliacion",
  traslado: "Traslado", incidente: "Incidente", descarte: "Descarte parcial", otro: "Otro"
}

const LOT_STAGES = [
  { key: "seedling_date", label: "Plantines", days: 14 },
  { key: "veg_date",      label: "Vegetativo", days: 30 },
  { key: "flower_date",   label: "Floracion", days: 60 },
  { key: "harvest_date",  label: "Cosecha", days: 14 },
]

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
}

function isToday(d: string) {
  return d === new Date().toISOString().split("T")[0]
}

function isPast(d: string) {
  return d < new Date().toISOString().split("T")[0]
}

interface Props {
  room: any
  cycleId: string
  canPlan: boolean
  lots: { id: string; lot_code: string }[]
  rooms: { id: string; name: string }[]
}

export default function TimelineRoom({ room, cycleId, canPlan, lots, rooms }: Props) {
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Generar sugerencias automaticas basadas en etapa del lote
  const suggestions: { date: string; label: string; auto: true }[] = []
  for (const lot of room.lots) {
    for (let i = 0; i < LOT_STAGES.length - 1; i++) {
      const stage = LOT_STAGES[i]
      const nextStage = LOT_STAGES[i + 1]
      const stageDate = lot[stage.key]
      if (stageDate && !lot[nextStage.key]) {
        const suggestedDate = new Date(stageDate)
        suggestedDate.setDate(suggestedDate.getDate() + stage.days)
        const dateStr = suggestedDate.toISOString().split("T")[0]
        if (dateStr >= new Date().toISOString().split("T")[0]) {
          suggestions.push({
            date: dateStr,
            label: `Proxima etapa: ${nextStage.label} (${lot.lot_code})`,
            auto: true
          })
        }
        break
      }
    }
  }

  // Combinar timeline: pasado + futuro planificado + sugerencias
  const today = new Date().toISOString().split("T")[0]

  const pastItems = room.events.map((e: any) => ({
    date: e.event_date,
    label: EVENT_LABELS[e.event_type] ?? e.event_type,
    notes: e.notes,
    lot: e.lot?.lot_code,
    locked: e.is_locked,
    operator: e.created_by_profile?.full_name,
    type: "past" as const,
    id: e.id,
  }))

  const futureItems = room.planned.map((p: any) => ({
    date: p.planned_date,
    label: EVENT_LABELS[p.event_type] ?? p.event_type,
    notes: p.notes,
    lot: p.lot?.lot_code,
    status: p.status,
    type: "planned" as const,
    id: p.id,
  }))

  const autoItems = suggestions
    .filter(s => !futureItems.some((f: any) => f.date === s.date))
    .map(s => ({ ...s, type: "auto" as const, id: "" }))

  const allItems = [...pastItems, ...futureItems, ...autoItems]
    .sort((a, b) => a.date.localeCompare(b.date))

  async function handlePlanSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/cycles/planned-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle_id: cycleId,
        room_id: room.id,
        lot_id: form.get("lot_id") || null,
        event_type: form.get("event_type"),
        planned_date: form.get("planned_date"),
        notes: form.get("notes") || null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setShowPlanForm(false)
    router.refresh()
  }

  async function handleComplete(plannedId: string) {
    await fetch("/api/cycles/planned-events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plannedId, status: "completado" })
    })
    router.refresh()
  }

  return (
    <div className="bg-white border border-[#ddecd8] rounded-xl overflow-hidden">
      {/* Header de sala */}
      <div className="px-5 py-4 bg-[#0f1f12] flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-[#e8f5e3]">{room.name}</p>
          <div className="flex gap-2 mt-1">
            {room.lots.map((l: any) => (
              <span key={l.id} className="text-xs bg-[#2d5a27] text-[#a8e095] rounded px-2 py-0.5">
                {l.lot_code}{l.genetic?.name ? ` - ${l.genetic.name}` : ""}
              </span>
            ))}
          </div>
        </div>
        {canPlan && (
          <button
            onClick={() => setShowPlanForm(f => !f)}
            className="flex items-center gap-1.5 text-xs bg-[#2d5a27] hover:bg-[#3b6d30] text-[#a8e095] rounded-lg px-3 py-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />Planificar
          </button>
        )}
      </div>

      {/* Formulario planificacion */}
      {showPlanForm && (
        <div className="px-5 py-4 bg-[#f5faf3] border-b border-[#ddecd8]">
          {error && <div className="mb-3"><Alert variant="error">{error}</Alert></div>}
          <form onSubmit={handlePlanSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Tipo *</label>
                <select name="event_type" required className="input-ong">
                  {EVENT_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-ong">Fecha planificada *</label>
                <input name="planned_date" type="date" required className="input-ong" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Lote</label>
                <select name="lot_id" className="input-ong">
                  <option value="">Toda la sala</option>
                  {room.lots.map((l: any) => <option key={l.id} value={l.id}>{l.lot_code}</option>)}
                </select>
              </div>
              <div>
                <label className="label-ong">Notas</label>
                <input name="notes" type="text" className="input-ong" placeholder="Opcional..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowPlanForm(false)}>Cancelar</Button>
              <Button type="submit" size="sm" loading={loading}>Guardar</Button>
            </div>
          </form>
        </div>
      )}

      {/* Timeline */}
      <div className="px-5 py-4">
        {allItems.length === 0 ? (
          <p className="text-xs text-[#9ab894] text-center py-4">Sin actividad registrada ni planificada</p>
        ) : (
          <div className="relative">
            {/* Linea vertical */}
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-[#ddecd8]" />

            <div className="space-y-1">
              {allItems.map((item, i) => {
                const isItemToday = isToday(item.date)
                const isItemPast = isPast(item.date)

                let dotColor = "bg-[#ddecd8]"
                let dotBorder = ""
                if (item.type === "past") dotColor = item.locked ? "bg-slate-400" : "bg-[#2d5a27]"
                if (item.type === "planned") dotColor = isItemPast ? "bg-amber-400" : "bg-blue-400"
                if (item.type === "auto") dotColor = "bg-[#ddecd8] border-2 border-dashed border-[#9ab894]"
                if (isItemToday) dotBorder = "ring-2 ring-offset-1 ring-[#2d5a27]"

                return (
                  <div key={`${item.id}-${i}`} className="flex gap-4 items-start">
                    <div className="relative z-10 shrink-0 mt-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${dotColor} ${dotBorder}`}>
                        {item.type === "past" && item.locked && <Lock className="w-3 h-3 text-white" />}
                        {item.type === "past" && !item.locked && <CheckCircle2 className="w-3 h-3 text-white" />}
                        {item.type === "planned" && <Clock className="w-3 h-3 text-white" />}
                        {item.type === "auto" && <CalendarDays className="w-3 h-3 text-[#9ab894]" />}
                      </div>
                    </div>

                    <div className={`flex-1 pb-3 ${isItemToday ? "bg-[#edf7e8] rounded-lg px-3 py-2 -ml-1" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold ${isItemToday ? "text-[#2d6a1f]" : isItemPast ? "text-[#1a2e1a]" : "text-blue-600"}`}>
                              {formatDate(item.date)}
                              {isItemToday && " — HOY"}
                            </span>
                            <span className={`text-xs font-medium ${item.type === "auto" ? "text-[#9ab894] italic" : "text-[#1a2e1a]"}`}>
                              {item.label}
                            </span>
                            {item.lot && (
                              <span className="text-xs bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] rounded px-1.5 py-0.5">{item.lot}</span>
                            )}
                            {item.type === "planned" && isItemPast && (
                              <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">Pendiente</span>
                            )}
                            {item.type === "auto" && (
                              <span className="text-xs bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">Sugerido</span>
                            )}
                          </div>
                          {item.notes && <p className="text-xs text-[#6b8c65] mt-0.5">{item.notes}</p>}
                          {item.type === "past" && item.operator && (
                            <p className="text-xs text-[#9ab894] mt-0.5">{item.operator}</p>
                          )}
                        </div>
                        {item.type === "planned" && item.status === "pendiente" && (
                          <button
                            onClick={() => handleComplete(item.id)}
                            className="shrink-0 text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            Completar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}