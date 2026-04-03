"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, RefreshCw, Trash2, Eye, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const DOC_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  faltante:             { label: "Faltante",           color: "text-red-400",    icon: XCircle },
  pendiente_revision:   { label: "En revision",        color: "text-amber-400",  icon: Clock },
  aprobado:             { label: "Aprobado",            color: "text-green-400",  icon: CheckCircle2 },
  observado:            { label: "Observado",           color: "text-orange-400", icon: AlertCircle },
  vencido:              { label: "Vencido",             color: "text-red-400",    icon: XCircle },
  pendiente_vinculacion:{ label: "Sin vincular",        color: "text-slate-400",  icon: Clock },
}

interface DocItem {
  id: string; status: string; file_path: string | null; file_name: string | null
  expires_at: string | null; observations: string | null; patient_id: string
  doc_type: { name: string; slug: string; has_expiry: boolean; is_mandatory: boolean } | null
}

export default function MisDocumentosPage() {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [patientId, setPatientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [showExpiry, setShowExpiry] = useState<{ docId: string; file: File } | null>(null)
  const [expiry, setExpiry] = useState("")
  const router = useRouter()
  const inputRefs = useRef<Record<string, HTMLInputElement>>({})

  useEffect(() => {
    loadDocs()
  }, [])

  async function loadDocs() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    const { data: profile } = await supabase
      .from("profiles").select("patient_id").eq("id", user.id).single()

    console.log('PATIENT_ID:', profile?.patient_id)
    if (!profile?.patient_id) { setLoading(false); return }
    setPatientId(profile.patient_id)

    const { data } = await supabase
      .from("patient_documents") /* DEBUG */
      .select("*, doc_type:patient_document_types(name, slug, has_expiry, is_mandatory)")
      .eq("patient_id", profile.patient_id)
      .order("doc_type(sort_order)")

    setDocs((data ?? []) as DocItem[])
    setLoading(false)
  }

  async function handleFileSelect(docId: string, file: File, hasExpiry: boolean) {
    if (hasExpiry) {
      setShowExpiry({ docId, file })
    } else {
      await uploadFile(docId, file, "")
    }
  }

  async function uploadFile(docId: string, file: File, expiryDate: string) {
    setUploading(docId)
    setShowExpiry(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !patientId) { setUploading(null); return }

    const doc = docs.find(d => d.id === docId)
    const slug = doc?.doc_type?.slug ?? "doc"

    // Eliminar archivo anterior
    if (doc?.file_path) {
      await supabase.storage.from("patient-documents").remove([doc.file_path])
    }

    const ext = file.name.split(".").pop()
    const path = `${patientId}/${slug}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("patient-documents").upload(path, file, { upsert: true })

    if (uploadError) { alert("Error al subir: " + uploadError.message); setUploading(null); return }

    const updateData: any = {
      file_path: path, file_name: file.name, file_size_bytes: file.size,
      status: "pendiente_revision", uploaded_by: user.id,
      uploaded_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    if (expiryDate) updateData.expires_at = expiryDate

    await supabase.from("patient_documents") /* DEBUG */.update(updateData).eq("id", docId)
    setUploading(null)
    loadDocs()
  }

  async function deleteFile(docId: string, filePath: string, slug: string) {
    if (!confirm("Eliminar este archivo?")) return
    setUploading(docId)
    const supabase = createClient()
    await supabase.storage.from("patient-documents").remove([filePath])
    await supabase.from("patient_documents") /* DEBUG */.update({
      file_path: null, file_name: null, file_size_bytes: null,
      status: slug === "reprocann" ? "pendiente_vinculacion" : "faltante",
      uploaded_by: null, uploaded_at: null, expires_at: null,
      observations: null, updated_at: new Date().toISOString(),
    }).eq("id", docId)
    setUploading(null)
    loadDocs()
  }

  async function viewFile(filePath: string) {
    const supabase = createClient()
    const { data } = await supabase.storage.from("patient-documents").createSignedUrl(filePath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-sm mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/mi-perfil")} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Mis documentos</h1>
            <p className="text-xs text-slate-400">Subi tus documentos para que el equipo los revise</p>
          </div>
        </div>

        {/* Expiry modal */}
        {showExpiry && (
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-600 space-y-3">
            <p className="text-sm font-medium text-white">Fecha de vencimiento del documento</p>
            <p className="text-xs text-slate-400">Ingresa la fecha que figura en el REPROCANN</p>
            <input
              type="date"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowExpiry(null); setExpiry("") }}
                className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 text-sm"
              >Cancelar</button>
              <button
                disabled={!expiry}
                onClick={() => uploadFile(showExpiry.docId, showExpiry.file, expiry)}
                className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm disabled:opacity-50"
              >Subir</button>
            </div>
          </div>
        )}

        {/* Lista de documentos */}
        <div className="space-y-3">
          {docs.map(doc => {
            const config = DOC_STATUS_CONFIG[doc.status] ?? DOC_STATUS_CONFIG.faltante
            const Icon = config.icon
            const isLoading = uploading === doc.id

            return (
              <div key={doc.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{doc.doc_type?.name}</p>
                      {doc.doc_type?.is_mandatory && (
                        <span className="text-xs text-slate-500">Obligatorio</span>
                      )}
                    </div>
                    {doc.file_name && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{doc.file_name}</p>
                    )}
                    {doc.expires_at && (
                      <p className="text-xs text-amber-400 mt-0.5">
                        Vence: {new Date(doc.expires_at).toLocaleDateString("es-AR")}
                      </p>
                    )}
                    {doc.observations && (
                      <p className="text-xs text-orange-400 mt-0.5">Obs: {doc.observations}</p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 shrink-0 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{config.label}</span>
                  </div>
                </div>

                {/* Acciones */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Ver archivo */}
                    {doc.file_path && (
                      <button
                        onClick={() => viewFile(doc.file_path!)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-xs text-slate-300 hover:bg-white/10 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />Ver
                      </button>
                    )}

                    {/* Subir / reemplazar */}
                    {doc.status !== "aprobado" && (
                      <>
                        <input
                          ref={el => { if (el) inputRefs.current[doc.id] = el }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleFileSelect(doc.id, file, doc.doc_type?.has_expiry ?? false)
                            e.target.value = ""
                          }}
                        />
                        <button
                          onClick={() => inputRefs.current[doc.id]?.click()}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 text-xs text-white hover:bg-white/20 transition-colors"
                        >
                          {doc.file_path
                            ? <><RefreshCw className="w-3.5 h-3.5" />Reemplazar</>
                            : <><Upload className="w-3.5 h-3.5" />Subir</>
                          }
                        </button>
                      </>
                    )}

                    {/* Eliminar */}
                    {doc.file_path && doc.status !== "aprobado" && (
                      <button
                        onClick={() => deleteFile(doc.id, doc.file_path!, doc.doc_type?.slug ?? "")}
                        className="p-2 rounded-xl border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Aprobado - solo lectura */}
                    {doc.status === "aprobado" && (
                      <p className="text-xs text-slate-500 flex-1 text-center">Documento aprobado por el equipo</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 text-center">
            Los documentos subidos son revisados por el equipo de la ONG. Una vez aprobados no pueden ser modificados.
          </p>
        </div>

        <p className="text-center text-xs text-slate-700 pb-4">
          Sistema interno ONG Cannabis Medicinal
        </p>
      </div>
    </div>
  )
}
