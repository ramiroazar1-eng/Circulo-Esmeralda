"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

const CATS = [["operativo","Operativo"],["incidencia","Incidencia"],["trazabilidad","Trazabilidad"],["documental","Documental"],["administrativo","Administrativo"],["otro","Otro"]]

export default function NewLogEntry() {
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
    const { error: err } = await supabase.from("daily_log_entries").insert({ entry_date: form.get("entry_date"), category: form.get("category"), title: form.get("title"), body: form.get("body"), is_incident: form.get("is_incident") === "on", created_by: user.id })
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }
  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nueva entrada</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nueva entrada de bitacora</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Fecha *</label><input name="entry_date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="input-ong" /></div>
              <div><label className="label-ong">Categoria *</label><select name="category" required className="input-ong">{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            <div><label className="label-ong">Titulo *</label><input name="title" required className="input-ong" placeholder="Resumen breve" /></div>
            <div><label className="label-ong">Detalle *</label><textarea name="body" required rows={4} className="input-ong resize-none" placeholder="Descripcion completa..." /></div>
            <div className="flex items-center gap-2"><input type="checkbox" name="is_incident" id="is_incident" className="w-4 h-4 rounded border-slate-300" /><label htmlFor="is_incident" className="text-sm text-slate-700">Marcar como incidencia</label></div>
            <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" loading={loading}>Guardar</Button></div>
          </form>
        </div>
      </div>
    </>
  )
}
