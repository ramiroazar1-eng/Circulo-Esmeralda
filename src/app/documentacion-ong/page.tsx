import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Building2, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import { PageHeader, Card, DocumentStatusBadge, SectionHeader, EmptyState, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate, formatFileSize } from "@/lib/utils"
import UploadOrgDocButton from "./UploadOrgDocButton"
import ViewFileButton from "./ViewFileButton"
import DocumentStatusAction from "./DocumentStatusAction"

const ORG_DOC_TYPE_LABELS: Record<string, string> = {
  estatuto: "Constitucion / Estatuto", acta: "Actas", autoridades: "Autoridades",
  afip_cuit: "AFIP / CUIT", igj: "IGJ / Personeria", habilitacion: "Habilitaciones",
  convenio: "Convenios", inmueble: "Inmueble", protocolo: "Protocolos internos",
  politica: "Politicas internas", otro: "Otros"
}

export default async function DocumentacionONGPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const canReview = ["admin", "administrativo"].includes(profile?.role ?? "")

  const { data: docs } = await supabase
    .from("org_documents").select("*")
    .order("is_mandatory", { ascending: false })
    .order("doc_type").order("name")

  const allDocs = (docs ?? []) as any[]
  const total = allDocs.length
  const aprobados = allDocs.filter(d => d.status === "aprobado").length
  const pendientes = allDocs.filter(d => d.status === "pendiente_revision").length
  const obligatoriosFaltantes = allDocs.filter(d => d.is_mandatory && d.status === "faltante").length

  const grouped = allDocs.reduce<Record<string, any[]>>((acc, doc) => {
    if (!acc[doc.doc_type]) acc[doc.doc_type] = []
    acc[doc.doc_type].push(doc)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Documentacion institucional" description="Checklist y repositorio de documentacion legal y regulatoria de la ONG" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total documentos" value={total} icon={Building2} />
        <StatCard label="Aprobados" value={aprobados} variant={aprobados === total && total > 0 ? "ok" : "default"} icon={CheckCircle2} />
        <StatCard label="Pendientes de revision" value={pendientes} variant={pendientes > 0 ? "atencion" : "default"} icon={Clock} />
        <StatCard label="Faltantes obligatorios" value={obligatoriosFaltantes} variant={obligatoriosFaltantes > 0 ? "critico" : "ok"} icon={AlertTriangle} />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Completitud documental</p>
          <p className="text-sm font-semibold text-slate-900">{total > 0 ? Math.round((aprobados / total) * 100) : 0}%</p>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full transition-all ${aprobados === total && total > 0 ? "bg-green-500" : aprobados / total > 0.7 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${total > 0 ? (aprobados / total) * 100 : 0}%` }} />
        </div>
        {obligatoriosFaltantes > 0 && (
          <p className="text-xs text-red-600 mt-2">Atencion: {obligatoriosFaltantes} documento{obligatoriosFaltantes > 1 ? "s" : ""} obligatorio{obligatoriosFaltantes > 1 ? "s" : ""} faltante{obligatoriosFaltantes > 1 ? "s" : ""}</p>
        )}
      </Card>

      {Object.entries(grouped).map(([type, typeDocs]) => (
        <Card key={type} padding={false}>
          <div className="px-5 pt-5 pb-4"><SectionHeader title={ORG_DOC_TYPE_LABELS[type] ?? type} /></div>
          <div className="divide-y divide-slate-100">
            {(typeDocs as any[]).map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  doc.status === "aprobado" ? "bg-green-500" :
                  doc.status === "pendiente_revision" ? "bg-amber-500" :
                  doc.status === "observado" ? "bg-orange-500" : "bg-red-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                    {doc.is_mandatory && <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">Obligatorio</span>}
                  </div>
                  {doc.description && <p className="text-xs text-slate-500 mt-0.5">{doc.description}</p>}
                  {doc.file_name && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {doc.file_name}
                      {doc.file_size_bytes && ` · ${formatFileSize(doc.file_size_bytes)}`}
                      {doc.uploaded_at && ` · Subido ${formatDate(doc.uploaded_at)}`}
                    </p>
                  )}
                  {doc.observations && <p className="text-xs text-orange-600 mt-0.5">Obs: {doc.observations}</p>}
                  {doc.reviewed_at && doc.status === "aprobado" && (
                    <p className="text-xs text-green-600 mt-0.5">Aprobado el {formatDate(doc.reviewed_at)}</p>
                  )}
                  {doc.expires_at && <p className="text-xs text-amber-600 mt-0.5">Vence: {formatDate(doc.expires_at)}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <ViewFileButton filePath={doc.file_path} bucketName="org-documents" />
                  <UploadOrgDocButton docId={doc.id} docName={doc.name} docType={doc.doc_type} currentFilePath={doc.file_path} />
                  {canReview && (
                    <DocumentStatusAction documentId={doc.id} currentStatus={doc.status} table="org_documents" />
                  )}
                  <DocumentStatusBadge status={doc.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {allDocs.length === 0 && <EmptyState title="Sin documentos cargados" icon={Building2} />}
    </div>
  )
}
