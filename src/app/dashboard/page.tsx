'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatCurrencySigned, formatDate, daysUntil, urgencyFromDays } from '@/lib/utils/format'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtPct(val: number | null) {
  if (val === null || isNaN(val) || !isFinite(val)) return '—'
  return (val * 100).toFixed(2) + '%'
}

export default function DashboardPage() {
  const supabase = createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [properties, setProperties] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [allRecords, setAllRecords] = useState<any[]>([])
  const [mortgages, setMortgages] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [recurring, setRecurring] = useState<any[]>([])
  const [contributions, setContributions] = useState<any[]>([])
  const [acquisition, setAcquisition] = useState<any[]>([])
  const [entityExpenses, setEntityExpenses] = useState<any[]>([])
  const [extraordinaryItems, setExtraordinaryItems] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [pnlYear, setPnlYear] = useState(year)
  const [pnlRecords, setPnlRecords] = useState<any[]>([])
  const [pnlEntityExp, setPnlEntityExp] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastClose, setLastClose] = useState<{month: number; year: number} | null>(null)
  const [showExtraordinary, setShowExtraordinary] = useState(false)
  const [showDesglose, setShowDesglose] = useState(false)

  const pnlYears = Array.from({ length: year - 2024 + 1 }, (_, i) => 2024 + i)

  useEffect(() => {
    Promise.all([
      supabase.from('properties').select('*, entity:entities(name)').neq('status', 'sold'),
      supabase.from('monthly_records').select('*').eq('year', year).eq('month', month),
      supabase.from('monthly_records').select('*').eq('year', year).eq('status', 'locked').order('month'),
      supabase.from('mortgages').select('current_balance, property_id').eq('is_active', true),
      supabase.from('tasks').select('*, property:properties(name)').in('status', ['open','in_progress']).order('due_date', { ascending: true }).limit(5),
      supabase.from('property_recurring_values').select('*'),
      supabase.from('capital_contributions').select('*'),
      supabase.from('acquisition_costs').select('*'),
      supabase.from('entity_expenses').select('*').eq('year', year),
      supabase.from('extraordinary_items').select('*, property:properties(name)').eq('year', year).order('month', { ascending: false }),
      supabase.from('entities').select('id, name'),
      supabase.from('monthly_records').select('year, month').eq('status', 'locked').order('year', { ascending: false }).order('month', { ascending: false }).limit(1),
    ]).then((results: any[]) => {
      setProperties(results[0].data ?? [])
      setRecords(results[1].data ?? [])
      setAllRecords(results[2].data ?? [])
      setMortgages(results[3].data ?? [])
      setTasks(results[4].data ?? [])
      setRecurring(results[5].data ?? [])
      setContributions(results[6].data ?? [])
      setAcquisition(results[7].data ?? [])
      setEntityExpenses(results[8].data ?? [])
      setExtraordinaryItems(results[9].data ?? [])
      setEntities(results[10].data ?? [])
      const lc = results[11].data?.[0]
      if (lc) setLastClose({ month: lc.month, year: lc.year })
      setPnlRecords(results[2].data ?? [])
      setPnlEntityExp(results[8].data ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (pnlYear === year) { setPnlRecords(allRecords); setPnlEntityExp(entityExpenses); return }
    Promise.all([
      supabase.from('monthly_records').select('*').eq('year', pnlYear).eq('status', 'locked').order('month'),
      supabase.from('entity_expenses').select('*').eq('year', pnlYear),
    ]).then(([{ data: r }, { data: e }]: any[]) => { setPnlRecords(r ?? []); setPnlEntityExp(e ?? []) })
  }, [pnlYear])

  // Calcs
  const grossRent = records.reduce((s: number, r: any) => s + (r.gross_rent ?? 0), 0)
  const totalExpenses = records.reduce((s: number, r: any) => s + (r.total_expenses ?? 0), 0)
  const currentMonthEntityExp = entityExpenses.filter((e: any) => e.month === month).reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
  const netCashflow = grossRent - totalExpenses - currentMonthEntityExp
  const totalDebt = mortgages.reduce((s: number, m: any) => s + (m.current_balance ?? 0), 0)
  const occupied = properties.filter((p: any) => p.status === 'occupied').length
  const activePropCount = properties.length || 1
  const entityName = entities[0]?.name ?? 'Portfolio'

  const propMetrics = properties.map((prop: any) => {
    const rec = recurring.find((r: any) => r.property_id === prop.id)
    const acqCosts = acquisition.filter((a: any) => a.property_id === prop.id)
    const propMortgage = mortgages.find((m: any) => m.property_id === prop.id)
    const monthlyRent = rec?.monthly_rent ?? prop.monthly_rent ?? 0
    const annualRent = monthlyRent * 12
    const annualTax = rec?.property_tax_annual ?? (rec?.property_tax_monthly ?? 0) * 12
    const annualInsurance = rec?.insurance_annual ?? (rec?.insurance_monthly ?? 0) * 12
    const annualPM = rec?.pm_percentage ? monthlyRent * rec.pm_percentage * 12 : 0
    const annualHOA = (rec?.hoa_monthly ?? 0) * 12
    const annualMortgage = (rec?.mortgage_payment ?? 0) * 12
    const annualOpex = annualMortgage + annualTax + annualInsurance + annualPM + annualHOA
    const annualNOI = annualRent - (annualTax + annualInsurance + annualPM + annualHOA)
    const annualNetCF = annualRent - annualOpex
    const currentValue = prop.current_value ?? prop.purchase_price ?? 0
    const capRate = currentValue > 0 && annualNOI > 0 ? annualNOI / currentValue : null
    const totalAcqCost = acqCosts.reduce((s: number, a: any) => s + (a.amount ?? 0), 0)
    const totalContrib = contributions.filter((c: any) => c.property_id === prop.id).reduce((s: number, c: any) => s + (c.amount ?? 0), 0)
    const capitalInvested = totalAcqCost || totalContrib || prop.purchase_price || 0
    const cashOnCash = capitalInvested > 0 && annualNetCF !== 0 ? annualNetCF / capitalInvested : null
    const equity = currentValue > 0 && propMortgage ? currentValue - (propMortgage.current_balance ?? 0) : currentValue > 0 ? currentValue : null
    const monthlyRecord = records.find((r: any) => r.property_id === prop.id)
    return { prop, annualRent, annualNOI, annualNetCF, annualMortgage, annualTax, annualInsurance, annualPM, capRate, cashOnCash, capitalInvested, currentValue, equity, monthlyRent, monthlyRecord, propMortgage, rec }
  })

  const totalAnnualNOI = propMetrics.reduce((s: number, p: any) => s + p.annualNOI, 0)
  const totalAnnualNetCF = propMetrics.reduce((s: number, p: any) => s + p.annualNetCF, 0)
  const totalAnnualRent = propMetrics.reduce((s: number, p: any) => s + p.annualRent, 0)
  const totalAnnualMortgage = propMetrics.reduce((s: number, p: any) => s + p.annualMortgage, 0)
  const totalAnnualTax = propMetrics.reduce((s: number, p: any) => s + p.annualTax, 0)
  const totalAnnualInsurance = propMetrics.reduce((s: number, p: any) => s + p.annualInsurance, 0)
  const totalAnnualPM = propMetrics.reduce((s: number, p: any) => s + p.annualPM, 0)
  const totalCapital = propMetrics.reduce((s: number, p: any) => s + p.capitalInvested, 0)
  const totalValue = propMetrics.reduce((s: number, p: any) => s + p.currentValue, 0)
  const totalEquity = propMetrics.reduce((s: number, p: any) => s + (p.equity ?? 0), 0)
  const portfolioCapRate = totalValue > 0 && totalAnnualNOI > 0 ? totalAnnualNOI / totalValue : null
  const portfolioCashOnCash = totalCapital > 0 && totalAnnualNetCF !== 0 ? totalAnnualNetCF / totalCapital : null

  const totalEntityExp = pnlEntityExp.reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
  const pnlRent = pnlRecords.reduce((s: number, r: any) => s + (r.gross_rent ?? 0), 0)
  const pnlExp = pnlRecords.reduce((s: number, r: any) => s + (r.total_expenses ?? 0), 0)
  const pnlNet = pnlRent - pnlExp - totalEntityExp
  const pnlLockedMonths = [...new Set(pnlRecords.map((r: any) => r.month))].length
  const totalExtraordinary = extraordinaryItems.reduce((s: number, e: any) => s + (e.amount ?? 0), 0)

  const chartData = MONTHS.map((m, i) => {
    const mn = i + 1
    const monthRecs = allRecords.filter((r: any) => r.month === mn)
    const monthEE = entityExpenses.filter((e: any) => e.month === mn)
    const rent = monthRecs.reduce((s: number, r: any) => s + (r.gross_rent ?? 0), 0)
    const opex = monthRecs.reduce((s: number, r: any) => s + (r.total_expenses ?? 0), 0)
    const entityExp = monthEE.reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
    return { mes: m, ingresos: rent, gastos: opex, entidad: entityExp, hasData: monthRecs.length > 0 }
  }).filter(d => d.hasData)

  const urgentTasks = tasks.filter((t: any) => {
    const days = daysUntil(t.due_date)
    const u = urgencyFromDays(days)
    return u === 'overdue' || u === 'urgent' || u === 'soon'
  })

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-[13px] text-gray-400">Cargando dashboard...</p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ZONA 1 — Resumen ejecutivo */}
      <div className="bg-[#185FA5] rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] text-[#B5D4F4] font-medium uppercase tracking-wide">{entityName}</p>
            <p className="text-[18px] font-medium mt-0.5">Portfolio overview</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#B5D4F4]">
              {lastClose ? `Ultimo cierre: ${MONTHS[lastClose.month-1]} ${lastClose.year}` : 'Sin cierres todavia'}
            </p>
            <p className="text-[11px] text-[#B5D4F4] mt-0.5">{occupied}/{properties.length} propiedades ocupadas</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Renta mensual', value: formatCurrency(totalAnnualRent / 12) },
            { label: 'Equity total', value: totalEquity > 0 ? formatCurrency(totalEquity) : '—' },
            { label: 'Capital invertido', value: totalCapital > 0 ? formatCurrency(totalCapital) : '—' },
            { label: 'Cap rate', value: fmtPct(portfolioCapRate) },
            { label: 'Cash-on-cash', value: fmtPct(portfolioCashOnCash) },
          ].map(k => (
            <div key={k.label} className="bg-white/10 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-[#B5D4F4] mb-0.5">{k.label}</p>
              <p className="text-[16px] font-medium text-white">{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ZONA 2 — Property cards */}
      <div className="grid grid-cols-2 gap-3">
        {propMetrics.map((m: any) => {
          const cf = m.monthlyRecord?.net_cashflow ?? null
          const isPositive = cf !== null ? cf >= 0 : m.annualNetCF >= 0
          const leaseEnd = m.prop.lease_end
          const leaseDays = leaseEnd ? daysUntil(leaseEnd) : null
          const leaseUrgent = leaseDays !== null && leaseDays < 90
          return (
            <Link key={m.prop.id} href={`/properties/${m.prop.id}`}
              className={`block rounded-xl p-4 border transition-all hover:shadow-sm ${isPositive ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[14px] font-medium text-gray-900">{m.prop.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{m.prop.city}, {m.prop.state} · {m.prop.entity?.name}</p>
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                  {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {m.prop.status === 'occupied' ? 'Occupied' : m.prop.status === 'vacant' ? 'Vacant' : m.prop.status}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Renta mensual</p>
                  <p className="text-[13px] font-medium text-gray-900">{m.monthlyRent > 0 ? formatCurrency(m.monthlyRent) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Net CF mes</p>
                  <p className={`text-[13px] font-medium ${cf !== null && cf >= 0 ? 'text-green-700' : cf !== null ? 'text-red-600' : 'text-gray-400'}`}>
                    {cf !== null ? formatCurrencySigned(cf) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Cap rate</p>
                  <p className="text-[13px] font-medium text-blue-700">{fmtPct(m.capRate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Equity est.</p>
                  <p className="text-[13px] font-medium text-gray-900">{m.equity !== null && m.equity > 0 ? formatCurrency(m.equity) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Cash-on-cash</p>
                  <p className="text-[13px] font-medium text-green-700">{fmtPct(m.cashOnCash)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Lease vence</p>
                  <p className={`text-[13px] font-medium ${leaseUrgent ? 'text-amber-600' : 'text-gray-700'}`}>
                    {leaseEnd ? formatDate(leaseEnd, 'short') : '—'}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
        {properties.length === 0 && (
          <div className="col-span-2 bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <p className="text-[13px] text-gray-400">Agrega propiedades para ver las cards</p>
          </div>
        )}
      </div>

      {/* ZONA 3 — Operativo del mes */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[13px] font-medium text-gray-900">Operativo — {MONTHS[month-1]} {year}</p>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Gross rent', value: formatCurrency(grossRent), sub: `${MONTHS[month-1]} ${year}` },
            { label: 'Gastos totales', value: formatCurrency(totalExpenses + currentMonthEntityExp), sub: 'incl. entidad' },
            { label: 'Net cashflow', value: formatCurrencySigned(netCashflow), cls: netCashflow >= 0 ? 'text-green-600' : 'text-red-500', sub: 'este mes' },
            { label: 'Deuda pendiente', value: formatCurrency(totalDebt), sub: 'mortgages activos' },
          ].map(k => (
            <div key={k.label} className="bg-gray-50 rounded-lg p-4">
              <p className="text-[12px] text-gray-500 mb-1">{k.label}</p>
              <p className={`text-[20px] font-medium ${(k as any).cls ?? ''}`}>{k.value}</p>
              <p className="text-[11px] text-gray-400 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ZONA 4 — P&L + Grafico */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[13px] font-medium text-gray-900">P&L anual</p>
          <div className="flex-1 h-px bg-gray-100" />
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-[12px]">
            {pnlYears.map(y => (
              <button key={y} onClick={() => setPnlYear(y)}
                className={`px-3 py-1.5 transition-colors ${pnlYear === y ? 'bg-blue-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: `Renta bruta ${pnlYear}`, value: formatCurrency(pnlRent), sub: `${pnlLockedMonths} ${pnlLockedMonths === 1 ? 'mes cerrado' : 'meses cerrados'}`, cls: 'text-green-600' },
                { label: 'Gastos operativos', value: formatCurrency(pnlExp), sub: '' },
                { label: 'Gastos entidad', value: formatCurrency(totalEntityExp), sub: 'divididos entre propiedades', cls: 'text-blue-600' },
                { label: `Net CF ${pnlYear}`, value: formatCurrencySigned(pnlNet), sub: pnlYear === year ? 'hasta hoy' : 'año completo', cls: pnlNet >= 0 ? 'text-green-600' : 'text-red-500' },
              ].map(k => (
                <div key={k.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] text-gray-500 mb-1">{k.label}</p>
                  <p className={`text-[17px] font-medium ${(k as any).cls ?? ''}`}>{k.value}</p>
                  {k.sub && <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>}
                </div>
              ))}
            </div>
            {/* Desglose por propiedad — colapsable */}
            <button onClick={() => setShowDesglose(!showDesglose)}
              className="w-full flex items-center justify-between text-[12px] text-gray-500 hover:text-gray-700 pt-3 border-t border-gray-100">
              <span>Desglose por propiedad</span>
              {showDesglose ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showDesglose && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Propiedad','Renta','Mortgage','Taxes','Insurance','PM','G.Entidad','Net CF'].map(h => (
                        <th key={h} className="text-right text-[10px] font-medium text-gray-400 pb-2 first:text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {propMetrics.map((m: any) => {
                      const sharedExp = totalEntityExp / activePropCount
                      const netWithShared = m.annualNetCF - sharedExp
                      return (
                        <tr key={m.prop.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-2">
                            <p className="font-medium text-gray-900">{m.prop.name}</p>
                            <p className="text-[10px] text-gray-400">{m.prop.city}</p>
                          </td>
                          <td className="py-2 text-right text-green-700">{formatCurrency(m.annualRent)}</td>
                          <td className="py-2 text-right text-gray-600">{formatCurrency(m.annualMortgage)}</td>
                          <td className="py-2 text-right text-gray-600">{formatCurrency(m.annualTax)}</td>
                          <td className="py-2 text-right text-gray-600">{formatCurrency(m.annualInsurance)}</td>
                          <td className="py-2 text-right text-gray-600">{formatCurrency(m.annualPM)}</td>
                          <td className="py-2 text-right text-blue-600">{formatCurrency(sharedExp)}</td>
                          <td className={`py-2 text-right font-medium ${netWithShared >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatCurrencySigned(netWithShared)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t border-gray-200 font-medium bg-gray-50">
                      <td className="py-2 text-gray-900">Total</td>
                      <td className="py-2 text-right text-green-700">{formatCurrency(totalAnnualRent)}</td>
                      <td className="py-2 text-right">{formatCurrency(totalAnnualMortgage)}</td>
                      <td className="py-2 text-right">{formatCurrency(totalAnnualTax)}</td>
                      <td className="py-2 text-right">{formatCurrency(totalAnnualInsurance)}</td>
                      <td className="py-2 text-right">{formatCurrency(totalAnnualPM)}</td>
                      <td className="py-2 text-right text-blue-600">{formatCurrency(totalEntityExp)}</td>
                      <td className={`py-2 text-right text-[13px] ${(totalAnnualNetCF - totalEntityExp) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrencySigned(totalAnnualNetCF - totalEntityExp)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Grafico + alertas */}
          <div className="space-y-3">
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <p className="text-[13px] font-medium text-gray-900 mb-3">Cashflow — {year}</p>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-28 text-[12px] text-gray-400">Sin datos cerrados todavia</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} barSize={10}>
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + v} width={36} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[2,2,0,0]} />
                    <Bar dataKey="gastos" name="Gastos op." fill="#f87171" radius={[2,2,0,0]} />
                    <Bar dataKey="entidad" name="G. Entidad" fill="#fb923c" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Alertas */}
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-medium text-gray-900">Alertas y vencimientos</p>
                <Link href="/alertas" className="text-[11px] text-blue-600 hover:underline">Ver todas</Link>
              </div>
              {tasks.length === 0 ? (
                <p className="text-[12px] text-gray-400 text-center py-3">Sin alertas pendientes</p>
              ) : tasks.map((task: any) => {
                const days = daysUntil(task.due_date)
                const urgency = urgencyFromDays(days)
                const dotColor = urgency === 'overdue' || urgency === 'urgent' ? 'bg-red-400' : urgency === 'soon' ? 'bg-amber-400' : 'bg-blue-400'
                return (
                  <div key={task.id} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                    <div>
                      <p className="text-[12px] text-gray-900">{task.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{task.property?.name ? task.property.name + ' · ' : ''}{task.due_date ? formatDate(task.due_date) : 'Sin fecha'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ZONA 5 — Gastos extraordinarios (colapsable) */}
      {extraordinaryItems.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <button onClick={() => setShowExtraordinary(!showExtraordinary)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <p className="text-[13px] font-medium text-gray-900">Gastos extraordinarios — {year}</p>
              <span className="text-[11px] text-red-600 font-medium">{formatCurrency(totalExtraordinary)} total</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">{extraordinaryItems.length} gastos</span>
              {showExtraordinary ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </div>
          </button>
          {showExtraordinary && (
            <table className="w-full text-[13px] border-t border-gray-100">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Periodo','Propiedad','Categoria','Descripcion','Monto'].map(h => (
                    <th key={h} className="text-left text-[11px] font-medium text-gray-400 px-5 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {extraordinaryItems.slice(0, 8).map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-2.5 text-gray-500">{MONTHS[item.month-1]} {item.year}</td>
                    <td className="px-5 py-2.5 text-gray-900">{item.property?.name ?? '—'}</td>
                    <td className="px-5 py-2.5">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">{item.category}</span>
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{item.description}</td>
                    <td className="px-5 py-2.5 font-medium text-red-600">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Link a historial CF */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4">
        <div>
          <p className="text-[13px] font-medium text-gray-900">Cashflow mensual detallado</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Historial completo mes a mes, por propiedad y consolidado</p>
        </div>
        <Link href="/cashflow" className="flex items-center gap-1.5 text-[13px] px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
          Ver historial CF
        </Link>
      </div>

    </div>
  )
}
