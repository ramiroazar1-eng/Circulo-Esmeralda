"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, X, FileText } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { PageHeader, Card, Button, Alert } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"

interface FileItem { file: File; docType: string; preview: string }

const DOC_TYPES = [
  { value: "dni_frente", label: "DNI frente" },
  { value: "dni_dorso", label: "DNI dorso" },
  { value: "reprocann", label: "REPROCANN" },
  { value: "orden_medica", label: "Orden medica" },
  { value: "consentimiento", label: "Consentimiento informado" },
]

export default function NuevoPacientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFiles(prev => [...prev, { file, docType: "", preview: file.name }])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function updateDocType(idx: number, docType: string) {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, docType } : f))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("No autenticado"); setLoading(false); return }

    // Crear paciente
    const payload = {
      full_name: form.get("full_name") as string,
      dni: form.get("dni") as string,
      birth_date: form.get("birth_date") || null,
      phone: form.get("phone") || null,
      email: form.get("email") || null,
      address: form.get("address") || null,
      reprocann_ref: form.get("reprocann_ref") || null,
      reprocann_expiry: form.get("reprocann_expiry") || null,
      internal_notes: form.get("internal_notes") || null,
      created_by: user.id,
    }

    const { data: patient, error: insertError } = await supabase.from("patients").insert(payload).select("id").single()
    if (insertError) {
      setError(insertError.code === "23505" ? "Ya existe un paciente con ese DNI." : insertError.message)
      setLoading(false)
      return
    }

    // Crear documentos para el nuevo paciente
    const { data: docTypes } = await supabase.from("patient_document_types").select("id, slug").eq("is_active", true)
    if (docTypes && docTypes.length > 0) {
      const docs = docTypes.map((dt: any) => ({
        patient_id: patient.id,
        doc_type_id: dt.id,
        status: dt.slug === "reprocann" ? "pendiente_vinculacion" : "faltante"
      }))
      await supabase.from("patient_documents").insert(docs)
    }

    // Subir archivos si hay
    for (const item of files) {
      if (!item.docType) continue
      const ext = item.file.name.split(".").pop()
      const path = `${patient.id}/${item.docType}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from("patient-documents").upload(path, item.file)
      if (uploadError) continue

      // Obtener doc_type_id
      const { data: docType } = await supabase.from("patient_document_types").select("id").eq("slug", item.docType).single()
      if (!docType) continue

      await supabase.from("patient_documents").update({
        file_path: path,
        file_name: item.file.name,
        file_size_bytes: item.file.size,
        status: "pendiente_revision",
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      }).eq("patient_id", patient.id).eq("doc_type_id", docType.id)
    }

    router.push(`/pacientes/${patient.id}`)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <BackButton label="Volver a pacientes" />
        <PageHeader title="Nuevo paciente" description="Completa los datos basicos. El legajo documental se crea automaticamente." />
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Datos personales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label-ong">Nombre y apellido *</label><input name="full_name" required className="input-ong" placeholder="Apellido, Nombre" /></div>
              <div><label className="label-ong">DNI *</label><input name="dni" required className="input-ong font-mono" placeholder="00000000" /></div>
              <div><label className="label-ong">Fecha de nacimiento</label><input name="birth_date" type="date" className="input-ong" /></div>
              <div><label className="label-ong">Telefono</label><input name="phone" type="tel" className="input-ong" /></div>
              <div><label className="label-ong">Email</label><input name="email" type="email" className="input-ong" /></div>
              <div className="col-span-2"><label className="label-ong">Direccion</label><input name="address" className="input-ong" /></div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">REPROCANN</h2>
            <p className="text-xs text-slate-500 mb-3">Si el paciente aun no tiene REPROCANN, deja estos campos vacios.</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-ong">Numero / referencia</label><input name="reprocann_ref" className="input-ong font-mono" /></div>
              <div><label className="label-ong">Fecha de vencimiento</label><input name="reprocann_expiry" type="date" className="input-ong" /></div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Documentacion (opcional)</h2>
            <p className="text-xs text-slate-500 mb-3">Podes subir documentos ahora o hacerlo despues desde la ficha del paciente.</p>
            <div className="space-y-2">
              {files.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 truncate flex-1">{item.preview}</span>
                  <select
                    value={item.docType}
                    onChange={e => updateDocType(idx, e.target.value)}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="">Tipo de documento...</option>
                    {DOC_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                  </select>
                  <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={addFile} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-md px-4 py-3 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                Agregar archivo (PDF, JPG, PNG)
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notas internas</h2>
            <textarea name="internal_notes" rows={3} className="input-ong resize-none" placeholder="Observaciones internas..." />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Link href="/pacientes"><Button variant="secondary" type="button">Cancelar</Button></Link>
            <Button type="submit" loading={loading}>Crear paciente</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
