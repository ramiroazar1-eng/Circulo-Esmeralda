"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

interface Option { id: string; name: string }

export default function NewLotModal({ genetics, rooms }: { genetics: Option[]; rooms: Option[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Generar codigo de lote
    const year = new Date().getFullYear()
    const { data: existingLots } = await supabase.from("lots").select("lot_code").like("lot_code", `L-${year}-%`)
    const nextSeq = String((existingLots?.length ?? 0) + 1).padStart(3, "0")
    const lotCode = `L-${year}-${nextSeq}`

    const { error: err } = await supabase.from("lots").insert({
      lot_code: lotCode,
      genetic_id: form.get("genetic_id") || null,
      room_id: form.get("room_id") || null,
      start_date: form.get("start_date"),
      harvest_date: form.get("harvest_date") || null,
      status: form.get("status"),
      gross_grams: parseFloat(form.get("gross_grams") as string) || null,
      net_grams: parseFloat(form.get("net_grams") as string) || null,
      waste_grams: parseFloat(form.get("waste_grams") as string) || null,
      notes: form.get("notes") || null,
      created_by: user.id
    })
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo lote</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nuevo lote de produccion</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-3 py-2">El codigo de lote se genera automaticamente (L-AAAA-NNN)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Genetica</label>
                <select name="genetic_id" className="input-ong">
                  <option value="">Sin especificar</option>
                  {genetics.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-ong">Sala</label>
                <select name="room_id" className="input-ong">
                  <option value="">Sin especificar</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Fecha de inicio *</label><input name="start_date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="input-ong" /></div>
              <div><label className="label-ong">Fecha de cosecha</label><input name="harvest_date" type="date" className="input-ong" /></div>
            </div>
            <div>
              <label className="label-ong">Estado *</label>
              <select name="status" required className="input-ong">
                <option value="en_proceso">En proceso</option>
                <option value="finalizado">Finalizado</option>
                <option value="descartado">Descartado</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label-ong">Gramos brutos</label><input name="gross_grams" type="number" step="0.1" min="0" className="input-ong" placeholder="0.0" /></div>
              <div><label className="label-ong">Gramos netos</label><input name="net_grams" type="number" step="0.1" min="0" className="input-ong" placeholder="0.0" /></div>
              <div><label className="label-ong">Merma</label><input name="waste_grams" type="number" step="0.1" min="0" className="input-ong" placeholder="0.0" /></div>
            </div>
            <div><label className="label-ong">Notas</label><textarea name="notes" rows={2} className="input-ong resize-none" placeholder="Observaciones del lote..." /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Crear lote</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
