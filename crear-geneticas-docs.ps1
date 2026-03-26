# Setup ONG Cannabis - Parte 5: Geneticas, salas y documentos de paciente
Write-Host "=== Geneticas, salas y documentos ===" -ForegroundColor Cyan

# ── Configuracion: agregar seccion geneticas y salas ────────
$content = @'
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, SectionHeader } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatARS, formatGrams } from "@/lib/utils"
import { CreditCard, FlaskConical, DoorOpen } from "lucide-react"
import NewPlanModal from "./NewPlanModal"
import EditPlanButton from "./EditPlanButton"
import NewGeneticModal from "./NewGeneticModal"
import NewRoomModal from "./NewRoomModal"

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: plans } = await supabase.from("membership_plans").select("*").order("monthly_amount")
  const { data: genetics } = await supabase.from("genetics").select("*").order("name")
  const { data: rooms } = await supabase.from("rooms").select("*").order("name")

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Configuracion" description="Planes, geneticas, salas y parametros del sistema" />

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Planes de membresia" actions={<NewPlanModal />} /></div>
        {(!plans || plans.length === 0) ? (
          <div className="pb-5"><EmptyState title="Sin planes definidos" icon={CreditCard} /></div>
        ) : (
          <Table>
            <thead><tr><th>Nombre</th><th>Descripcion</th><th>Gramos mensuales</th><th>Monto mensual</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {plans.map((plan: any) => (
                <tr key={plan.id}>
                  <td className="font-medium text-slate-900">{plan.name}</td>
                  <td className="text-slate-500">{plan.description ?? "—"}</td>
                  <td className="tabular-nums">{plan.monthly_grams ? formatGrams(plan.monthly_grams) : "—"}</td>
                  <td className="tabular-nums font-medium">{formatARS(plan.monthly_amount)}</td>
                  <td><span className={`text-xs rounded px-1.5 py-0.5 border ${plan.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{plan.is_active ? "Activo" : "Inactivo"}</span></td>
                  <td><EditPlanButton plan={plan} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Geneticas" actions={<NewGeneticModal />} /></div>
        {(!genetics || genetics.length === 0) ? (
          <div className="pb-5"><EmptyState title="Sin geneticas definidas" icon={FlaskConical} /></div>
        ) : (
          <Table>
            <thead><tr><th>Nombre</th><th>Descripcion</th><th>Estado</th></tr></thead>
            <tbody>
              {genetics.map((g: any) => (
                <tr key={g.id}>
                  <td className="font-medium text-slate-900">{g.name}</td>
                  <td className="text-slate-500">{g.description ?? "—"}</td>
                  <td><span className={`text-xs rounded px-1.5 py-0.5 border ${g.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{g.is_active ? "Activa" : "Inactiva"}</span></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Salas de produccion" actions={<NewRoomModal />} /></div>
        {(!rooms || rooms.length === 0) ? (
          <div className="pb-5"><EmptyState title="Sin salas definidas" icon={DoorOpen} /></div>
        ) : (
          <Table>
            <thead><tr><th>Nombre</th><th>Descripcion</th><th>Estado</th></tr></thead>
            <tbody>
              {rooms.map((r: any) => (
                <tr key={r.id}>
                  <td className="font-medium text-slate-900">{r.name}</td>
                  <td className="text-slate-500">{r.description ?? "—"}</td>
                  <td><span className={`text-xs rounded px-1.5 py-0.5 border ${r.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{r.is_active ? "Activa" : "Inactiva"}</span></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
'@
Set-Content -Path "src\app\configuracion\page.tsx" -Value $content
Write-Host "[OK] Configuracion con geneticas y salas" -ForegroundColor Green

# ── Modal nueva genetica ─────────────────────────────────────
$content = @'
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
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
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
'@
Set-Content -Path "src\app\configuracion\NewGeneticModal.tsx" -Value $content
Write-Host "[OK] NewGeneticModal" -ForegroundColor Green

# ── Modal nueva sala ─────────────────────────────────────────
$content = @'
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export default function NewRoomModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: err } = await supabase.from("rooms").insert({
      name: form.get("name"),
      description: form.get("description") || null,
      is_active: true
    })
    if (err) { setError(err.code === "23505" ? "Ya existe una sala con ese nombre." : err.message); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nueva sala</Button>
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nueva sala de produccion</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Nombre *</label><input name="name" required className="input-ong" placeholder="Ej: Sala 1, Sala vegetativa..." /></div>
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
'@
Set-Content -Path "src\app\configuracion\NewRoomModal.tsx" -Value $content
Write-Host "[OK] NewRoomModal" -ForegroundColor Green

# ── Ficha paciente con carga de documentos ───────────────────
New-Item -ItemType Directory -Force -Path "src\app\pacientes\[id]" | Out-Null
$content = @'
import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit } from "lucide-react"
import { PageHeader, Card, ComplianceBadge, ReprocannBadge, PatientStatusBadge, DocumentStatusBadge, SectionHeader, Button, Badge } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate, formatDateTime, formatGrams, daysUntil } from "@/lib/utils"
import UploadDocumentButton from "./UploadDocumentButton"

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: patient } = await supabase.from("patients").select("*, treating_physician:profiles!patients_treating_physician_id_fkey(id, full_name), membership_plan:membership_plans(id, name, monthly_grams, monthly_amount)").eq("id", id).is("deleted_at", null).single()
  if (!patient) notFound()
  const { data: documents } = await supabase.from("patient_documents").select("*, doc_type:patient_document_types(id, name, slug, is_mandatory, has_expiry, sort_order)").eq("patient_id", id).order("doc_type(sort_order)")
  const { data: dispenses } = await supabase.from("dispenses").select("id, dispensed_at, grams, product_desc, lot:lots(lot_code), performed_by_profile:profiles(full_name)").eq("patient_id", id).order("dispensed_at", { ascending: false }).limit(20)

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
            <Link href={`/pacientes/${id}/editar`}>
              <Button variant="secondary" size="sm"><Edit className="w-3.5 h-3.5" />Editar</Button>
            </Link>
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
            <div><dt className="text-xs text-slate-500">Nombre completo</dt><dd className="font-medium text-slate-900">{patient.full_name}</dd></div>
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
            <div className="flex justify-between items-center py-2 border-b border-slate-100"><span className="text-xs text-slate-500">Faltantes</span><span className={`font-medium ${missingDocs > 0 ? "text-red-600" : "text-slate-700"}`}>{missingDocs}</span></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Completitud</span><span>{totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0}%</span></div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className={`h-2 rounded-full ${approvedDocs === totalDocs && totalDocs > 0 ? "bg-green-500" : approvedDocs / totalDocs > 0.5 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${totalDocs > 0 ? (approvedDocs / totalDocs) * 100 : 0}%` }} />
            </div>
          </div>
          {patient.internal_notes && <div className="mt-5 pt-5 border-t border-slate-100"><p className="text-xs font-medium text-slate-500 mb-1">Notas internas</p><p className="text-sm text-slate-700 whitespace-pre-line">{patient.internal_notes}</p></div>}
        </Card>
      </div>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Legajo documental" />
        </div>
        <div className="divide-y divide-slate-100">
          {(documents ?? []).map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-4 px-5 py-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                doc.status === "aprobado" ? "bg-green-500" :
                doc.status === "pendiente_revision" ? "bg-amber-500" :
                doc.status === "pendiente_vinculacion" ? "bg-slate-300" :
                doc.status === "observado" ? "bg-orange-500" : "bg-red-500"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900">
                  {doc.doc_type?.name}
                  {doc.doc_type?.is_mandatory && <span className="text-xs text-slate-400 ml-1">· Obligatorio</span>}
                </p>
                {doc.file_name && <p className="text-xs text-slate-400 truncate mt-0.5">{doc.file_name}</p>}
                {doc.observations && <p className="text-xs text-orange-600 mt-0.5">{doc.observations}</p>}
              </div>
              {doc.expires_at && <p className="text-xs text-slate-500 shrink-0">Vence: {formatDate(doc.expires_at)}</p>}
              <div className="flex items-center gap-2 shrink-0">
                <UploadDocumentButton
                  documentId={doc.id}
                  patientId={id}
                  docTypeSlug={doc.doc_type?.slug}
                  docTypeName={doc.doc_type?.name}
                  hasExpiry={doc.doc_type?.has_expiry}
                  currentStatus={doc.status}
                />
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
Set-Content -Path "src\app\pacientes\[id]\page.tsx" -Value $content
Write-Host "[OK] Ficha paciente con carga de docs" -ForegroundColor Green

# ── Boton de carga de documento por fila ─────────────────────
$content = @'
"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, X, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  documentId: string
  patientId: string
  docTypeSlug: string
  docTypeName: string
  hasExpiry: boolean
  currentStatus: string
}

export default function UploadDocumentButton({ documentId, patientId, docTypeSlug, docTypeName, hasExpiry, currentStatus }: Props) {
  const [loading, setLoading] = useState(false)
  const [showExpiry, setShowExpiry] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expiry, setExpiry] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    if (hasExpiry) {
      setShowExpiry(true)
    } else {
      uploadFile(file, "")
    }
  }

  async function uploadFile(file: File, expiryDate: string) {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const ext = file.name.split(".").pop()
    const path = `${patientId}/${docTypeSlug}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("patient-documents")
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError("Error al subir el archivo: " + uploadError.message)
      setLoading(false)
      return
    }

    const updateData: any = {
      file_path: path,
      file_name: file.name,
      file_size_bytes: file.size,
      status: "pendiente_revision",
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (expiryDate) updateData.expires_at = expiryDate

    await supabase.from("patient_documents").update(updateData).eq("id", documentId)

    setLoading(false)
    setShowExpiry(false)
    setSelectedFile(null)
    router.refresh()
  }

  if (showExpiry && selectedFile) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={expiry}
          onChange={e => setExpiry(e.target.value)}
          className="text-xs border border-slate-300 rounded px-2 py-1"
          placeholder="Vencimiento"
        />
        <button
          onClick={() => uploadFile(selectedFile, expiry)}
          disabled={!expiry || loading}
          className="text-xs bg-slate-900 text-white rounded px-2 py-1 disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Subir"}
        </button>
        <button onClick={() => { setShowExpiry(false); setSelectedFile(null) }} className="text-slate-400 hover:text-red-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 hover:border-slate-400 transition-colors disabled:opacity-50"
        title={`Subir ${docTypeName}`}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        Subir
      </button>
    </>
  )
}
'@
Set-Content -Path "src\app\pacientes\[id]\UploadDocumentButton.tsx" -Value $content
Write-Host "[OK] UploadDocumentButton" -ForegroundColor Green

Write-Host ""
Write-Host "=== Todo listo ===" -ForegroundColor Cyan
Write-Host "Ejecuta: npx next dev" -ForegroundColor Yellow
