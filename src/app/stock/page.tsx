import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BackButton } from "@/components/ui/BackButton"
import { Card, SectionHeader } from "@/components/ui"
import { formatDate, formatGrams } from "@/lib/utils"
import StockTransferModal from "./StockTransferModal"
import { Lock, Unlock } from "lucide-react"

export default async function StockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const role = profile?.role ?? ""
  if (!["admin","administrativo"].includes(role)) redirect("/dashboard")
  const isAdmin = role === "admin"

  const [acopioRes, operativoRes, transfersRes] = await Promise.all([
    supabase.from("stock_positions")
      .select("id, available_grams, reserved_grams, lot:lots(id, lot_code, net_grams, genetic:genetics(name))")
      .eq("storage_type", "acopio")
      .gt("available_grams", 0)
      .order("available_grams", { ascending: false }),
    supabase.from("stock_positions")
      .select("id, available_grams, reserved_grams, lot:lots(id, lot_code, net_grams, genetic:genetics(name))")
      .eq("storage_type", "operativo")
      .order("available_grams", { ascending: false }),
    supabase.from("stock_transfers")
      .select("id, grams, notes, created_at, lot:lots(lot_code, genetic:genetics(name)), authorized_by_profile:profiles!stock_transfers_authorized_by_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const acopio = (acopioRes.data ?? []) as any[]
  const operativo = (operativoRes.data ?? []) as any[]
  const transfers = (transfersRes.data ?? []) as any[]

  const totalAcopio = acopio.reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const totalOperativo = operativo.reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const totalReservado = operativo.reduce((acc, s) => acc + (s.reserved_grams ?? 0), 0)

  // Combinar por genetica para resumen
  const byGenetic: Record<string, { name: string; acopio: number; operativo: number }> = {}
  for (const s of acopio) {
    const name = s.lot?.genetic?.name ?? "Sin genetica"
    if (!byGenetic[name]) byGenetic[name] = { name, acopio: 0, operativo: 0 }
    byGenetic[name].acopio += s.available_grams ?? 0
  }
  for (const s of operativo) {
    const name = s.lot?.genetic?.name ?? "Sin genetica"
    if (!byGenetic[name]) byGenetic[name] = { name, acopio: 0, operativo: 0 }
    byGenetic[name].operativo += s.available_grams ?? 0
  }

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Control de stock</h1>
          <p className="text-sm text-slate-500 mt-0.5">Acopio bajo llave y stock operativo para dispensas</p>
        </div>
      </div>

      {/* Resumen global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {isAdmin && <div className="bg-[#0f1f12] rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-[#7dc264]" />
            <p className="text-xs font-medium text-[#7dc264] uppercase tracking-wide">Acopio</p>
          </div>
          <p className="text-3xl font-bold text-white">{formatGrams(totalAcopio)}</p>
          <p className="text-xs text-[#7a9e74] mt-1">bajo llave</p>
        </div>}
        <div className="bg-white border border-[#ddecd8] rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Unlock className="w-4 h-4 text-[#2d5a27]" />
            <p className="text-xs font-medium text-[#6b8c65] uppercase tracking-wide">Operativo</p>
          </div>
          <p className="text-3xl font-bold text-[#1a2e1a]">{formatGrams(totalOperativo)}</p>
          <p className="text-xs text-[#9ab894] mt-1">disponible para dispensar</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total en sistema</p>
          <p className="text-3xl font-bold text-slate-900">{formatGrams(totalAcopio + totalOperativo + totalReservado)}</p>
          <p className="text-xs text-slate-400 mt-1">{totalReservado > 0 ? `${formatGrams(totalReservado)} reservados` : "sin reservas"}</p>
        </div>
      </div>

      {/* Resumen por genetica */}
      {Object.keys(byGenetic).length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Stock por genetica" />
          </div>
          <div className="overflow-x-auto">
            <table className="table-ong w-full">
              <thead>
                <tr>
                  <th>Genetica</th>
                  {isAdmin && <th className="text-right">Acopio</th>}
                  <th className="text-right">Operativo</th>
                  <th className="text-right">Total</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {Object.values(byGenetic).map((g: any) => (
                  <tr key={g.name}>
                    <td className="font-medium text-slate-900">{g.name}</td>
                    {isAdmin && <td className="text-right tabular-nums"><span className="flex items-center justify-end gap-1"><Lock className="w-3 h-3 text-slate-400" />{formatGrams(g.acopio)}</span></td>}
                    <td className="text-right tabular-nums text-[#2d6a1f] font-medium">{formatGrams(g.operativo)}</td>
                    <td className="text-right tabular-nums font-bold text-slate-900">{formatGrams(g.acopio + g.operativo)}</td>
                    {isAdmin && (
                      <td className="text-right">
                        {g.acopio > 0 && (
                          <StockTransferModal
                            lots={acopio.filter((s: any) => (s.lot?.genetic?.name ?? "Sin genetica") === g.name)}
                            geneticName={g.name}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detalle acopio */}
      {isAdmin && acopio.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4">
            <SectionHeader title="Detalle acopio por lote" />
          </div>
          <div className="divide-y divide-slate-100">
            {acopio.map((s: any) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono font-medium text-slate-900">{s.lot?.lot_code}</p>
                  <p className="text-xs text-slate-500">{s.lot?.genetic?.name ?? "Sin genetica"}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatGrams(s.available_grams)}</p>
                    <p className="text-xs text-slate-400">en acopio</p>
                  </div>
                  <StockTransferModal
                    lots={[s]}
                    geneticName={s.lot?.genetic?.name ?? "Sin genetica"}
                    singleLot
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Detalle operativo */}
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Stock operativo por lote" />
          <p className="text-xs text-slate-500 mt-1">Lo que tiene disponible el administrativo para dispensar</p>
        </div>
        {operativo.filter((s: any) => s.available_grams > 0 || s.reserved_grams > 0).length === 0 ? (
          <div className="px-5 pb-5 text-sm text-slate-400">Sin stock operativo disponible</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {operativo.filter((s: any) => s.available_grams > 0 || s.reserved_grams > 0).map((s: any) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono font-medium text-slate-900">{s.lot?.lot_code}</p>
                  <p className="text-xs text-slate-500">{s.lot?.genetic?.name ?? "Sin genetica"}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#2d6a1f]">{formatGrams(s.available_grams)}</p>
                    <p className="text-xs text-slate-400">disponible</p>
                  </div>
                  {s.reserved_grams > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">{formatGrams(s.reserved_grams)}</p>
                      <p className="text-xs text-slate-400">reservado</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Historial de transferencias */}
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Historial de transferencias" />
          <p className="text-xs text-slate-500 mt-1">Movimientos de acopio a operativo</p>
        </div>
        {transfers.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-slate-400">Sin transferencias registradas</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transfers.map((t: any) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#2d6a1f]">+{formatGrams(t.grams)}</p>
                    <p className="text-sm text-slate-900">Ã¢â€ â€™ operativo</p>
                    <span className="text-xs bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] rounded px-1.5 py-0.5">
                      {t.lot?.lot_code}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-0.5">
                    <p className="text-xs text-slate-500">{t.lot?.genetic?.name ?? "-"}</p>
                    {t.notes && <p className="text-xs text-slate-400 italic">Ã¢â‚¬â€ {t.notes}</p>}
                  </div>
                  {t.authorized_by_profile && (
                    <p className="text-xs text-slate-400 mt-0.5">Por: {t.authorized_by_profile.full_name}</p>
                  )}
                </div>
                <p className="text-xs text-slate-400 shrink-0 ml-4">{formatDate(t.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}