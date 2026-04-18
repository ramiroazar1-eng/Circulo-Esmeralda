"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, X, ChevronRight, CheckCircle2 } from "lucide-react"
import { Button, Alert } from "@/components/ui"

interface Props {
  lot: any
  genetics: { id: string; name: string }[]
  rooms: { id: string; name: string }[]
}

const ETAPAS = [
  { key: "seedling_date",    label: "Plantines",    desc: "Fecha en que se colocaron los plantines" },
  { key: "veg_date",         label: "Vegetativo",   desc: "Inicio del periodo vegetativo" },
  { key: "flower_date",      label: "Floracion",    desc: "Cambio a 12/12 â€” inicio de floracion" },
  { key: "harvest_date",     label: "Cosecha",      desc: "Fecha de corte" },
  { key: "drying_start_date",label: "Secado",       desc: "Inicio del secado" },
  { key: "curing_start_date",label: "Curado",       desc: "Inicio del curado" },
]

export default function EditLotModal({ lot, genetics, rooms }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const router = useRouter()

  // Detectar etapa actual y siguiente
  const lastCompletedIndex = ETAPAS.reduce((last, etapa, i) => lot[etapa.key] ? i : last, -1)
  const nextIndex = lastCompletedIndex + 1
  const nextEtapa = nextIndex < ETAPAS.length ? ETAPAS[nextIndex] : null

  // Campos de produccion visibles segun etapa
  const showProduccion = lot.harvest_date || showAll
  const showSecado = lot.harvest_date || showAll
  const showCurado = lot.drying_start_date || showAll
  const showGramos = lot.drying_start_date || showAll

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)

    const updates: any = {
      lot_id:             lot.id,
      genetic_id:         form.get("genetic_id") || null,
      room_id:            form.get("room_id") || null,
      seedling_date:      form.get("seedling_date") || null,
      veg_date:           form.get("veg_date") || null,
      flower_date:        form.get("flower_date") || null,
      harvest_date:       form.get("harvest_date") || null,
      drying_start_date:  form.get("drying_start_date") || null,
      curing_start_date:  form.get("curing_start_date") || null,
      curing_days:        parseInt(form.get("curing_days") as string) || null,
      notes:              form.get("notes") || null,
    }

    if (showGramos) {
      updates.gross_grams = parseFloat(form.get("gross_grams") as string) || null
      updates.net_grams   = parseFloat(form.get("net_grams") as string) || null
      updates.waste_grams = parseFloat(form.get("waste_grams") as string) || null
    }

    const res = await fetch("/api/lots/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Error al guardar"); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return (
    <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
      <Pencil className="w-3 h-3" />Editar
    </Button>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea] sticky top-0 bg-white">
            <div>
              <h2 className="text-sm font-bold text-[#1a2e1a]">Editar lote</h2>
              <p className="text-xs text-[#6b8c65] font-mono">{lot.lot_code}</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {error && <Alert variant="error">{error}</Alert>}

            {/* Genetica y sala */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Genetica</label>
                <select name="genetic_id" defaultValue={lot.genetic_id ?? ""} className="input-ong">
                  <option value="">Sin especificar</option>
                  {genetics.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-ong">Sala</label>
                <select name="room_id" defaultValue={lot.room_id ?? ""} className="input-ong">
                  <option value="">Sin especificar</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            {/* Timeline paso a paso */}
            <div className="border-t border-[#eef5ea] pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-[#5a8a52] uppercase tracking-widest">Etapas del ciclo</p>
                <button type="button" onClick={() => setShowAll(v => !v)}
                  className="text-xs text-[#9ab894] hover:text-[#2d5a27]">
                  {showAll ? "Ver solo pendientes" : "Ver todas las etapas"}
                </button>
              </div>

              <div className="space-y-3">
                {ETAPAS.map((etapa, i) => {
                  const completed = !!lot[etapa.key]
                  const isNext = i === nextIndex
                  const visible = completed || isNext || showAll

                  if (!visible) return null

                  return (
                    <div key={etapa.key} className={`rounded-xl border p-3 ${
                      completed ? "bg-[#f0fdf4] border-[#bbf7d0]" :
                      isNext ? "bg-[#fefce8] border-[#fde68a]" :
                      "bg-slate-50 border-slate-200"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {completed
                          ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
                        }
                        <span className={`text-sm font-semibold ${completed ? "text-green-700" : isNext ? "text-amber-700" : "text-slate-600"}`}>
                          {etapa.label}
                          {isNext && !completed && <span className="ml-2 text-xs font-normal text-amber-600">â€” siguiente paso</span>}
                        </span>
                      </div>
                      <div>
                        <label className="label-ong text-xs">{completed ? "Fecha registrada" : etapa.desc}</label>
                        <input
                          name={etapa.key}
                          type="date"
                          defaultValue={lot[etapa.key] ?? ""}
                          className="input-ong"
                        />
                      </div>

                      {/* Campos especiales por etapa */}
                      {etapa.key === "curing_start_date" && (completed || isNext || showAll) && (
                        <div className="mt-2">
                          <label className="label-ong text-xs">Dias de curado</label>
                          <input name="curing_days" type="number" min="0" defaultValue={lot.curing_days ?? ""} className="input-ong" placeholder="Ej: 30" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Gramos â€” solo cuando ya se secÃ³ */}
            {showGramos && (
              <div className="border-t border-[#eef5ea] pt-4">
                <p className="text-[10px] font-bold text-[#5a8a52] uppercase tracking-widest mb-3">Produccion</p>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="label-ong">Gramos brutos</label><input name="gross_grams" type="number" step="0.1" min="0" defaultValue={lot.gross_grams ?? ""} className="input-ong" placeholder="0.0" /></div>
                  <div><label className="label-ong">Gramos netos</label><input name="net_grams" type="number" step="0.1" min="0" defaultValue={lot.net_grams ?? ""} className="input-ong" placeholder="0.0" /></div>
                  <div><label className="label-ong">Merma (g)</label><input name="waste_grams" type="number" step="0.1" min="0" defaultValue={lot.waste_grams ?? ""} className="input-ong" placeholder="0.0" /></div>
                </div>
                <p className="text-xs text-[#9ab894] mt-1">Los gramos netos activan el stock disponible para dispensas.</p>
              </div>
            )}

            <div className="border-t border-[#eef5ea] pt-4">
              <label className="label-ong">Notas</label>
              <textarea name="notes" rows={2} defaultValue={lot.notes ?? ""} className="input-ong resize-none" placeholder="Observaciones del lote..." />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#eef5ea]">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Guardar cambios</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

