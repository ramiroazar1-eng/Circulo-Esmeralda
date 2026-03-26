"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, X, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  documentId: string
  patientId: string
  docTypeSlug: string
  docTypeName: string
  hasExpiry: boolean
  currentStatus: string
  currentFilePath?: string | null
}

export default function UploadDocumentButton({
  documentId, patientId, docTypeSlug, docTypeName,
  hasExpiry, currentStatus, currentFilePath
}: Props) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showExpiry, setShowExpiry] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expiry, setExpiry] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const hasFile = !!currentFilePath

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    if (hasExpiry) { setShowExpiry(true) } else { uploadFile(file, "") }
  }

  async function uploadFile(file: File, expiryDate: string) {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    if (currentFilePath) {
      await supabase.storage.from("patient-documents").remove([currentFilePath])
    }

    const ext = file.name.split(".").pop()
    const path = `${patientId}/${docTypeSlug}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from("patient-documents").upload(path, file, { upsert: true })

    if (uploadError) { setError("Error al subir: " + uploadError.message); setLoading(false); return }

    const updateData: any = {
      file_path: path, file_name: file.name, file_size_bytes: file.size,
      status: "pendiente_revision", uploaded_by: user.id,
      uploaded_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    if (expiryDate) updateData.expires_at = expiryDate

    await supabase.from("patient_documents").update(updateData).eq("id", documentId)
    setLoading(false); setShowExpiry(false); setSelectedFile(null); router.refresh()
  }

  async function deleteFile() {
    if (!confirm("Eliminar este archivo? El documento volvera al estado Faltante.")) return
    setDeleting(true)
    const supabase = createClient()
    if (currentFilePath) await supabase.storage.from("patient-documents").remove([currentFilePath])
  await supabase.from("patient_documents").update({
  file_path: null,
  file_name: null,
  file_size_bytes: null,
  expires_at: null,
  observations: null,
  reviewed_by: null,
  reviewed_at: null,
  status: docTypeSlug === "reprocann" ? "pendiente_vinculacion" : "faltante",
  uploaded_by: null,
  uploaded_at: null,
  updated_at: new Date().toISOString(),
}).eq("id", documentId)
    setDeleting(false); router.refresh()
  }

  if (showExpiry && selectedFile) {
    return (
      <div className="flex items-center gap-2">
        <div>
          <p className="text-xs text-slate-500 mb-1">Fecha de vencimiento *</p>
          <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="text-xs border border-slate-300 rounded px-2 py-1" />
        </div>
        <button onClick={() => uploadFile(selectedFile, expiry)} disabled={!expiry || loading}
          className="text-xs bg-slate-900 text-white rounded px-2 py-1.5 disabled:opacity-50 flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmar"}
        </button>
        <button onClick={() => { setShowExpiry(false); setSelectedFile(null) }} className="text-slate-400 hover:text-red-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
      {error && <span className="text-xs text-red-500 mr-1">{error}</span>}
      <div className="flex items-center gap-1">
        <button onClick={() => inputRef.current?.click()} disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 hover:border-slate-400 transition-colors disabled:opacity-50"
          title={hasFile ? `Reemplazar ${docTypeName}` : `Subir ${docTypeName}`}>
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
