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
import ComprobanteButton from "./ComprobanteButton"

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canReview = ["admin", "administrativo", "medico"].includes(profile?.role ?? "")
  const isAdmin = profile?.role === "admin"
  const { data: patient } = await supabase.from("patients").select("*, treating_physician:profiles!patients_treating_physician_id_fkey(id, full_name), membership_plan:membership_plans(id, name, monthly_grams, monthly_amount)").eq("id", id).is("deleted_at", null).single()
  if (!patient) notFound()
  const { data: documents } = await supabase.from("patient_documents").select("*, doc_type:patient_document_types(id, name, slug, is_mandatory, has_expiry, sort_order)").eq("patient_id", id).order("doc_type(sort_order)")
  const { data: signature } = await supabase
    .from("document_signatures")
    .select("id, status, signed_at, signer_name, document_hash, template:document_templates(name, version)")
    .eq("patient_id", patient.id)
    .eq("status", "firmado")
    .maybeSingle()

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
        <PageHeader title={patient.full_name} description={`DNI ${patient.dni} · Alta: ${formatDate(patient.created_at)}`}
          actions={
            <div className="flex items-center gap-2">
              <QRDisplay entityId={id} entityType="patient" entityName={patient.full_name} currentToken={patient.qr_token} />
              <Link href={`/pacientes/${id}/editar`}><Button variant="secondary" size="sm"><Edit className="w-3.5 h-3.5" />Editar</Button></Link>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            {patient.reprocann_expiry && <div><dt className="text-xs text-slate-500">Vencimiento</dt><dd className={days !== null && days < 0 ? "text-red-600 font-medium" : days !== null && days <= 30 ? "text-amber-600" : ""}>{formatDate(patient.reprocann_expiry)}{days !== null && <span className="text-xs ml-1 text-slate-400">({days < 0 ? `vencido hace ${Math.abs(days)}d` : `${days}d restantes`})</span>}</dd></div>}
            {!patient.reprocann_expiry && <div className="text-xs text-slate-400 italic">Sin vinculacion registrada</div>}
          </dl>
          {patient.membership_plan && <div className="mt-5 pt-5 border-t border-slate-100"><SectionHeader title="Membresia" /><dl className="space-y-3 text-sm"><div><dt className="text-xs text-slate-500">Plan</dt><dd>{patient.membership_plan.name}</dd></div>{patient.membership_plan.monthly_grams && <div><dt className="text-xs text-slate-500">Gramos mensuales</dt><dd>{formatGrams(patient.membership_plan.monthly_grams)}</dd></div>}<div><dt className="text-xs text-slate-500">Total dispensado</dt><dd>{formatGrams(totalDispensed)}</dd></div></dl></div>}
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
            <div className="w-full bg-slate-100 rounded-full h-2"><div className={`h-2 rounded-full ${approvedDocs === totalDocs && totalDocs > 0 ? "bg-green-500" : approvedDocs / totalDocs > 0.5 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${totalDocs > 0 ? (approvedDocs / totalDocs) * 100 : 0}%` }} /></div>
          </div>
          {patient.internal_notes && <div className="mt-5 pt-5 border-t border-slate-100"><p className="text-xs font-medium text-slate-500 mb-1">Notas internas</p><p className="text-sm text-[#1a2e1a] whitespace-pre-line">{patient.internal_notes}</p></div>}
        </Card>
      </div>
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Legajo documental" /></div>
        <div className="divide-y divide-slate-100">
          {(documents ?? []).map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${doc.status === "aprobado" ? "bg-green-500" : doc.status === "pendiente_revision" ? "bg-amber-500" : doc.status === "pendiente_vinculacion" ? "bg-slate-300" : doc.status === "observado" ? "bg-orange-500" : "bg-red-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1a2e1a]">{doc.doc_type?.name}{doc.doc_type?.is_mandatory && <span className="text-xs text-slate-400 ml-1">· Obligatorio</span>}</p>
                {doc.file_name && <p className="text-xs text-slate-400 truncate mt-0.5">{doc.file_name}</p>}
                {doc.observations && <p className="text-xs text-orange-600 mt-0.5">Obs: {doc.observations}</p>}
                {doc.reviewed_at && doc.status === "aprobado" && <p className="text-xs text-green-600 mt-0.5">Aprobado el {formatDate(doc.reviewed_at)}</p>}
              </div>
              {doc.expires_at && <p className="text-xs text-slate-500 shrink-0">Vence: {formatDate(doc.expires_at)}</p>}
              <div className="flex items-center gap-1.5 shrink-0">
                <ViewFileButton filePath={doc.file_path} bucketName="patient-documents" />
                <UploadDocumentButton documentId={doc.id} patientId={id} docTypeSlug={doc.doc_type?.slug} docTypeName={doc.doc_type?.name} hasExpiry={doc.doc_type?.has_expiry} currentStatus={doc.status} currentFilePath={doc.file_path} />
                {canReview && <DocumentStatusAction documentId={doc.id} currentStatus={doc.status} table="patient_documents" isReprocann={doc.doc_type?.slug === "reprocann"} />}
                <DocumentStatusBadge status={doc.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Historial de dispensas" actions={<Link href="/dispensas"><Button size="sm">Registrar dispensa</Button></Link>} /></div>
        {(!dispenses || dispenses.length === 0) ? <div className="text-center py-8 text-sm text-slate-400">Sin dispensas registradas</div> : (
          <div className="overflow-x-auto"><table className="table-ong w-full"><thead><tr><th>Fecha</th><th>Producto</th><th>Lote</th><th>Cantidad</th><th>Registrado por</th></tr></thead><tbody>{dispenses.map((d: any) => (<tr key={d.id}><td>{formatDateTime(d.dispensed_at)}</td><td>{d.product_desc}</td><td className="font-mono text-xs">{d.lot?.lot_code ?? "—"}</td><td className="font-medium tabular-nums">{formatGrams(d.grams)}</td><td className="text-slate-500">{d.performed_by_profile?.full_name ?? "—"}</td></tr>))}</tbody></table></div>
        )}
      </Card>

      {/* Firma electronica */}
      <Card>
        <SectionHeader title="Documento de membresia" />
        {signature ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                Firmado
              </span>
              <span className="text-xs text-slate-500">
                {signature.signed_at ? new Date(signature.signed_at).toLocaleString("es-AR") : "-"}
              </span>
            </div>
            <p className="text-xs text-slate-600">Firmante: <span className="font-medium">{signature.signer_name}</span></p>
            {signature.document_hash && (
              <p className="text-[10px] text-slate-400 font-mono break-all">Hash: {signature.document_hash}</p>
            )}
            <div className="mt-3"><ComprobanteButton patientId={patient.id} /></div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Pendiente de firma
            </span>
            <span className="text-xs text-slate-500">El paciente debe firmar desde su portal</span>
          </div>
        )}
      </Card>
    </div>
  )
}
