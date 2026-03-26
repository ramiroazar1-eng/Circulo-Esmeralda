"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  docId: string
  docName: string
  docType: string
  currentFilePath?: string | null
}

export default function UploadOrgDocButton({ docId, docName, docType, currentFilePath }: Props) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const hasFile = !!currentFilePath

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    if (currentFilePath) {
      await supabase.storage.from("org-documents").remove([currentFilePath])
    }

    const ext = file.name.split(".").pop()
    const path = `${docType}/${docId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from("org-documents").upload(path, file, { upsert: true })

    if (uploadError) { setError("Error: " + uploadError.message); setLoading(false); return }

    await supabase.from("org_documents").update({
      file_path: path, file_name: file.name, file_size_bytes: file.size,
      status: "pendiente_revision", uploaded_by: user.id,
      uploaded_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", docId)

    setLoading(false)
    if (inputRef.current) inputRef.current.value = ""
    router.refresh()
  }

  async function deleteFile() {
    if (!confirm("Eliminar este archivo? El documento volvera al estado Faltante.")) return
    setDeleting(true)
    const supabase = createClient()
    if (currentFilePath) await supabase.storage.from("org-documents").remove([currentFilePath])
    await supabase.from("org_documents").update({
      file_path: null, file_name: null, file_size_bytes: null,
      status: "faltante", uploaded_by: null, uploaded_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", docId)
    setDeleting(false); router.refresh()
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFile} className="hidden" />
      {error && <span className="text-xs text-red-500 mr-1">{error}</span>}
      <div className="flex items-center gap-1">
        <button onClick={() => inputRef.current?.click()} disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 hover:border-slate-400 transition-colors disabled:opacity-50"
          title={hasFile ? `Reemplazar ${docName}` : `Subir ${docName}`}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : hasFile ? <RefreshCw className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
          {hasFile ? "Reemplazar" : "Subir"}
        </button>
        {hasFile && (
          <button onClick={deleteFile} disabled={deleting}
            className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-100 rounded px-2 py-1 hover:border-red-300 transition-colors disabled:opacity-50"
            title="Eliminar archivo">
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        )}
      </div>
    </>
  )
}
