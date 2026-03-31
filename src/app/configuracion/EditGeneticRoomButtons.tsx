"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, X, Upload, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export function EditGeneticButton({ genetic }: { genetic: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(genetic.photo_url ?? null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `${genetic.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from("genetics-photos").upload(path, file, { upsert: true })
    if (uploadError) { setError("Error al subir foto"); setUploading(false); return }
    const { data } = supabase.storage.from("genetics-photos").getPublicUrl(path)
    setPreview(data.publicUrl)
    await supabase.from("genetics").update({ photo_url: data.publicUrl }).eq("id", genetic.id)
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: err } = await supabase.from("genetics").update({
      name: form.get("name"),
      description: form.get("description") || null,
      strain_type: form.get("strain_type") || null,
      thc_percentage: parseFloat(form.get("thc_percentage") as string) || null,
      cbd_percentage: parseFloat(form.get("cbd_percentage") as string) || null,
      terpenes: form.get("terpenes") || null,
      effects: form.get("effects") || null,
      medical_uses: form.get("medical_uses") || null,
      is_active: form.get("is_active") === "true"
    }).eq("id", genetic.id)
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Eliminar la genetica "${genetic.name}"?`)) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from("genetics").delete().eq("id", genetic.id)
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Pencil className="w-3 h-3" />Editar</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea] sticky top-0 bg-white">
            <h2 className="text-sm font-bold text-[#1a2e1a]">Editar genetica</h2>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <div className="flex gap-4 items-start">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-[#c8dcc4] overflow-hidden bg-[#f5faf3] flex items-center justify-center shrink-0 cursor-pointer hover:border-[#4d8a3d] transition-colors" onClick={() => fileRef.current?.click()}>
                {preview ? <img src={preview} alt="foto" className="w-full h-full object-cover" /> : uploading ? <Loader2 className="w-5 h-5 animate-spin text-[#9ab894]" /> : <Upload className="w-5 h-5 text-[#9ab894]" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              <div className="flex-1 space-y-3">
                <div><label className="label-ong">Nombre *</label><input name="name" required defaultValue={genetic.name} className="input-ong" /></div>
                <div><label className="label-ong">Tipo</label>
                  <select name="strain_type" defaultValue={genetic.strain_type ?? ""} className="input-ong">
                    <option value="">Sin especificar</option>
                    <option value="indica">Indica</option>
                    <option value="sativa">Sativa</option>
                    <option value="hibrida">Hibrida</option>
                    <option value="hibrida_indica">Hibrida predominante Indica</option>
                    <option value="hibrida_sativa">Hibrida predominante Sativa</option>
                  </select>
                </div>
              </div>
            </div>

            <div><label className="label-ong">Descripcion general</label><textarea name="description" rows={2} defaultValue={genetic.description ?? ""} className="input-ong resize-none" placeholder="Descripcion de la variedad..." /></div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">THC %</label><input name="thc_percentage" type="number" step="0.1" min="0" max="100" defaultValue={genetic.thc_percentage ?? ""} className="input-ong" placeholder="Ej: 22.5" /></div>
              <div><label className="label-ong">CBD %</label><input name="cbd_percentage" type="number" step="0.1" min="0" max="100" defaultValue={genetic.cbd_percentage ?? ""} className="input-ong" placeholder="Ej: 0.5" /></div>
            </div>

            <div><label className="label-ong">Perfil de terpenos</label><textarea name="terpenes" rows={2} defaultValue={genetic.terpenes ?? ""} className="input-ong resize-none" placeholder="Mirceno, Limoneno, Cariofileno..." /></div>
            <div><label className="label-ong">Efectos</label><textarea name="effects" rows={2} defaultValue={genetic.effects ?? ""} className="input-ong resize-none" placeholder="Relajante, analgesico, antiinflamatorio..." /></div>
            <div><label className="label-ong">Usos medicinales</label><textarea name="medical_uses" rows={2} defaultValue={genetic.medical_uses ?? ""} className="input-ong resize-none" placeholder="Dolor cronico, ansiedad, insomnio..." /></div>

            <div><label className="label-ong">Estado</label>
              <select name="is_active" defaultValue={genetic.is_active ? "true" : "false"} className="input-ong">
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#eef5ea]">
              <Button type="button" variant="danger" size="sm" loading={deleting} onClick={handleDelete}><Trash2 className="w-3 h-3" />Eliminar</Button>
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
    await supabase.from("rooms").delete().eq("id", room.id)
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Pencil className="w-3 h-3" />Editar</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea]">
            <h2 className="text-sm font-bold text-[#1a2e1a]">Editar sala</h2>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
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
            <div className="flex items-center justify-between pt-2 border-t border-[#eef5ea]">
              <Button type="button" variant="danger" size="sm" loading={deleting} onClick={handleDelete}><Trash2 className="w-3 h-3" />Eliminar</Button>
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
