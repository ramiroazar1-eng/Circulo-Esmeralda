import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDate } from "@/lib/utils"

const STRAIN_LABELS: Record<string, { label: string; color: string }> = {
  indica:          { label: "Indica",                    color: "bg-purple-900/40 text-purple-300 border-purple-700" },
  sativa:          { label: "Sativa",                    color: "bg-amber-900/40 text-amber-300 border-amber-700" },
  hibrida:         { label: "Hibrida",                   color: "bg-green-900/40 text-green-300 border-green-700" },
  hibrida_indica:  { label: "Hibrida / Predominante Indica", color: "bg-purple-900/30 text-purple-300 border-purple-800" },
  hibrida_sativa:  { label: "Hibrida / Predominante Sativa", color: "bg-amber-900/30 text-amber-300 border-amber-800" },
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

  return (
    <div className="min-h-screen bg-[#080f09] text-white">

      {/* Hero con foto */}
      <div className="relative h-64 overflow-hidden">
        {genetic?.photo_url ? (
          <img src={genetic.photo_url} alt={genetic.name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0f2412] to-[#080f09]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080f09] via-[#080f09]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <div className="flex items-end justify-between">
            <div>
              {strain && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border mb-2 ${strain.color}`}>
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
              <div className="bg-[#1a0a2e]/60 border border-purple-800/50 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">THC</p>
                <p className="text-3xl font-black text-white">{genetic.thc_percentage}<span className="text-lg text-purple-400">%</span></p>
              </div>
            )}
            {genetic?.cbd_percentage && (
              <div className="bg-[#0a1a10]/60 border border-green-800/50 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">CBD</p>
                <p className="text-3xl font-black text-white">{genetic.cbd_percentage}<span className="text-lg text-green-400">%</span></p>
              </div>
            )}
          </div>
        )}

        {/* Descripcion */}
        {genetic?.description && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-bold text-[#5a8a52] uppercase tracking-widest mb-2">Descripcion</p>
            <p className="text-sm text-slate-300 leading-relaxed">{genetic.description}</p>
          </div>
        )}

        {/* Terpenos */}
        {genetic?.terpenes && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Perfil de terpenos</p>
            <div className="flex flex-wrap gap-2">
              {genetic.terpenes.split(",").map((t: string, i: number) => (
                <span key={i} className="px-2.5 py-1 bg-amber-900/30 border border-amber-800/50 rounded-full text-[11px] text-amber-300 font-medium">
                  {t.trim()}
                </span>
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
                <span key={i} className="px-2.5 py-1 bg-blue-900/30 border border-blue-800/50 rounded-full text-[11px] text-blue-300 font-medium">
                  {e.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Usos medicinales */}
        {genetic?.medical_uses && (
          <div className="bg-[#0a1a10]/60 rounded-2xl p-4 border border-green-900/50">
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-2">Usos medicinales</p>
            <div className="flex flex-wrap gap-2">
              {genetic.medical_uses.split(",").map((u: string, i: number) => (
                <span key={i} className="px-2.5 py-1 bg-green-900/40 border border-green-800/50 rounded-full text-[11px] text-green-300 font-medium">
                  {u.trim()}
                </span>
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
            {lot.start_date && (
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-[12px] text-slate-400">Inicio de ciclo</span>
                <span className="text-[12px] text-white">{formatDate(lot.start_date)}</span>
              </div>
            )}
            {lot.harvest_date && (
              <div className="flex justify-between py-1.5">
                <span className="text-[12px] text-slate-400">Fecha de cosecha</span>
                <span className="text-[12px] text-white">{formatDate(lot.harvest_date)}</span>
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
