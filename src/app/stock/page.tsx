import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BackButton } from "@/components/ui/BackButton"
import { Card, SectionHeader } from "@/components/ui"
import { formatDate, formatDateTime, formatGrams } from "@/lib/utils"
import StockTransferModal from "./StockTransferModal"
import Link from "next/link"
import { Lock, Unlock, ArrowRight, Package, TrendingDown } from "lucide-react"

export default async function StockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const role = profile?.role ?? ""
  if (!["admin","administrativo"].includes(role)) redirect("/dashboard")
  const isAdmin = role === "admin"

  const [acopioRes, operativoRes, transfersRes, dispensesRes] = await Promise.all([
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
      .limit(30),
    supabase.from("dispenses")
      .select("id, dispensed_at, grams, patient:patients(full_name), lot:lots(lot_code, genetic:genetics(name)), performed_by_profile:profiles(full_name)")
      .order("dispensed_at", { ascending: false })
      .limit(10),
  ])

  const acopio = (acopioRes.data ?? []) as any[]
  const operativo = (operativoRes.data ?? []) as any[]
  const transfers = (transfersRes.data ?? []) as any[]
  const dispenses = (dispensesRes.data ?? []) as any[]

  const totalAcopio = acopio.reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const totalOperativo = operativo.reduce((acc, s) => acc + (s.available_grams ?? 0), 0)
  const totalReservado = operativo.reduce((acc, s) => acc + (s.reserved_grams ?? 0), 0)
  const totalDispensado = dispenses.reduce((acc, d) => acc + (d.grams ?? 0), 0)

  // Resumen por genetica
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

  // Agrupar transferencias por fecha para timeline
  const transfersByDate: Record<string, any[]> = {}
  for (const t of transfers) {
    const date = new Date(t.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    if (!transfersByDate[date]) transfersByDate[date] = []
    transfersByDate[date].push(t)
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isAdmin && (
          <div className="bg-[#0f1f12] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-[#7dc264]" />
              <p className="text-xs font-medium text-[#7dc264] uppercase tracking-wide">Acopio</p>
            </div>
            <p className="text-2xl font-bold text-white">{formatGrams(totalAcopio)}</p>
            <p className="text-xs text-[#7a9e74] mt-1">bajo llave</p>
          </div>
        )}
        <div className="bg-white border border-[#ddecd8] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Unlock className="w-4 h-4 text-[#2d5a27]" />
            <p className="text-xs font-medium text-[#6b8c65] uppercase tracking-wide">Operativo</p>
          </div>
          <p className="text-2xl font-bold text-[#1a2e1a]">{formatGrams(totalOperativo)}</p>
          <p className="text-xs text-[#9ab894] mt-1">para dispensar</p>
        </div>
        {totalReservado > 0 && (
          <div className="bg-white border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-amber-600" />
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Reservado</p>
            </div>
            <p className="text-2xl font-bold text-[#1a2e1a]">{formatGrams(totalReservado)}</p>
            <p className="text-xs text-amber-500 mt-1">pedidos pendientes</p>
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Dispensado hoy</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatGrams(dispenses.filter(d => new Date(d.dispensed_at).toDateString() === new Date().toDateString()).reduce((acc, d) => acc + (d.grams ?? 0), 0))}
          </p>
          <p className="text-xs text-slate-400 mt-1">{formatGrams(totalDispensado)} ultimas 10</p>
        </div>
      </div>

      {/* Stock por genetica */}
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
                    {isAdmin && (
                      <td className="text-right tabular-nums">
                        <span className="flex items-center justify-end gap-1 text-slate-500">
                          <Lock className="w-3 h-3" />{formatGrams(g.acopio)}
                        </span>
                      </td>
                    )}
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
                <div className="flex items-center gap-3">
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <div>
                    <Link href={`/trazabilidad/${s.lot?.id}`} className="text-sm font-mono font-medium text-slate-900 hover:text-[#2d5a27]">
                      {s.lot?.lot_code}
                    </Link>
                    <p className="text-xs text-slate-500">{s.lot?.genetic?.name ?? "Sin genetica"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatGrams(s.available_grams)}</p>
                    <p className="text-xs text-slate-400">en acopio</p>
                  </div>
                  <StockTransferModal lots={[s]} geneticName={s.lot?.genetic?.name ?? "Sin genetica"} singleLot />
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
          <p className="text-xs text-slate-500 mt-1">Disponible para que el administrativo dispense</p>
        </div>
        {operativo.filter((s: any) => s.available_grams > 0 || s.reserved_grams > 0).length === 0 ? (
          <div className="px-5 pb-5 text-sm text-slate-400">Sin stock operativo. Transferir desde acopio para habilitar dispensas.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {operativo.filter((s: any) => s.available_grams > 0 || s.reserved_grams > 0).map((s: any) => {
              const pct = s.lot?.net_grams > 0 ? Math.round((s.available_grams / s.lot.net_grams) * 100) : null
              return (
                <div key={s.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <Unlock className="w-3.5 h-3.5 text-[#2d5a27] shrink-0" />
                      <div>
                        <Link href={`/trazabilidad/${s.lot?.id}`} className="text-sm font-mono font-medium text-slate-900 hover:text-[#2d5a27]">
                          {s.lot?.lot_code}
                        </Link>
                        <p className="text-xs text-slate-500">{s.lot?.genetic?.name ?? "Sin genetica"}</p>
                      </div>
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
                  {pct !== null && (
                    <div className="ml-7">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Del lote ({formatGrams(s.lot.net_grams)} total)</span>
                        <span>{pct}% disponible</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-[#2d5a27]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Historial de transferencias — timeline por fecha */}
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Historial de transferencias a operativo" />
          <p className="text-xs text-slate-500 mt-1">Movimientos autorizados de acopio a operativo</p>
        </div>
        {transfers.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-slate-400">Sin transferencias registradas</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {Object.entries(transfersByDate).map(([date, dayTransfers]) => (
              <div key={date}>
                <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500">{date}</p>
                </div>
                {dayTransfers.map((t: any) => (
                  <div key={t.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#edf7e8] border border-[#b8daa8] flex items-center justify-center shrink-0">
                        <ArrowRight className="w-3 h-3 text-[#2d5a27]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[#2d6a1f]">{formatGrams(t.grams)}</p>
                          <span className="text-xs text-slate-400">→ operativo</span>
                          <span className="text-xs bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] rounded px-1.5 py-0.5 font-mono">
                            {t.lot?.lot_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-500">{t.lot?.genetic?.name ?? "-"}</p>
                          {t.notes && <p className="text-xs text-slate-400 italic">· {t.notes}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs text-slate-500">{t.authorized_by_profile?.full_name ?? "-"}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(t.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Ultimas dispensas */}
      {dispenses.length > 0 && (
        <Card padding={false}>
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div>
              <SectionHeader title="Ultimas dispensas" />
              <p className="text-xs text-slate-500 mt-1">Salidas del stock operativo</p>
            </div>
            <Link href="/dispensas" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {dispenses.map((d: any) => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{d.patient?.full_name ?? "-"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-slate-400">{d.lot?.lot_code}</span>
                      <span className="text-xs text-slate-400">· {d.lot?.genetic?.name ?? "-"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-bold text-red-600">-{formatGrams(d.grams)}</p>
                  <p className="text-xs text-slate-400">{formatDate(d.dispensed_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
