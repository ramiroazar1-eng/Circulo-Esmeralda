"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Pencil, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

interface Props {
  lot: any
  genetics: { id: string; name: string }[]
  rooms: { id: string; name: string }[]
}

export default function EditLotModal({ lot, genetics, rooms }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()

    const { error: err } = await supabase.from("lots").update({
      genetic_id:         form.get("genetic_id") || null,
      room_id:            form.get("room_id") || null,
      gross_grams:        parseFloat(form.get("gross_grams") as string) || null,
      net_grams:          parseFloat(form.get("net_grams") as string) || null,
      waste_grams:        parseFloat(form.get("waste_grams") as string) || null,
      seedling_date:      form.get("seedling_date") || null,
      veg_date:           form.get("veg_date") || null,
      pruning_date:       form.get("pruning_date") || null,
      flower_date:        form.get("flower_date") || null,
      harvest_date:       form.get("harvest_date") || null,
      drying_start_date:  form.get("drying_start_date") || null,
      curing_start_date:  form.get("curing_start_date") || null,
      curing_days:        parseInt(form.get("curing_days") as string) || null,
      notes:              form.get("notes") || null,
      updated_at:         new Date().toISOString(),
    }).eq("id", lot.id)

    if (err) { setError(err.message); setLoading(false); return }
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

            <div>
              <p className="text-[10px] font-bold text-[#5a8a52] uppercase tracking-widest mb-3">Informacion general</p>
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
              <p className="text-xs text-[#9ab894] mt-2">El estado se actualiza automaticamente segun las fechas que cargues.</p>
            </div>

            <div className="border-t border-[#eef5ea] pt-4">
              <p className="text-[10px] font-bold text-[#5a8a52] uppercase tracking-widest mb-3">Timeline del ciclo</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label-ong">Fecha plantines</label><input name="seedling_date" type="date" defaultValue={lot.seedling_date ?? ""} className="input-ong" /></div>
                <div><label className="label-ong">Inicio vegetativo</label><input name="veg_date" type="date" defaultValue={lot.veg_date ?? ""} className="input-ong" /></div>
                <div><label className="label-ong">Fecha poda</label><input name="pruning_date" type="date" defaultValue={lot.pruning_date ?? ""} className="input-ong" /></div>
                <div><label className="label-ong">Inicio floracion</label><input name="flower_date" type="date" defaultValue={lot.flower_date ?? ""} className="input-ong" /></div>
                <div><label className="label-ong">Fecha de cosecha</label><input name="harvest_date" type="date" defaultValue={lot.harvest_date ?? ""} className="input-ong" /></div>
              </div>
            </div>

            <div className="border-t border-[#eef5ea] pt-4">
              <p className="text-[10px] font-bold text-[#5a8a52] uppercase tracking-widest mb-3">Secado y curado</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label-ong">Inicio secado</label><input name="drying_start_date" type="date" defaultValue={lot.drying_start_date ?? ""} className="input-ong" /></div>
                
                <div><label className="label-ong">Inicio curado</label><input name="curing_start_date" type="date" defaultValue={lot.curing_start_date ?? ""} className="input-ong" /></div>
                <div><label className="label-ong">Dias de curado</label><input name="curing_days" type="number" min="0" defaultValue={lot.curing_days ?? ""} className="input-ong" placeholder="Ej: 30" /></div>
              </div>
            </div>

            <div className="border-t border-[#eef5ea] pt-4">
              <p className="text-[10px] font-bold text-[#5a8a52] uppercase tracking-widest mb-3">Produccion</p>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label-ong">Gramos brutos</label><input name="gross_grams" type="number" step="0.1" min="0" defaultValue={lot.gross_grams ?? ""} className="input-ong" placeholder="0.0" /></div>
                <div><label className="label-ong">Gramos netos</label><input name="net_grams" type="number" step="0.1" min="0" defaultValue={lot.net_grams ?? ""} className="input-ong" placeholder="0.0" /></div>
                <div><label className="label-ong">Merma</label><input name="waste_grams" type="number" step="0.1" min="0" defaultValue={lot.waste_grams ?? ""} className="input-ong" placeholder="0.0" /></div>
              </div>
            </div>

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
