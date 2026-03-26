"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export default function NewPlanModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: err } = await supabase.from("membership_plans").insert({
      name: form.get("name"),
      description: form.get("description") || null,
      monthly_grams: parseFloat(form.get("monthly_grams") as string) || null,
      monthly_amount: parseFloat(form.get("monthly_amount") as string),
      is_active: true
    })
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo plan</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nuevo plan de membresia</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Nombre del plan *</label><input name="name" required className="input-ong" placeholder="Plan Basico" /></div>
            <div><label className="label-ong">Descripcion</label><input name="description" className="input-ong" placeholder="Hasta 15g mensuales" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Gramos mensuales</label><input name="monthly_grams" type="number" step="0.1" min="0" className="input-ong" placeholder="15" /></div>
              <div><label className="label-ong">Monto mensual (ARS) *</label><input name="monthly_amount" type="number" required min="0" className="input-ong" placeholder="15000" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Guardar plan</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
