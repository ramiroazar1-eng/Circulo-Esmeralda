"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export function EditGeneticButton({ genetic }: { genetic: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: err } = await supabase.from("genetics").update({
      name: form.get("name"),
      description: form.get("description") || null,
      is_active: form.get("is_active") === "true"
    }).eq("id", genetic.id)
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Eliminar la genetica "${genetic.name}"?`)) return
    setDeleting(true)
    const supabase = createClient()
    const { error: err } = await supabase.from("genetics").delete().eq("id", genetic.id)
    if (err) { setError(err.message); setDeleting(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return (
    <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
      <Pencil className="w-3 h-3" />Editar
    </Button>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Editar genetica</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Nombre *</label><input name="name" required defaultValue={genetic.name} className="input-ong" /></div>
            <div><label className="label-ong">Descripcion</label><input name="description" defaultValue={genetic.description ?? ""} className="input-ong" /></div>
            <div><label className="label-ong">Estado</label>
              <select name="is_active" defaultValue={genetic.is_active ? "true" : "false"} className="input-ong">
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button type="button" variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
                <Trash2 className="w-3 h-3" />Eliminar
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" loading={loading}>Guardar</Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export function EditRoomButton({ room }: { room: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: err } = await supabase.from("rooms").update({
      name: form.get("name"),
      description: form.get("description") || null,
      is_active: form.get("is_active") === "true"
    }).eq("id", room.id)
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Eliminar la sala "${room.name}"?`)) return
    setDeleting(true)
    const supabase = createClient()
    const { error: err } = await supabase.from("rooms").delete().eq("id", room.id)
    if (err) { setError(err.message); setDeleting(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return (
    <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
      <Pencil className="w-3 h-3" />Editar
    </Button>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Editar sala</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Nombre *</label><input name="name" required defaultValue={room.name} className="input-ong" /></div>
            <div><label className="label-ong">Descripcion</label><input name="description" defaultValue={room.description ?? ""} className="input-ong" /></div>
            <div><label className="label-ong">Estado</label>
              <select name="is_active" defaultValue={room.is_active ? "true" : "false"} className="input-ong">
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button type="button" variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
                <Trash2 className="w-3 h-3" />Eliminar
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" loading={loading}>Guardar</Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
