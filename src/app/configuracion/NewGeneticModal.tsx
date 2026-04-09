"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export default function NewGeneticModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: err } = await supabase.from("genetics").insert({
      name: form.get("name"),
      description: form.get("description") || null,
      is_active: true
    })
    if (err) { setError(err.code === "23505" ? "Ya existe una genetica con ese nombre." : err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nueva genetica</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nueva genetica</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Nombre *</label><input name="name" required className="input-ong" placeholder="Ej: OG Kush, Indica pura..." /></div>
            <div><label className="label-ong">Descripcion</label><input name="description" className="input-ong" placeholder="Opcional" /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Guardar</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
