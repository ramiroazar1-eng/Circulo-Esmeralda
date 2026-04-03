import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatDate, formatGrams } from "@/lib/utils"
import Link from "next/link"
import LogoutButton from "./LogoutButton"
import ConsumoChart from "./ConsumoChart"

const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

export default async function MiPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("*, patient:patients(*, membership_plan:membership_plans(name, monthly_grams, monthly_amount))").eq("id", user.id).single()

  if (!profile) redirect("/login")
  console.log("PROFILE ROLE:", profile.role, "PATIENT_ID:", (profile as any).patient_id)
  if (profile.role !== "paciente") redirect("/dashboard")

  const patient = (profile as any).patient

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto">
            <span className="text-white text-sm font-bold">ONG</span>
          </div>
          <h1 className="text-xl font-bold">Hola, {profile.full_name}</h1>
          <p className="text-slate-400 text-sm">Tu cuenta esta siendo configurada por el equipo. En breve vas a poder ver tu informacion.</p>
          <LogoutButton />
        </div>
      </div>
    )
  }

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { data: dispenses } = await supabase
    .from("dispenses")
    .select("id, dispensed_at, grams, lot:lots(lot_code, genetic:genetics(name))")
    .eq("patient_id", patient.id)
    .gte("dispensed_at", oneYearAgo.toISOString())
    .order("dispensed_at", { ascending: false })

  const { data: allDispenses } = await supabase
    .from("dispenses").select("id, grams").eq("patient_id", patient.id)

  const { data: docs } = await supabase
    .from("patient_documents")
    .select("*, doc_type:patient_document_types(name, slug, has_expiry)")
    .eq("patient_id", patient.id)
    .order("doc_type(sort_order)")

  const dispenseList = (dispenses ?? []) as any[]
  const allList = (allDispenses ?? []) as any[]
  const docList = (docs ?? []) as any[]

  const totalGramsYear = dispenseList.reduce((acc, d) => acc + (d.grams ?? 0), 0)
  const totalDispenses = allList.length
  const totalGramsAll = allList.reduce((acc, d) => acc + (d.grams ?? 0), 0)
  const avgMonthly = totalGramsYear / 12
  const plan = patient.membership_plan as any

  const geneticCount: Record<string, number> = {}
  for (const d of dispenseList) {
    const name = d.lot?.genetic?.name ?? "Sin especificar"
    geneticCount[name] = (geneticCount[name] ?? 0) + d.grams
  }
  const topGenetic = Object.entries(geneticCount).sort((a, b) => b[1] - a[1])[0]

  const lastDispense = dispenseList[0]
  const daysSinceLast = lastDispense
    ? Math.floor((Date.now() - new Date(lastDispense.dispensed_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const docsOk = docList.every(d => ["aprobado","pendiente_vinculacion"].includes(d.status))
  const docsFaltantes = docList.filter(d => ["faltante","vencido","observado"].includes(d.status)).length
  const docsPendientes = docList.filter(d => d.status === "pendiente_revision").length

  const firstName = patient.full_name.split(" ")[0]
  const isActive = patient.status === "activo"


  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const { data: currentPayment } = await supabase
    .from("membership_payments")
    .select("id, amount, payment_date, payment_method")
    .eq("patient_id", patient.id)
    .eq("period_month", currentMonth)
    .eq("period_year", currentYear)
    .maybeSingle()


  const chartData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const grams = dispenseList
      .filter((x: any) => {
        const dd = new Date(x.dispensed_at)
        return dd.getMonth() + 1 === month && dd.getFullYear() === year
      })
      .reduce((acc: number, x: any) => acc + (x.grams ?? 0), 0)
    return { month: d.toLocaleString("es-AR", { month: "short" }), grams: Math.round(grams) }
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-sm mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <span className="text-white text-xs font-bold">ONG</span>
          </div>
          <LogoutButton />
        </div>

        {/* Saludo */}
        <div>
          <h1 className="text-3xl font-black text-white">Hola, {firstName}</h1>
          <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full ${isActive ? "bg-green-500/20" : "bg-red-500/20"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            <span className={`text-xs font-medium ${isActive ? "text-green-400" : "text-red-400"}`}>
              {isActive ? "Socio activo" : "Cuenta inactiva"}
            </span>
          </div>
        </div>

        {/* Stat principal */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ultimo año</p>
          <p className="text-5xl font-black text-white mb-1">
            {totalGramsYear.toFixed(0)}<span className="text-2xl text-slate-400 font-normal">g</span>
          </p>
          <p className="text-sm text-slate-400">consumidos en 12 meses</p>
          {plan?.monthly_grams && (
            <div className="mt-3 bg-slate-700/50 rounded-xl p-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Uso promedio mensual</span>
                <span>{avgMonthly.toFixed(1)}g / {plan.monthly_grams}g</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-400" style={{ width: `${Math.min((avgMonthly / plan.monthly_grams) * 100, 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Grid stats */}
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
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl">🌿</div>
            </div>
          </div>
        )}

        {/* Documentacion */}
        <Link href="/mi-perfil/documentos" className="block">
          <div className={`rounded-2xl p-5 border ${docsOk ? "bg-green-950/30 border-green-800/50" : "bg-amber-950/30 border-amber-800/50"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Mis documentos</p>
                <p className={`text-sm font-semibold ${docsOk ? "text-green-400" : "text-amber-400"}`}>
                  {docsOk ? "Todo en orden" : `${docsFaltantes} faltante${docsFaltantes > 1 ? "s" : ""}${docsPendientes > 0 ? ` · ${docsPendientes} pendiente${docsPendientes > 1 ? "s" : ""}` : ""}`}
                </p>
                <p className="text-xs text-slate-500 mt-1">Toca para ver y subir documentos</p>
              </div>
              <span className="text-2xl">{docsOk ? "✓" : "⚠"}</span>
            </div>
          </div>
        </Link>

        {/* Membresia */}
        {plan && (
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Tu plan</p>
            <p className="text-lg font-bold text-white">{plan.name}</p>
            {plan.monthly_grams && <p className="text-sm text-slate-400">{plan.monthly_grams}g por mes incluidos</p>}
          </div>
        )}


        {/* Grafico de consumo */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Consumo ultimos 12 meses</p>
          <ConsumoChart data={chartData} />
        </div>

                {/* Ultimas dispensas */}
        {dispenseList.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Ultimas visitas</p>
            <div className="space-y-2">
              {dispenseList.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm text-white">{formatDate(d.dispensed_at)}</p>
                    <p className="text-xs text-slate-500">{d.lot?.genetic?.name ?? "Flor seca"}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-300">{formatGrams(d.grams)}</span>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Estado membresia del mes */}
        {plan && (
          <div className={`rounded-2xl p-5 border ${currentPayment ? "bg-green-950/30 border-green-800/50" : "bg-red-950/30 border-red-800/50"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Membresia {MONTHS_SHORT[now.getMonth()]} {now.getFullYear()}</p>
                <p className={`text-sm font-semibold ${currentPayment ? "text-green-400" : "text-red-400"}`}>
                  {currentPayment ? `Pagado el ${new Date(currentPayment.payment_date).toLocaleDateString("es-AR")}` : "Pago pendiente"}
                </p>
                {currentPayment && <p className="text-xs text-slate-500 mt-0.5 capitalize">{currentPayment.payment_method}</p>}
              </div>
              <span className="text-2xl">{currentPayment ? "✓" : "!"}</span>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-700 pb-4">
          Socio desde {formatDate(patient.created_at)} · Uso exclusivamente medicinal
        </p>
      </div>
    </div>
  )
}
