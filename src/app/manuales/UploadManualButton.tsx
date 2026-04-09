"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Upload, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "dispensas", label: "Protocolo de dispensas" },
  { value: "produccion", label: "Produccion" },
  { value: "administrativo", label: "Administrativo" },
  { value: "legal", label: "Legal" },
  { value: "seguridad", label: "Seguridad" },
]

export default function UploadManualButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedFile) { setError("Selecciona un archivo"); return }
    setLoading(true); setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const form = new FormData(e.currentTarget)
    const ext = selectedFile.name.split(".").pop()
    const path = `${Date.now()}-${selectedFile.name}`

    setUploading(true)
    const { error: uploadError } = await supabase.storage.from("manuales").upload(path, selectedFile)
    setUploading(false)

    if (uploadError) { setError("Error al subir archivo"); setLoading(false); return }

    const res = await fetch("/api/manuales/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description") || null,
        category: form.get("category"),
        file_path: path,
        file_name: selectedFile.name,
        file_size_bytes: selectedFile.size,
      })
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setOpen(false); setSelectedFile(null); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Subir manual</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea]">
            <h2 className="text-sm font-bold text-[#1a2e1a]">Subir manual o protocolo</h2>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Titulo *</label><input name="title" required className="input-ong" placeholder="Ej: Protocolo de dispensas" /></div>
            <div><label className="label-ong">Descripcion</label><input name="description" className="input-ong" placeholder="Breve descripcion del documento" /></div>
            <div>
              <label className="label-ong">Categoria</label>
              <select name="category" className="input-ong">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-ong">Archivo *</label>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} className="hidden" />
              <div onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-[#c8dcc4] rounded-lg p-4 text-center cursor-pointer hover:border-[#4d8a3d] transition-colors">
                {selectedFile ? (
                  <p className="text-sm text-[#2d5a27] font-medium">{selectedFile.name}</p>
                ) : (
                  <div>
                    <Upload className="w-6 h-6 text-[#9ab894] mx-auto mb-2" />
                    <p className="text-sm text-[#9ab894]">PDF, Word, Excel, PowerPoint</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading || uploading}>
                {uploading ? "Subiendo..." : "Guardar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
