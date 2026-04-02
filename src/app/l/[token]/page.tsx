import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDate } from "@/lib/utils"

const TIMELINE_STEPS = [
  { key: "seedling_date",     label: "Plantines",  color: "#10b981" },
  { key: "veg_date",          label: "Vegetativo", color: "#22c55e" },
  { key: "pruning_date",      label: "Poda",       color: "#84cc16" },
  { key: "flower_date",       label: "Floracion",  color: "#a855f7" },
  { key: "harvest_date",      label: "Cosecha",    color: "#f59e0b" },
  { key: "drying_start_date", label: "Secado",     color: "#f97316" },
  { key: "curing_start_date", label: "Curado",     color: "#eab308" },
]

const STRAIN_LABELS: Record<string, { label: string; color: string }> = {
  indica:         { label: "Indica",                     color: "background:rgba(88,28,135,0.4);color:#d8b4fe;border:1px solid rgba(147,51,234,0.4)" },
  sativa:         { label: "Sativa",                     color: "background:rgba(120,53,15,0.4);color:#fcd34d;border:1px solid rgba(217,119,6,0.4)" },
  hibrida:        { label: "Hibrida",                    color: "background:rgba(6,78,59,0.4);color:#6ee7b7;border:1px solid rgba(16,185,129,0.4)" },
  hibrida_indica: { label: "Hibrida / Predominante Indica", color: "background:rgba(88,28,135,0.3);color:#d8b4fe;border:1px solid rgba(147,51,234,0.3)" },
  hibrida_sativa: { label: "Hibrida / Predominante Sativa", color: "background:rgba(120,53,15,0.3);color:#fcd34d;border:1px solid rgba(217,119,6,0.3)" },
}

export default async function PublicLotPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = await createServiceClient()

  const { data: lot } = await service
    .from("lots")
    .select("*, genetic:genetics(name, description, strain_type, thc_percentage, cbd_percentage, terpenes, effects, medical_uses, photo_url), room:rooms(name)")
    .eq("qr_token", token)
    .single()

  if (!lot) notFound()

  const genetic = (lot as any).genetic
  const strain = genetic?.strain_type ? STRAIN_LABELS[genetic.strain_type] : null

  const steps = TIMELINE_STEPS.map((step, i) => {
    const date = (lot as any)[step.key]
    const nextStep = TIMELINE_STEPS[i + 1]
    const nextDate = nextStep ? (lot as any)[nextStep.key] : null
    const days = date && nextDate
      ? Math.round((new Date(nextDate).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
      : null
    return { ...step, date, days }
  })

  const completedSteps = steps.filter(s => s.date).length
  const totalDays = steps[0]?.date && steps[steps.length - 1]?.date
    ? Math.round((new Date(steps.filter(s => s.date).slice(-1)[0].date).getTime() - new Date(steps[0].date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="min-h-screen bg-[#080f09] text-white">
      <div className="relative h-56 overflow-hidden">
        {genetic?.photo_url
          ? <img src={genetic.photo_url} alt={genetic.name} className="w-full h-full object-cover opacity-60" />
          : <div className="w-full h-full bg-gradient-to-br from-[#0f2412] to-[#080f09]" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#080f09] via-[#080f09]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <div className="flex items-end justify-between">
            <div>
              {strain && (
                <span style={Object.fromEntries(strain.color.split(";").map((s: string) => s.split(":")))}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold mb-2">
                  {strain.label}
                </span>
              )}
              <h1 className="text-3xl font-black text-white">{genetic?.name ?? "Flor seca"}</h1>
              <p className="text-[#4d7a46] text-sm mt-0.5">Produccion propia · Uso medicinal exclusivo</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#2d5a27] flex items-center justify-center border border-[#4d8a3d] shrink-0">
              <div className="w-4 h-4 rounded-full border-2 border-[#7dc264]" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">

        {/* THC / CBD */}
        {(genetic?.thc_percentage || genetic?.cbd_percentage) && (
          <div className="grid grid-cols-2 gap-3">
            {genetic?.thc_percentage && (
              <div className="bg-purple-950/40 border border-purple-800/50 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">THC</p>
                <p className="text-3xl font-black text-white">{genetic.thc_percentage}<span className="text-lg text-purple-400">%</span></p>
              </div>
            )}
            {genetic?.cbd_percentage && (
              <div className="bg-green-950/40 border border-green-800/50 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">CBD</p>
                <p className="text-3xl font-black text-white">{genetic.cbd_percentage}<span className="text-lg text-green-400">%</span></p>
              </div>
            )}
          </div>
        )}

        {/* Terpenos */}
        {genetic?.terpenes && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Perfil de terpenos</p>
            <div className="flex flex-wrap gap-2">
              {genetic.terpenes.split(",").map((t: string, i: number) => (
                <span key={i} className="px-2.5 py-1 bg-amber-900/30 border border-amber-800/50 rounded-full text-[11px] text-amber-300 font-medium">{t.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {/* Efectos */}
        {genetic?.effects && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Efectos</p>
            <div className="flex flex-wrap gap-2">
              {genetic.effects.split(",").map((e: string, i: number) => (
                <span key={i} className="px-2.5 py-1 bg-blue-900/30 border border-blue-800/50 rounded-full text-[11px] text-blue-300 font-medium">{e.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {/* Usos medicinales */}
        {genetic?.medical_uses && (
          <div className="bg-green-950/30 rounded-2xl p-4 border border-green-900/50">
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-2">Usos medicinales</p>
            <div className="flex flex-wrap gap-2">
              {genetic.medical_uses.split(",").map((u: string, i: number) => (
                <span key={i} className="px-2.5 py-1 bg-green-900/40 border border-green-800/50 rounded-full text-[11px] text-green-300 font-medium">{u.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {completedSteps > 0 && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-[#5a8a52] uppercase tracking-widest">Proceso de produccion</p>
              {totalDays && <p className="text-[10px] text-slate-400">{totalDays} dias totales</p>}
            </div>
            <div className="space-y-0">
              {steps.map((step, i) => (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: step.date ? step.color : "rgba(255,255,255,0.05)", border: step.date ? "none" : "1px solid rgba(255,255,255,0.1)" }}>
                      {step.date
                        ? <span className="text-white text-[9px] font-bold">✓</span>
                        : <span className="text-slate-600 text-[9px]">{i + 1}</span>
                      }
                    </div>
                    {i < steps.length - 1 && (
                      <div className="w-px flex-1 my-0.5" style={{ background: step.date ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", minHeight: "16px" }} />
                    )}
                  </div>
                  <div className="pb-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-[12px] font-semibold ${step.date ? "text-white" : "text-slate-600"}`}>{step.label}</p>
                      {step.date && <p className="text-[10px] text-slate-400">{formatDate(step.date)}</p>}
                    </div>
                    {step.days !== null && step.days > 0 && (
                      <p className="text-[10px] text-slate-500 mt-0.5">{step.days} dias</p>
                    )}
                    {step.key === "curing_start_date" && lot.curing_days && (
                      <p className="text-[10px] text-slate-500 mt-0.5">{lot.curing_days} dias de curado</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trazabilidad */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-[10px] font-bold text-[#5a8a52] uppercase tracking-widest mb-3">Trazabilidad</p>
          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-[12px] text-slate-400">Codigo de lote</span>
              <span className="text-[12px] font-mono text-white font-semibold">{lot.lot_code}</span>
            </div>
            {(lot as any).room?.name && (
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-[12px] text-slate-400">Sala de produccion</span>
                <span className="text-[12px] text-white">{(lot as any).room.name}</span>
              </div>
            )}
            {lot.net_grams && (
              <div className="flex justify-between py-1.5">
                <span className="text-[12px] text-slate-400">Produccion neta</span>
                <span className="text-[12px] text-white font-semibold">{lot.net_grams}g</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-[#2d4a28] pb-4">
          Circulo Esmeralda · Cannabis Medicinal · Produccion organica
        </p>
      </div>
    </div>
  )
}
