"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"
import { formatGrams } from "@/lib/utils"

interface Patient { id: string; full_name: string; dni: string }
interface LotOption { lot_id: string; lot_code: string; available_grams: number; genetic_name: string | null }

export default function NewDispenseModal({ patients, lots }: { patients: Patient[]; lots: LotOption[] }) {
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
    const grams = parseFloat(form.get("grams") as string)
    const lotId = form.get("lot_id") as string
    const lot = lots.find(l => l.lot_id === lotId)
    if (lot && grams > lot.available_grams) { setError(`Stock insuficiente. Disponible: ${formatGrams(lot.available_grams)}`); setLoading(false); return }
    const { error: insertError } = await supabase.from("dispenses").insert({ patient_id: form.get("patient_id"), lot_id: lotId, grams, product_desc: form.get("product_desc") || "flor seca", observations: form.get("observations") || null, dispensed_at: form.get("dispensed_at") || new Date().toISOString(), performed_by: user.id })
    if (insertError) { setError(insertError.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Registrar dispensa</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Registrar dispensa</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Paciente *</label><select name="patient_id" required className="input-ong"><option value="">Selecciona un paciente...</option>{patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.dni})</option>)}</select></div>
            <div><label className="label-ong">Lote origen *</label><select name="lot_id" required className="input-ong"><option value="">Selecciona un lote...</option>{lots.map(l => <option key={l.lot_id} value={l.lot_id}>{l.lot_code} — {l.genetic_name ?? "Sin genetica"} — Stock: {formatGrams(l.available_grams)}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Cantidad (gramos) *</label><input name="grams" type="number" step="0.1" min="0.1" required className="input-ong font-mono" placeholder="0.0" /></div>
              <div><label className="label-ong">Producto</label><input name="product_desc" className="input-ong" defaultValue="flor seca" /></div>
            </div>
            <div><label className="label-ong">Fecha y hora</label><input name="dispensed_at" type="datetime-local" className="input-ong" defaultValue={new Date().toISOString().slice(0, 16)} /></div>
            <div><label className="label-ong">Observaciones</label><textarea name="observations" rows={2} className="input-ong resize-none" placeholder="Opcional..." /></div>
            <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" loading={loading}>Registrar</Button></div>
          </form>
        </div>
      </div>
    </>
  )
}
