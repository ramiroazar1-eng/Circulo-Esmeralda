"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export default function EditPlanButton({
  plan,
  patientCount,
}: {
  plan: any
  patientCount: number
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: err } = await supabase.from("membership_plans").update({
      name: form.get("name"),
      description: form.get("description") || null,
      monthly_grams: parseFloat(form.get("monthly_grams") as string) || null,
      monthly_amount: parseFloat(form.get("monthly_amount") as string),
      is_active: form.get("is_active") === "true"
    }).eq("id", plan.id)
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Pencil className="w-3 h-3" />Editar</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Editar plan</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Nombre *</label><input name="name" required defaultValue={plan.name} className="input-ong" /></div>
            <div><label className="label-ong">Descripcion</label><input name="description" defaultValue={plan.description ?? ""} className="input-ong" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Gramos mensuales</label><input name="monthly_grams" type="number" step="0.1" defaultValue={plan.monthly_grams ?? ""} className="input-ong" /></div>
              <div><label className="label-ong">Monto mensual (ARS) *</label><input name="monthly_amount" type="number" required defaultValue={plan.monthly_amount} className="input-ong" /></div>
            </div>
            <div><label className="label-ong">Estado</label><select name="is_active" defaultValue={plan.is_active ? "true" : "false"} className="input-ong"><option value="true">Activo</option><option value="false">Inactivo</option></select></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Guardar cambios</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
