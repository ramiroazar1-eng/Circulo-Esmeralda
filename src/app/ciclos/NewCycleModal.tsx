"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export default function NewCycleModal() {
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

    const { error: err } = await supabase.from("production_cycles").insert({
      name: form.get("name"),
      description: form.get("description") || null,
      start_date: form.get("start_date"),
      end_date: form.get("end_date") || null,
      status: form.get("status"),
      notes: form.get("notes") || null,
      created_by: user.id
    })

    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo ciclo</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea]">
            <h2 className="text-sm font-bold text-[#1a2e1a]">Nuevo ciclo de produccion</h2>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Nombre del ciclo *</label><input name="name" required className="input-ong" placeholder="Ej: Ciclo Otono 2026" /></div>
            <div><label className="label-ong">Descripcion</label><input name="description" className="input-ong" placeholder="Opcional" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Fecha de inicio *</label><input name="start_date" type="date" required className="input-ong" /></div>
              <div><label className="label-ong">Fecha de fin</label><input name="end_date" type="date" className="input-ong" /></div>
            </div>
            <div>
              <label className="label-ong">Estado</label>
              <select name="status" className="input-ong">
                <option value="activo">Activo</option>
                <option value="finalizado">Finalizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div><label className="label-ong">Notas</label><textarea name="notes" rows={2} className="input-ong resize-none" placeholder="Observaciones del ciclo..." /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Crear ciclo</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
