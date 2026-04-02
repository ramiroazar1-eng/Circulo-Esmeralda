import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDate, formatGrams } from "@/lib/utils"

export default async function PatientDashboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = await createServiceClient()

  const { data: patient } = await service
    .from("patients")
    .select("id, full_name, status, created_at, membership_plan:membership_plans(name, monthly_grams)")
    .eq("qr_token", token)
    .is("deleted_at", null)
    .single()

  if (!patient) notFound()

  // Dispensas del ultimo año
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { data: dispenses } = await service
    .from("dispenses")
    .select("id, dispensed_at, grams, lot:lots(lot_code, seedling_date, harvest_date, drying_days, curing_days, genetic:genetics(name, strain_type, thc_percentage, cbd_percentage))")
    .eq("patient_id", patient.id)
    .gte("dispensed_at", oneYearAgo.toISOString())
    .order("dispensed_at", { ascending: false })

  const { data: allDispenses } = await service
    .from("dispenses")
    .select("id, grams")
    .eq("patient_id", patient.id)

  const dispenseList = (dispenses ?? []) as any[]
  const allList = (allDispenses ?? []) as any[]

  // Stats
  const totalGramsYear = dispenseList.reduce((acc, d) => acc + (d.grams ?? 0), 0)
  const totalDispenses = allList.length
  const totalGramsAll = allList.reduce((acc, d) => acc + (d.grams ?? 0), 0)
  const avgMonthly = totalGramsYear / 12

  // Genetica mas consumida
  const geneticCount: Record<string, number> = {}
  for (const d of dispenseList) {
    const name = d.lot?.genetic?.name ?? "Sin especificar"
    geneticCount[name] = (geneticCount[name] ?? 0) + d.grams
  }
  const topGenetic = Object.entries(geneticCount).sort((a, b) => b[1] - a[1])[0]

  // Ultima visita
  const lastDispense = dispenseList[0]
  const daysSinceLast = lastDispense
    ? Math.floor((Date.now() - new Date(lastDispense.dispensed_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Estado docs
  const { data: docs } = await service
    .from("patient_documents")
    .select("status")
    .eq("patient_id", patient.id)
  const docsOk = (docs ?? []).every(d => d.status === "aprobado" || d.status === "pendiente_vinculacion")

  const firstName = patient.full_name.split(" ")[0]
  const plan = patient.membership_plan as any

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-sm mx-auto space-y-5">

        {/* Header */}
        <div className="text-center pt-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-sm font-bold">ONG</span>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Cannabis Medicinal</p>
          <h1 className="text-3xl font-bold text-white">Hola, {firstName}</h1>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-green-500/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Socio activo</span>
          </div>
        </div>

        {/* Stat principal - gramos año */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ultimo año</p>
          <p className="text-5xl font-black text-white mb-1">{totalGramsYear.toFixed(0)}<span className="text-2xl text-slate-400 font-normal">g</span></p>
          <p className="text-sm text-slate-400">consumidos en 12 meses</p>
          {plan?.monthly_grams && (
            <div className="mt-3 bg-slate-700/50 rounded-xl p-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Uso mensual</span>
                <span>{avgMonthly.toFixed(1)}g / {plan.monthly_grams}g</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-400 transition-all"
                  style={{ width: `${Math.min((avgMonthly / plan.monthly_grams) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Grid de stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">{totalDispenses}</p>
            <p className="text-xs text-slate-400 mt-0.5">Retiros totales</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">{totalGramsAll.toFixed(0)}<span className="text-base text-slate-400">g</span></p>
            <p className="text-xs text-slate-400 mt-0.5">Acumulado total</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">{avgMonthly.toFixed(1)}<span className="text-base text-slate-400">g</span></p>
            <p className="text-xs text-slate-400 mt-0.5">Promedio mensual</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">{daysSinceLast ?? "—"}<span className="text-base text-slate-400">{daysSinceLast !== null ? "d" : ""}</span></p>
            <p className="text-xs text-slate-400 mt-0.5">Desde ultima visita</p>
          </div>
        </div>

        {/* Genetica preferida */}
        {topGenetic && (
          <div className="bg-green-950/40 rounded-2xl p-5 border border-green-800/50">
            <p className="text-xs text-green-400 uppercase tracking-wide mb-2">Genetica preferida</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">{topGenetic[0]}</p>
                <p className="text-xs text-slate-400">{topGenetic[1].toFixed(1)}g consumidos</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">🌿</span>
              </div>
            </div>
          </div>
        )}

        {/* Historial reciente */}
        {dispenseList.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Ultimas visitas</p>
            <div className="space-y-2">
              {dispenseList.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{d.lot?.genetic?.name ?? "Flor seca"}</p>
                      <p className="text-xs text-slate-500">{formatDate(d.dispensed_at)}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {d.lot?.genetic?.thc_percentage && (
                          <span className="text-[10px] bg-purple-900/40 text-purple-300 border border-purple-800/50 rounded-full px-2 py-0.5">THC {d.lot.genetic.thc_percentage}%</span>
                        )}
                        {d.lot?.genetic?.cbd_percentage && (
                          <span className="text-[10px] bg-green-900/40 text-green-300 border border-green-800/50 rounded-full px-2 py-0.5">CBD {d.lot.genetic.cbd_percentage}%</span>
                        )}
                        {d.lot?.curing_days && (
                          <span className="text-[10px] bg-amber-900/40 text-amber-300 border border-amber-800/50 rounded-full px-2 py-0.5">{d.lot.curing_days}d curado</span>
                        )}
                        {d.lot?.lot_code && (
                          <span className="text-[10px] bg-white/5 text-slate-400 border border-white/10 rounded-full px-2 py-0.5 font-mono">{d.lot.lot_code}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-300">{formatGrams(d.grams)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado documental */}
        <div className={`rounded-2xl p-4 border ${docsOk ? "bg-green-950/30 border-green-800/50" : "bg-amber-950/30 border-amber-800/50"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Documentacion</p>
              <p className={`text-sm font-medium mt-0.5 ${docsOk ? "text-green-400" : "text-amber-400"}`}>
                {docsOk ? "Todo en orden" : "Requiere atencion"}
              </p>
            </div>
            <span className="text-2xl">{docsOk ? "✓" : "⚠"}</span>
          </div>
        </div>

        {/* Membresia */}
        {plan && (
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Tu plan</p>
            <p className="text-lg font-bold text-white">{plan.name}</p>
            {plan.monthly_grams && (
              <p className="text-sm text-slate-400">{plan.monthly_grams}g por mes incluidos</p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-slate-700 pb-4">
          Miembro desde {formatDate(patient.created_at)} · Uso exclusivamente medicinal
        </p>
      </div>
    </div>
  )
}
