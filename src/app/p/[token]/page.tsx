import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export default async function PublicPatientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = await createServiceClient()

  const { data: patient } = await service
    .from("patients")
    .select("id, full_name, status, created_at, membership_plan:membership_plans(name, monthly_grams)")
    .eq("qr_token", token)
    .is("deleted_at", null)
    .single()

  if (!patient) notFound()

  const isActive = patient.status === "activo"
  const firstName = patient.full_name.split(" ")[0]
  const plan = patient.membership_plan as any

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xs font-bold">ONG</span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Cannabis Medicinal</p>
        </div>

        <div className={`rounded-2xl p-5 text-center border ${isActive ? "bg-green-950/50 border-green-800" : "bg-red-950/50 border-red-800"}`}>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-3 ${isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-red-400"}`} />
            {isActive ? "Socio activo" : "Socio inactivo"}
          </div>
          <h1 className="text-2xl font-bold text-white">{firstName}</h1>
          {plan && <p className="text-sm text-slate-400 mt-1">{plan.name}</p>}
        </div>

        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Informacion del socio</p>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-sm text-slate-300">Estado</span>
            <span className={`text-sm font-medium ${isActive ? "text-green-400" : "text-red-400"}`}>
              {isActive ? "Al dia" : "Revisar con el equipo"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-slate-300">Plan</span>
            <span className="text-sm text-white">{plan?.name ?? "—"}</span>
          </div>
        </div>

        <a
          href={`/p/${token}/dashboard`}
          className="block w-full text-center bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl px-5 py-4 transition-colors"
        >
          <p className="text-sm font-medium text-white">Ver mis estadisticas</p>
          <p className="text-xs text-slate-400 mt-0.5">Consumo, historial y mas</p>
        </a>

        <p className="text-center text-xs text-slate-600">
          Esta credencial es personal e intransferible.
        </p>
      </div>
    </div>
  )
}
