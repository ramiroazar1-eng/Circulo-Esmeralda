"use client"
import Link from "next/link"
import { formatGrams } from "@/lib/utils"

interface CycleData {
  id: string
  name: string
  status: string
  start_date: string
  end_date: string | null
  totalNet: number
  totalGross: number
  totalCost: number
  costPerGram: number | null
  durationDays: number | null
  lotsCount: number
  genetics: string[]
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-600 w-8 text-right tabular-nums">{pct}%</span>
    </div>
  )
}

function MiniBarChart({ data, valueKey, label, color, format }: {
  data: CycleData[]
  valueKey: keyof CycleData
  label: string
  color: string
  format: (v: number) => string
}) {
  const values = data.map(d => (d[valueKey] as number) ?? 0)
  const max = Math.max(...values, 1)
  const sorted = [...data].sort((a, b) => ((b[valueKey] as number) ?? 0) - ((a[valueKey] as number) ?? 0))

  return (
    <div className="bg-white border border-[#ddecd8] rounded-xl p-4">
      <p className="text-xs font-bold text-[#1a2e1a] uppercase tracking-wide mb-3">{label}</p>
      <div className="space-y-2">
        {sorted.slice(0, 5).map(d => (
          <div key={d.id}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs text-[#6b8c65] truncate max-w-[120px]">{d.name}</span>
              <span className="text-xs font-semibold text-[#1a2e1a] tabular-nums ml-2">
                {format((d[valueKey] as number) ?? 0)}
              </span>
            </div>
            <Bar value={(d[valueKey] as number) ?? 0} max={max} color={color} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ComparativaCharts({ data }: { data: CycleData[] }) {
  const withProduction = data.filter(d => d.totalNet > 0)
  const withCost = data.filter(d => d.costPerGram !== null)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniBarChart
          data={withProduction.length > 0 ? withProduction : data}
          valueKey="totalNet"
          label="Produccion neta (top 5)"
          color="bg-[#2d5a27]"
          format={v => formatGrams(v)}
        />
        <MiniBarChart
          data={withCost.length > 0 ? withCost : data}
          valueKey="costPerGram"
          label="Costo por gramo (top 5)"
          color="bg-amber-500"
          format={v => v > 0 ? `$${v.toFixed(2)}` : "-"}
        />
        <MiniBarChart
          data={data.filter(d => d.durationDays !== null)}
          valueKey="durationDays"
          label="Duracion en dias (top 5)"
          color="bg-blue-400"
          format={v => `${v}d`}
        />
      </div>

      <div className="bg-white border border-[#ddecd8] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#eef5ea]">
          <p className="text-sm font-bold text-[#1a2e1a]">Detalle por ciclo</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f5faf3]">
                <th className="text-left px-4 py-3 text-xs font-bold text-[#6b8c65] uppercase tracking-wide">Ciclo</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#6b8c65] uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-[#6b8c65] uppercase tracking-wide">Prod. neta</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-[#6b8c65] uppercase tracking-wide">Prod. bruta</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-[#6b8c65] uppercase tracking-wide">Costo total</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-[#6b8c65] uppercase tracking-wide">$/g</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-[#6b8c65] uppercase tracking-wide">Dias</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-[#6b8c65] uppercase tracking-wide">Lotes</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#6b8c65] uppercase tracking-wide">Geneticas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5faf3]">
              {data.map(d => (
                <tr key={d.id} className="hover:bg-[#f5faf3] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/ciclos/${d.id}`} className="font-medium text-[#1a2e1a] hover:text-[#2d5a27] hover:underline">
                      {d.name}
                    </Link>
                    {d.start_date && (
                      <p className="text-xs text-[#9ab894] mt-0.5">
                        {new Date(d.start_date + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                        {d.end_date && ` - ${new Date(d.end_date + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${d.status === "activo" ? "bg-[#edf7e8] text-[#2d6a1f] border-[#b8daa8]" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      {d.status === "activo" ? "Activo" : "Finalizado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#1a2e1a]">
                    {d.totalNet > 0 ? formatGrams(d.totalNet) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#6b8c65]">
                    {d.totalGross > 0 ? formatGrams(d.totalGross) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#1a2e1a]">
                    {d.totalCost > 0 ? `$${d.totalCost.toLocaleString("es-AR")}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {d.costPerGram ? (
                      <span className="font-bold text-[#2d6a1f]">${d.costPerGram.toFixed(2)}</span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#6b8c65]">
                    {d.durationDays ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#6b8c65]">
                    {d.lotsCount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {d.genetics.map((g, i) => (
                        <span key={i} className="text-xs bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] rounded px-1.5 py-0.5">{g}</span>
                      ))}
                      {d.genetics.length === 0 && <span className="text-xs text-[#9ab894]">-</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}