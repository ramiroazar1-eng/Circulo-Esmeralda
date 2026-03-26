import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, EmptyState } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDate } from "@/lib/utils"
import type { LogCategory } from "@/types"
import NewLogEntry from "./NewLogEntry"

const CAT_LABELS: Record<LogCategory, string> = { operativo: "Operativo", incidencia: "Incidencia", trazabilidad: "Trazabilidad", documental: "Documental", administrativo: "Administrativo", otro: "Otro" }

export default async function BitacoraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: entries } = await supabase.from("daily_log_entries").select("id, entry_date, title, body, category, is_incident, created_at, created_by_profile:profiles(full_name), patient:patients(id, full_name), lot:lots(lot_code)").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(60)

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Bitacora" description="Registro diario de actividad y novedades" actions={<NewLogEntry />} />
      <Card padding={false}>
        {(!entries || entries.length === 0) ? <EmptyState title="Sin entradas en la bitacora" /> : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry: any) => (
              <div key={entry.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${entry.is_incident ? "bg-red-500" : "bg-slate-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-slate-900">{entry.title}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">{CAT_LABELS[entry.category as LogCategory]}</span>
                      {entry.is_incident && <span className="text-xs bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5">Incidencia</span>}
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{entry.body}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-slate-400">{formatDate(entry.entry_date)}</span>
                      <span className="text-xs text-slate-400">por {entry.created_by_profile?.full_name ?? "—"}</span>
                      {entry.patient && <span className="text-xs text-slate-400">Paciente: {entry.patient.full_name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
