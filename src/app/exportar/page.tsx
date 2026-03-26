import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, SectionHeader } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { FileDown, Users, Building2, Pill } from "lucide-react"
import ExportButton from "./ExportButton"

export default async function ExportarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, dni, status")
    .is("deleted_at", null)
    .eq("status", "activo")
    .order("full_name")

  return (
    <div className="max-w-2xl space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Exportables" description="Genera informes imprimibles para carpetas fisicas y auditorias" />

      <Card>
        <SectionHeader title="Pacientes" />
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Listado general de pacientes</p>
                <p className="text-xs text-slate-500">Estado documental y compliance de todos los pacientes activos</p>
              </div>
            </div>
            <ExportButton href="/api/export/patients-list" label="Descargar" />
          </div>

          <div className="py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-700 mb-3">Legajo individual por paciente</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(patients ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-900">{p.full_name}</p>
                    <p className="text-xs text-slate-500 font-mono">DNI {p.dni}</p>
                  </div>
                  <ExportButton href={`/api/export/patient-record?id=${p.id}`} label="Legajo" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Institucional" />
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Checklist documental ONG</p>
              <p className="text-xs text-slate-500">Estado de todos los documentos institucionales</p>
            </div>
          </div>
          <ExportButton href="/api/export/org-docs" label="Descargar" />
        </div>
      </Card>
    </div>
  )
}
