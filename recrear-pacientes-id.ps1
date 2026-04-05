# Recrear archivos de pacientes/[id]
Write-Host "=== Recreando archivos de pacientes/[id] ===" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path "src\app\pacientes\[id]" | Out-Null
New-Item -ItemType Directory -Force -Path "src\app\pacientes\[id]\editar" | Out-Null

# ── page.tsx ─────────────────────────────────────────────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Edit } from "lucide-react"
import { PageHeader, Card, ComplianceBadge, ReprocannBadge, PatientStatusBadge, DocumentStatusBadge, SectionHeader, Button, Badge } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate, formatDateTime, formatGrams, daysUntil } from "@/lib/utils"
import UploadDocumentButton from "./UploadDocumentButton"
import ViewFileButton from "./ViewFileButton"
import DocumentStatusAction from "./DocumentStatusAction"
import QRDisplay from "@/components/qr/QRDisplay"
import DeletePatientButton from "./DeletePatientButton"

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canReview = ["admin", "administrativo", "medico"].includes(profile?.role ?? "")
  const isAdmin = profile?.role === "admin"

  const { data: patient } = await supabase
    .from("patients")
    .select("*, treating_physician:profiles!patients_treating_physician_id_fkey(id, full_name), membership_plan:membership_plans(id, name, monthly_grams, monthly_amount)")
    .eq("id", id).is("deleted_at", null).single()
  if (!patient) notFound()

  const { data: documents } = await supabase
    .from("patient_documents")
    .select("*, doc_type:patient_document_types(id, name, slug, is_mandatory, has_expiry, sort_order)")
    .eq("patient_id", id).order("doc_type(sort_order)")

  const { data: dispenses } = await supabase
    .from("dispenses")
    .select("id, dispensed_at, grams, product_desc, lot:lots(lot_code), performed_by_profile:profiles(full_name)")
    .eq("patient_id", id).order("dispensed_at", { ascending: false }).limit(20)

  const days = daysUntil(patient.reprocann_expiry)
  const totalDispensed = (dispenses ?? []).reduce((acc: number, d: any) => acc + (d.grams ?? 0), 0)
  const totalDocs = (documents ?? []).length
  const approvedDocs = (documents ?? []).filter((d: any) => d.status === "aprobado").length
  const missingDocs = (documents ?? []).filter((d: any) => ["faltante","vencido"].includes(d.status)).length

  return (
    <div className="space-y-5">
      <div>
        <BackButton label="Volver a pacientes" />
        <PageHeader
          title={patient.full_name}
          description={`DNI ${patient.dni} · Alta: ${formatDate(patient.created_at)}`}
          actions={
            <div className="flex items-center gap-2">
              <QRDisplay entityId={id} entityType="patient" entityName={patient.full_name} currentToken={patient.qr_token} />
              <Link href={`/pacientes/${id}/editar`}>
                <Button variant="secondary" size="sm"><Edit className="w-3.5 h-3.5" />Editar</Button>
              </Link>
              {isAdmin && <DeletePatientButton patientId={id} patientName={patient.full_name} />}
            </div>
          }
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <PatientStatusBadge status={patient.status} />
        <ComplianceBadge status={patient.compliance_status} />
        <ReprocannBadge status={patient.reprocann_status} />
        {patient.membership_plan && <Badge>{patient.membership_plan.name}</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1">
          <SectionHeader title="Datos del paciente" />
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs text-slate-500">Nombre completo</dt><dd className="font-medium text-[#1a2e1a]">{patient.full_name}</dd></div>
            <div><dt className="text-xs text-slate-500">DNI</dt><dd className="font-mono">{patient.dni}</dd></div>
            {patient.birth_date && <div><dt className="text-xs text-slate-500">Fecha de nacimiento</dt><dd>{formatDate(patient.birth_date)}</dd></div>}
            {patient.phone && <div><dt className="text-xs text-slate-500">Telefono</dt><dd>{patient.phone}</dd></div>}
            {patient.email && <div><dt className="text-xs text-slate-500">Email</dt><dd>{patient.email}</dd></div>}
            {patient.address && <div><dt className="text-xs text-slate-500">Direccion</dt><dd>{patient.address}</dd></div>}
            {patient.treating_physician && <div><dt className="text-xs text-slate-500">Medico tratante</dt><dd>{patient.treating_physician.full_name}</dd></div>}
          </dl>
        </Card>

        <Card className="col-span-1">
          <SectionHeader title="REPROCANN" />
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs text-slate-500">Estado</dt><dd><ReprocannBadge status={patient.reprocann_status} /></dd></div>
            {patient.reprocann_ref && <div><dt className="text-xs text-slate-500">Numero</dt><dd className="font-mono">{patient.reprocann_ref}</dd></div>}
            {patient.reprocann_expiry && (
              <div>
                <dt className="text-xs text-slate-500">Vencimiento</dt>
                <dd className={days !== null && days < 0 ? "text-red-600 font-medium" : days !== null && days <= 30 ? "text-amber-600" : ""}>
                  {formatDate(patient.reprocann_expiry)}
                  {days !== null && <span className="text-xs ml-1 text-slate-400">({days < 0 ? `vencido hace ${Math.abs(days)}d` : `${days}d restantes`})</span>}
                </dd>
              </div>
            )}
            {!patient.reprocann_expiry && <div className="text-xs text-slate-400 italic">Sin vinculacion registrada</div>}
          </dl>
          {patient.membership_plan && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <SectionHeader title="Membresia" />
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-slate-500">Plan</dt><dd>{patient.membership_plan.name}</dd></div>
                {patient.membership_plan.monthly_grams && <div><dt className="text-xs text-slate-500">Gramos mensuales</dt><dd>{formatGrams(patient.membership_plan.monthly_grams)}</dd></div>}
                <div><dt className="text-xs text-slate-500">Total dispensado</dt><dd>{formatGrams(totalDispensed)}</dd></div>
              </dl>
            </div>
          )}
        </Card>

        <Card className="col-span-1">
          <SectionHeader title="Estado documental" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100"><span className="text-xs text-slate-500">Documentos totales</span><span className="font-medium">{totalDocs}</span></div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100"><span className="text-xs text-slate-500">Aprobados</span><span className="font-medium text-green-700">{approvedDocs}</span></div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100"><span className="text-xs text-slate-500">Faltantes</span><span className={`font-medium ${missingDocs > 0 ? "text-red-600" : "text-[#1a2e1a]"}`}>{missingDocs}</span></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Completitud</span><span>{totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0}%</span></div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className={`h-2 rounded-full ${approvedDocs === totalDocs && totalDocs > 0 ? "bg-green-500" : approvedDocs / totalDocs > 0.5 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${totalDocs > 0 ? (approvedDocs / totalDocs) * 100 : 0}%` }} />
            </div>
          </div>
          {patient.internal_notes && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1">Notas internas</p>
              <p className="text-sm text-[#1a2e1a] whitespace-pre-line">{patient.internal_notes}</p>
            </div>
          )}
        </Card>
      </div>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Legajo documental" /></div>
        <div className="divide-y divide-slate-100">
          {(documents ?? []).map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                doc.status === "aprobado" ? "bg-green-500" :
                doc.status === "pendiente_revision" ? "bg-amber-500" :
                doc.status === "pendiente_vinculacion" ? "bg-slate-300" :
                doc.status === "observado" ? "bg-orange-500" : "bg-red-500"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1a2e1a]">
                  {doc.doc_type?.name}
                  {doc.doc_type?.is_mandatory && <span className="text-xs text-slate-400 ml-1">· Obligatorio</span>}
                </p>
                {doc.file_name && <p className="text-xs text-slate-400 truncate mt-0.5">{doc.file_name}</p>}
                {doc.observations && <p className="text-xs text-orange-600 mt-0.5">Obs: {doc.observations}</p>}
                {doc.reviewed_at && doc.status === "aprobado" && (
                  <p className="text-xs text-green-600 mt-0.5">Aprobado el {formatDate(doc.reviewed_at)}</p>
                )}
              </div>
              {doc.expires_at && <p className="text-xs text-slate-500 shrink-0">Vence: {formatDate(doc.expires_at)}</p>}
              <div className="flex items-center gap-1.5 shrink-0">
                <ViewFileButton filePath={doc.file_path} bucketName="patient-documents" />
                <UploadDocumentButton
                  documentId={doc.id} patientId={id}
                  docTypeSlug={doc.doc_type?.slug} docTypeName={doc.doc_type?.name}
                  hasExpiry={doc.doc_type?.has_expiry} currentStatus={doc.status}
                  currentFilePath={doc.file_path}
                />
                {canReview && (
                  <DocumentStatusAction documentId={doc.id} currentStatus={doc.status} table="patient_documents" isReprocann={doc.doc_type?.slug === "reprocann"} />
                )}
                <DocumentStatusBadge status={doc.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Historial de dispensas" actions={<Link href="/dispensas"><Button size="sm">Registrar dispensa</Button></Link>} />
        </div>
        {(!dispenses || dispenses.length === 0) ? (
          <div className="text-center py-8 text-sm text-slate-400">Sin dispensas registradas</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-ong w-full">
              <thead><tr><th>Fecha</th><th>Producto</th><th>Lote</th><th>Cantidad</th><th>Registrado por</th></tr></thead>
              <tbody>
                {dispenses.map((d: any) => (
                  <tr key={d.id}>
                    <td>{formatDateTime(d.dispensed_at)}</td>
                    <td>{d.product_desc}</td>
                    <td className="font-mono text-xs">{d.lot?.lot_code ?? "—"}</td>
                    <td className="font-medium tabular-nums">{formatGrams(d.grams)}</td>
                    <td className="text-slate-500">{d.performed_by_profile?.full_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
'@
New-Item -Force -Path "src\app\pacientes" -Name "temp_page.tsx" -ItemType File | Out-Null
Set-Content -Path "src\app\pacientes\temp_page.tsx" -Value $content
Write-Host "[OK] page.tsx creado como temp - mover manualmente a [id]/page.tsx" -ForegroundColor Yellow

# ── DeletePatientButton.tsx ───────────────────────────────────
$btn1 = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"

export default function DeletePatientButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Dar de baja a "${patientName}"? El registro quedara archivado y no aparecera en el listado activo.`)) return
    setLoading(true)
    const res = await fetch("/api/admin/delete-patient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setLoading(false); return }
    router.push("/pacientes")
  }

  return (
    <button onClick={handleDelete} disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      Dar de baja
    </button>
  )
}
'@
Set-Content -Path "src\app\pacientes\temp_delete.tsx" -Value $btn1
Write-Host "[OK] DeletePatientButton creado como temp_delete.tsx" -ForegroundColor Yellow

# ── UploadDocumentButton.tsx ──────────────────────────────────
$btn2 = @'
"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, X, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  documentId: string; patientId: string; docTypeSlug: string; docTypeName: string
  hasExpiry: boolean; currentStatus: string; currentFilePath?: string | null
}

export default function UploadDocumentButton({ documentId, patientId, docTypeSlug, docTypeName, hasExpiry, currentStatus, currentFilePath }: Props) {
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
    if (currentFilePath) await supabase.storage.from("patient-documents").remove([currentFilePath])
    const ext = file.name.split(".").pop()
    const path = `${patientId}/${docTypeSlug}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from("patient-documents").upload(path, file, { upsert: true })
    if (uploadError) { setError("Error al subir: " + uploadError.message); setLoading(false); return }
    const updateData: any = { file_path: path, file_name: file.name, file_size_bytes: file.size, status: "pendiente_revision", uploaded_by: user.id, uploaded_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (expiryDate) updateData.expires_at = expiryDate
    await supabase.from("patient_documents").update(updateData).eq("id", documentId)
    setLoading(false); setShowExpiry(false); setSelectedFile(null); router.refresh()
  }

  async function deleteFile() {
    if (!confirm("Eliminar este archivo?")) return
    setDeleting(true)
    const supabase = createClient()
    if (currentFilePath) await supabase.storage.from("patient-documents").remove([currentFilePath])
    await supabase.from("patient_documents").update({ file_path: null, file_name: null, file_size_bytes: null, expires_at: null, observations: null, reviewed_by: null, reviewed_at: null, status: docTypeSlug === "reprocann" ? "pendiente_vinculacion" : "faltante", uploaded_by: null, uploaded_at: null, updated_at: new Date().toISOString() }).eq("id", documentId)
    setDeleting(false); router.refresh()
  }

  if (showExpiry && selectedFile) {
    return (
      <div className="flex items-center gap-2">
        <div>
          <p className="text-xs text-slate-500 mb-1">Fecha de vencimiento *</p>
          <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="text-xs border border-slate-300 rounded px-2 py-1" />
        </div>
        <button onClick={() => uploadFile(selectedFile, expiry)} disabled={!expiry || loading} className="text-xs bg-slate-900 text-white rounded px-2 py-1.5 disabled:opacity-50 flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmar"}
        </button>
        <button onClick={() => { setShowExpiry(false); setSelectedFile(null) }} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
      </div>
    )
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
      {error && <span className="text-xs text-red-500 mr-1">{error}</span>}
      <div className="flex items-center gap-1">
        <button onClick={() => inputRef.current?.click()} disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 hover:border-slate-400 transition-colors disabled:opacity-50" title={hasFile ? `Reemplazar ${docTypeName}` : `Subir ${docTypeName}`}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : hasFile ? <RefreshCw className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
          {hasFile ? "Reemplazar" : "Subir"}
        </button>
        {hasFile && (
          <button onClick={deleteFile} disabled={deleting} className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-100 rounded px-2 py-1 hover:border-red-300 transition-colors disabled:opacity-50" title="Eliminar archivo">
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        )}
      </div>
    </>
  )
}
'@
Set-Content -Path "src\app\pacientes\temp_upload.tsx" -Value $btn2
Write-Host "[OK] UploadDocumentButton creado como temp_upload.tsx" -ForegroundColor Yellow

# ── ViewFileButton.tsx ────────────────────────────────────────
$btn3 = @'
"use client"
import { useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props { filePath: string | null; bucketName: "patient-documents" | "org-documents" }

export default function ViewFileButton({ filePath, bucketName }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!filePath) return null

  async function handleView() {
    if (!filePath) return
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data, error: signError } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 60)
    if (signError || !data?.signedUrl) { setError("No se pudo abrir el archivo"); setLoading(false); return }
    window.open(data.signedUrl, "_blank")
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-1">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button onClick={handleView} disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 hover:border-slate-400 transition-colors disabled:opacity-50" title="Ver archivo">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
        Ver
      </button>
    </div>
  )
}
'@
Set-Content -Path "src\app\pacientes\temp_view.tsx" -Value $btn3
Write-Host "[OK] ViewFileButton creado como temp_view.tsx" -ForegroundColor Yellow

# ── DocumentStatusAction.tsx ──────────────────────────────────
$btn4 = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props { documentId: string; currentStatus: string; table: "patient_documents" | "org_documents"; isReprocann?: boolean }

export default function DocumentStatusAction({ documentId, currentStatus, table, isReprocann }: Props) {
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showObservation, setShowObservation] = useState(false)
  const [observation, setObservation] = useState("")
  const router = useRouter()

  if (currentStatus === "faltante" || currentStatus === "pendiente_vinculacion") return null

  async function changeStatus(newStatus: string, obs?: string) {
    setLoading(true); setShowMenu(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const updateData: any = { status: newStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (newStatus === "observado" && obs) updateData.observations = obs
    if (newStatus !== "observado") updateData.observations = null
    await supabase.from(table).update(updateData).eq("id", documentId)
    setLoading(false); setShowObservation(false); setObservation(""); router.refresh()
  }

  if (showObservation) {
    return (
      <div className="flex items-center gap-2">
        <input type="text" value={observation} onChange={e => setObservation(e.target.value)} placeholder="Motivo..." className="text-xs border border-slate-300 rounded px-2 py-1 w-40" autoFocus onKeyDown={e => e.key === "Enter" && observation.trim() && changeStatus("observado", observation)} />
        <button onClick={() => changeStatus("observado", observation)} disabled={!observation.trim() || loading} className="text-xs bg-orange-500 text-white rounded px-2 py-1.5 disabled:opacity-50 flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Observar"}
        </button>
        <button onClick={() => setShowObservation(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button onClick={() => setShowMenu(!showMenu)} disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 hover:border-slate-400 transition-colors disabled:opacity-50">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Revisar"}
        {!loading && <ChevronDown className="w-3 h-3" />}
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 w-48 py-1">
            {currentStatus !== "aprobado" && <button onClick={() => changeStatus("aprobado")} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-green-50 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" />Aprobar</button>}
            <button onClick={() => { setShowMenu(false); setShowObservation(true) }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-orange-50 text-orange-700"><AlertCircle className="w-3.5 h-3.5" />Observar</button>
            {currentStatus !== "pendiente_revision" && <button onClick={() => changeStatus("pendiente_revision")} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-amber-50 text-amber-700"><AlertCircle className="w-3.5 h-3.5" />Volver a pendiente</button>}
            <div className="border-t border-slate-100 my-1" />
            <button onClick={() => changeStatus("vencido")} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-red-50 text-red-700"><XCircle className="w-3.5 h-3.5" />Marcar vencido</button>
          </div>
        </>
      )}
    </div>
  )
}
'@
Set-Content -Path "src\app\pacientes\temp_status.tsx" -Value $btn4
Write-Host "[OK] DocumentStatusAction creado como temp_status.tsx" -ForegroundColor Yellow

# ── editar/page.tsx ───────────────────────────────────────────
$editContent = @'
"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { PageHeader, Card, Button, Alert } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"

export default function EditarPacientePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [patient, setPatient] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [physicians, setPhysicians] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data: p } = await supabase.from("patients").select("*").eq("id", id).single()
      const { data: pl } = await supabase.from("membership_plans").select("id, name").eq("is_active", true)
      const { data: ph } = await supabase.from("profiles").select("id, full_name").eq("role", "medico").eq("is_active", true)
      setPatient(p); setPlans(pl ?? []); setPhysicians(ph ?? []); setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: err } = await supabase.from("patients").update({
      full_name: form.get("full_name"), dni: form.get("dni"),
      birth_date: form.get("birth_date") || null, phone: form.get("phone") || null,
      email: form.get("email") || null, address: form.get("address") || null,
      reprocann_ref: form.get("reprocann_ref") || null, reprocann_expiry: form.get("reprocann_expiry") || null,
      status: form.get("status"), membership_plan_id: form.get("membership_plan_id") || null,
      treating_physician_id: form.get("treating_physician_id") || null,
      internal_notes: form.get("internal_notes") || null, updated_at: new Date().toISOString(),
    }).eq("id", id)
    if (err) { setError(err.message); setSaving(false); return }
    setSuccess(true); setSaving(false)
    setTimeout(() => router.push(`/pacientes/${id}`), 1200)
  }

  if (loading || !patient) return <div className="flex items-center justify-center py-20"><p className="text-sm text-slate-400">Cargando...</p></div>

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <BackButton label="Volver a la ficha" />
        <PageHeader title={`Editar — ${patient.full_name}`} description="Modifica los datos del paciente" />
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">Paciente actualizado correctamente. Redirigiendo...</Alert>}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Datos personales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label-ong">Nombre y apellido *</label><input name="full_name" required defaultValue={patient.full_name} className="input-ong" /></div>
              <div><label className="label-ong">DNI *</label><input name="dni" required defaultValue={patient.dni} className="input-ong font-mono" /></div>
              <div><label className="label-ong">Fecha de nacimiento</label><input name="birth_date" type="date" defaultValue={patient.birth_date ?? ""} className="input-ong" /></div>
              <div><label className="label-ong">Telefono</label><input name="phone" type="tel" defaultValue={patient.phone ?? ""} className="input-ong" /></div>
              <div><label className="label-ong">Email</label><input name="email" type="email" defaultValue={patient.email ?? ""} className="input-ong" /></div>
              <div className="col-span-2"><label className="label-ong">Direccion</label><input name="address" defaultValue={patient.address ?? ""} className="input-ong" /></div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">REPROCANN</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-ong">Numero / referencia</label><input name="reprocann_ref" defaultValue={patient.reprocann_ref ?? ""} className="input-ong font-mono" /></div>
              <div><label className="label-ong">Fecha de vencimiento</label><input name="reprocann_expiry" type="date" defaultValue={patient.reprocann_expiry ?? ""} className="input-ong" /></div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Estado y asignaciones</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-ong">Estado del paciente</label>
                <select name="status" defaultValue={patient.status} className="input-ong">
                  <option value="activo">Activo</option>
                  <option value="pendiente_documental">Pendiente documental</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div><label className="label-ong">Plan de membresia</label>
                <select name="membership_plan_id" defaultValue={patient.membership_plan_id ?? ""} className="input-ong">
                  <option value="">Sin plan asignado</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {physicians.length > 0 && (
                <div className="col-span-2"><label className="label-ong">Medico tratante</label>
                  <select name="treating_physician_id" defaultValue={patient.treating_physician_id ?? ""} className="input-ong">
                    <option value="">Sin asignar</option>
                    {physicians.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notas internas</h2>
            <textarea name="internal_notes" rows={3} defaultValue={patient.internal_notes ?? ""} className="input-ong resize-none" placeholder="Observaciones internas..." />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Link href={`/pacientes/${id}`}><Button variant="secondary" type="button">Cancelar</Button></Link>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\pacientes\temp_editar.tsx" -Value $editContent
Write-Host "[OK] editar/page.tsx creado como temp_editar.tsx" -ForegroundColor Yellow

Write-Host ""
Write-Host "=== Archivos temporales creados en src\app\pacientes\ ===" -ForegroundColor Cyan
Write-Host "Ahora en VS Code, moverlos a src\app\pacientes\[id]\:" -ForegroundColor White
Write-Host "  temp_page.tsx    -> [id]\page.tsx" -ForegroundColor Gray
Write-Host "  temp_delete.tsx  -> [id]\DeletePatientButton.tsx" -ForegroundColor Gray
Write-Host "  temp_upload.tsx  -> [id]\UploadDocumentButton.tsx" -ForegroundColor Gray
Write-Host "  temp_view.tsx    -> [id]\ViewFileButton.tsx" -ForegroundColor Gray
Write-Host "  temp_status.tsx  -> [id]\DocumentStatusAction.tsx" -ForegroundColor Gray
Write-Host "  temp_editar.tsx  -> [id]\editar\page.tsx" -ForegroundColor Gray
