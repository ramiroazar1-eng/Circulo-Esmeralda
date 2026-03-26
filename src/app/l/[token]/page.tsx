import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDate } from "@/lib/utils"

export default async function PublicLotPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = await createServiceClient()

  const { data: lot } = await service
    .from("lots")
    .select("*, genetic:genetics(name, description), room:rooms(name)")
    .eq("qr_token", token)
    .single()

  if (!lot) notFound()

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xs font-bold">ONG</span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Cannabis Medicinal</p>
        </div>

        <div className="bg-green-950/50 rounded-2xl p-5 border border-green-800 text-center">
          <p className="text-xs text-green-400 uppercase tracking-wide mb-2">Producto medicinal</p>
          <h1 className="text-3xl font-bold text-white mb-1">
            {(lot as any).genetic?.name ?? "Flor seca"}
          </h1>
          {(lot as any).genetic?.description && (
            <p className="text-sm text-slate-400">{(lot as any).genetic.description}</p>
          )}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs text-slate-300">Produccion propia</span>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Trazabilidad</p>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-sm text-slate-300">Codigo de lote</span>
            <span className="text-sm font-mono text-white">{lot.lot_code}</span>
          </div>
          {(lot as any).room?.name && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-sm text-slate-300">Sala de produccion</span>
              <span className="text-sm text-white">{(lot as any).room.name}</span>
            </div>
          )}
          {lot.start_date && (
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-sm text-slate-300">Inicio de ciclo</span>
              <span className="text-sm text-white">{formatDate(lot.start_date)}</span>
            </div>
          )}
          {lot.harvest_date && (
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-300">Fecha de cosecha</span>
              <span className="text-sm text-white">{formatDate(lot.harvest_date)}</span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600">
          Produccion organica · Uso medicinal exclusivo
        </p>
      </div>
    </div>
  )
}
