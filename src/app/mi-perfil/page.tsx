"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import LogoutButton from "./LogoutButton"
import PedidosWidget from "./PedidosWidget"
import ConsumoChart from "./ConsumoChart"

const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

export default function MiPerfilPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [dispenses, setDispenses] = useState<any[]>([])
  const [currentPayment, setCurrentPayment] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data: prof } = await supabase
        .from("profiles")
        .select("*, patient:patients!profiles_patient_id_fkey(*, membership_plan:membership_plans(name, monthly_grams, monthly_amount))")
        .eq("id", user.id)
        .single()

      if (!prof) { router.push("/login"); return }
      if (prof.role !== "paciente") { router.push("/dashboard"); return }

      const pat = prof.patient
      const pl = pat?.membership_plan

      setProfile(prof)
      setPatient(pat)
      setPlan(pl)

      if (pat) {
        const now = new Date()
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

        const [dispensesRes, docsRes, paymentRes] = await Promise.all([
          supabase.from("dispenses").select("id, dispensed_at, grams, lot:lots(lot_code, genetic:genetics(name))").eq("patient_id", pat.id).gte("dispensed_at", oneYearAgo.toISOString()).order("dispensed_at", { ascending: false }).limit(20),
          supabase.from("patient_documents").select("id, status, doc_type:patient_document_types(name, is_mandatory)").eq("patient_id", pat.id),
          supabase.from("membership_payments").select("id, amount, payment_date, payment_method").eq("patient_id", pat.id).eq("period_month", now.getMonth() + 1).eq("period_year", now.getFullYear()).maybeSingle()
        ])

        const dispList = dispensesRes.data ?? []
        setDispenses(dispList)
        setDocs(docsRes.data ?? [])
        setCurrentPayment(paymentRes.data)

        const chart = Array.from({ length: 12 }, (_, i) => {
          const d = new Date()
          d.setMonth(d.getMonth() - (11 - i))
          const month = d.getMonth() + 1
          const year = d.getFullYear()
          const grams = dispList.filter((x: any) => {
            const dd = new Date(x.dispensed_at)
            return dd.getMonth() + 1 === month && dd.getFullYear() === year
          }).reduce((acc: number, x: any) => acc + (x.grams ?? 0), 0)
          return { month: d.toLocaleString("es-AR", { month: "short" }), grams: Math.round(grams) }
        })
        setChartData(chart)
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080f09", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#4d7a46", fontSize: "14px" }}>Cargando...</div>
    </div>
  )

  const firstName = patient?.full_name?.split(" ")[0] ?? profile?.full_name
  const totalGramsYear = dispenses.reduce((acc, d) => acc + (d.grams ?? 0), 0)
  const avgMonthly = totalGramsYear / 12
  const docsFaltantes = docs.filter(d => ["faltante","vencido"].includes(d.status)).length
  const docsPendientes = docs.filter(d => d.status === "pendiente_revision").length
  const docsOk = docsFaltantes === 0 && docsPendientes === 0
  const now = new Date()

  return (
    <div style={{ minHeight: "100vh", background: "#080f09", color: "white", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#0f1f12", padding: "32px 20px 24px", textAlign: "center" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#2d5a27", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "20px", fontWeight: 800, border: "3px solid rgba(255,255,255,0.12)" }}>
          {firstName?.[0]?.toUpperCase()}
        </div>
        <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 4px" }}>{firstName}</h1>
        {plan && <p style={{ fontSize: "12px", color: "#4d7a46", margin: 0 }}>{plan.name}</p>}
      </div>

      <div style={{ padding: "16px", maxWidth: "400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Stats */}
        {plan && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Mi consumo</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>{Math.round(avgMonthly)}g</p>
                <p style={{ fontSize: "10px", color: "#4d7a46", margin: 0 }}>promedio mensual</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>{Math.round(totalGramsYear)}g</p>
                <p style={{ fontSize: "10px", color: "#4d7a46", margin: 0 }}>ultimo aÃ±o</p>
              </div>
            </div>
            {plan.monthly_grams && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>
                  <span>Uso mensual</span>
                  <span>{avgMonthly.toFixed(1)}g / {plan.monthly_grams}g</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px", height: "6px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#2d5a27", borderRadius: "8px", width: `${Math.min((avgMonthly / plan.monthly_grams) * 100, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grafico */}
        {chartData.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Consumo ultimos 12 meses</p>
            <ConsumoChart data={chartData} />
          </div>
        )}

        {/* Membresia del mes */}
        {plan && (
          <div style={{ background: currentPayment ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${currentPayment ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: "16px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Membresia {MONTHS_SHORT[now.getMonth()]} {now.getFullYear()}</p>
                <p style={{ fontSize: "13px", fontWeight: 600, color: currentPayment ? "#4ade80" : "#f87171", margin: 0 }}>
                  {currentPayment ? `Pagado el ${new Date(currentPayment.payment_date).toLocaleDateString("es-AR")}` : "Pago pendiente"}
                </p>
              </div>
              <span style={{ fontSize: "20px" }}>{currentPayment ? "âœ“" : "!"}</span>
            </div>
          </div>
        )}

        {/* Documentos */}
        <a href="/mi-perfil/documentos" style={{ textDecoration: "none" }}>
          <div style={{ background: docsOk ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${docsOk ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`, borderRadius: "16px", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Mis documentos</p>
                <p style={{ fontSize: "13px", fontWeight: 600, color: docsOk ? "#4ade80" : "#fbbf24", margin: 0 }}>
                  {docsOk ? "Todo en orden" : `${docsFaltantes} faltante${docsFaltantes !== 1 ? "s" : ""}${docsPendientes > 0 ? ` Â· ${docsPendientes} pendiente${docsPendientes !== 1 ? "s" : ""}` : ""}`}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>Toca para ver y subir documentos</p>
              </div>
              <span style={{ fontSize: "20px" }}>{docsOk ? "âœ“" : "âš "}</span>
            </div>
          </div>
        </a>

        {/* Ultimas dispensas */}
        {dispenses.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Ultimas visitas</p>
            {dispenses.slice(0, 5).map((d: any) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <p style={{ fontSize: "13px", margin: 0 }}>{new Date(d.dispensed_at).toLocaleDateString("es-AR")}</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0 }}>{d.lot?.genetic?.name ?? "Flor seca"}</p>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#4d7a46" }}>{d.grams}g</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ paddingTop: "8px", paddingBottom: "24px" }}>
          <PedidosWidget patientId={patient?.id ?? ""} monthlyLimit={plan?.monthly_grams ?? null} usedGrams={Math.round(avgMonthly)} />
        <LogoutButton />
        </div>
      </div>
    </div>
  )
}

