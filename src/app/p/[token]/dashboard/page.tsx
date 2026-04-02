import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDate, formatGrams } from "@/lib/utils"

const NIVELES = [
  { nombre: "Semilla",  min: 0,    color: "#6b7280" },
  { nombre: "Brote",    min: 50,   color: "#22c55e" },
  { nombre: "Planta",   min: 200,  color: "#16a34a" },
  { nombre: "Flor",     min: 500,  color: "#7c3aed" },
  { nombre: "Cosecha",  min: 1000, color: "#d97706" },
  { nombre: "Master",   min: 2000, color: "#dc2626" },
]

const INSIGNIAS = [
  { id: "primera",       icon: "★", label: "Primera dispensa",  check: (s: any) => s.totalHistorico > 0 },
  { id: "veterano",      icon: "♦", label: "6 meses en el club", check: (s: any) => s.mesesActivo >= 6 },
  { id: "coleccionista", icon: "◈", label: "5 geneticas",        check: (s: any) => s.geneticasProbadas >= 5 },
  { id: "constante",     icon: "●", label: "Top 3 del mes",      check: (s: any) => s.posicionMes <= 3 },
  { id: "lider",         icon: "▲", label: "Lider del club",     check: (s: any) => s.posicionHistorico === 1 },
]

function getNivelYProgreso(grams: number) {
  let actual = NIVELES[0]
  let siguiente = NIVELES[1]
  for (let i = 0; i < NIVELES.length - 1; i++) {
    if (grams >= NIVELES[i].min && grams < NIVELES[i + 1].min) {
      actual = NIVELES[i]; siguiente = NIVELES[i + 1]; break
    }
    if (grams >= NIVELES[NIVELES.length - 1].min) {
      actual = NIVELES[NIVELES.length - 1]; siguiente = NIVELES[NIVELES.length - 1]
    }
  }
  const rango = siguiente.min - actual.min
  const avance = grams - actual.min
  const progreso = rango > 0 ? Math.min((avance / rango) * 100, 100) : 100
  return { actual, siguiente, progreso }
}

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

  const [rankingMes, rankingAnio, rankingHistorico, topMes, topHistorico] = await Promise.all([
    service.from("v_ranking_mes").select("*").eq("patient_id", patient.id).single(),
    service.from("v_ranking_anio").select("*").eq("patient_id", patient.id).single(),
    service.from("v_ranking_historico").select("*").eq("patient_id", patient.id).single(),
    service.from("v_ranking_mes").select("full_name, total_grams").order("posicion").limit(3),
    service.from("v_ranking_historico").select("full_name, total_grams").order("posicion").limit(3),
  ])

  const stats = {
    totalMes: rankingMes.data?.total_grams ?? 0,
    totalAnio: rankingAnio.data?.total_grams ?? 0,
    totalHistorico: rankingHistorico.data?.total_grams ?? 0,
    visitasMes: rankingMes.data?.visitas ?? 0,
    visitasTotal: rankingHistorico.data?.visitas ?? 0,
    geneticasProbadas: rankingHistorico.data?.geneticas_probadas ?? 0,
    posicionMes: rankingMes.data?.posicion ?? 99,
    posicionAnio: rankingAnio.data?.posicion ?? 99,
    posicionHistorico: rankingHistorico.data?.posicion ?? 99,
    primeraDispensa: rankingHistorico.data?.primera_dispensa ?? null,
    mesesActivo: patient.created_at
      ? Math.floor((Date.now() - new Date(patient.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0,
  }

  const { actual: nivel, siguiente: nivelSig, progreso } = getNivelYProgreso(stats.totalHistorico)
  const insignias = INSIGNIAS.filter(i => i.check(stats))
  const firstName = patient.full_name.split(" ")[0]

  return (
    <div style={{ minHeight: "100vh", background: "#080f09", color: "white", fontFamily: "system-ui, sans-serif", paddingBottom: "32px" }}>

      <div style={{ background: "#0f2412", padding: "32px 20px 20px", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: nivel.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: "24px", fontWeight: 800, border: "3px solid rgba(255,255,255,0.12)" }}>
          {firstName[0]}
        </div>
        <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>{firstName}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", padding: "4px 14px", fontSize: "11px", color: nivel.color, fontWeight: 600 }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: nivel.color, display: "inline-block" }} />
          Nivel {nivel.nombre}
        </div>
        {stats.primeraDispensa && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "8px" }}>Miembro desde {formatDate(stats.primeraDispensa)}</p>}
      </div>

      <div style={{ padding: "12px 16px 0", display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px", margin: "0 auto" }}>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(255,255,255,0.35)", marginBottom: "8px" }}>
            <span>{nivel.nombre}</span>
            <span>{nivelSig.nombre !== nivel.nombre ? `→ ${nivelSig.nombre} (${nivelSig.min}g)` : "Nivel maximo"}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px", height: "7px", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: "8px", background: nivel.color, width: `${progreso}%` }} />
          </div>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginTop: "6px", textAlign: "right" }}>{formatGrams(stats.totalHistorico)} totales</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {[
            { label: "Este mes",  value: formatGrams(stats.totalMes),       sub: `#${stats.posicionMes} del club` },
            { label: "Este año",  value: formatGrams(stats.totalAnio),      sub: `#${stats.posicionAnio} del club` },
            { label: "Historico", value: formatGrams(stats.totalHistorico), sub: `#${stats.posicionHistorico} del club` },
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "12px 8px", textAlign: "center" }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>{s.label}</p>
              <p style={{ fontSize: "16px", fontWeight: 800, color: "white", lineHeight: 1, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: "10px", color: "#4d7a46", marginTop: "4px", margin: 0 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {[
            { label: "Visitas", value: stats.visitasTotal, sub: `${stats.visitasMes} este mes` },
            { label: "Geneticas", value: stats.geneticasProbadas, sub: "probadas" },
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "14px", textAlign: "center" }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>{s.label}</p>
              <p style={{ fontSize: "26px", fontWeight: 800, color: "white", lineHeight: 1, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: "10px", color: "#4d7a46", marginTop: "4px", margin: 0 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {insignias.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#d97706", marginBottom: "10px", textTransform: "uppercase" }}>Insignias</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {insignias.map(ins => (
                <div key={ins.id} style={{ background: "rgba(217,119,6,0.15)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "13px", color: "#fcd34d" }}>{ins.icon}</span>
                  <span style={{ fontSize: "11px", color: "#fcd34d", fontWeight: 500 }}>{ins.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {topMes.data && topMes.data.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#7c3aed", marginBottom: "12px", textTransform: "uppercase" }}>Top del mes</p>
            {topMes.data.map((p: any, i: number) => {
              const medals = ["🥇", "🥈", "🥉"]
              const isMe = p.full_name === patient.full_name
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < topMes.data!.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "15px" }}>{medals[i]}</span>
                    <span style={{ fontSize: "13px", fontWeight: isMe ? 700 : 400, color: isMe ? "#7dc264" : "white" }}>{p.full_name.split(" ")[0]}{isMe ? " (vos)" : ""}</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{formatGrams(p.total_grams)}</span>
                </div>
              )
            })}
          </div>
        )}

        {topHistorico.data && topHistorico.data.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#dc2626", marginBottom: "12px", textTransform: "uppercase" }}>Hall of Fame</p>
            {topHistorico.data.map((p: any, i: number) => {
              const medals = ["🥇", "🥈", "🥉"]
              const isMe = p.full_name === patient.full_name
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < topHistorico.data!.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "15px" }}>{medals[i]}</span>
                    <span style={{ fontSize: "13px", fontWeight: isMe ? 700 : 400, color: isMe ? "#7dc264" : "white" }}>{p.full_name.split(" ")[0]}{isMe ? " (vos)" : ""}</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{formatGrams(p.total_grams)}</span>
                </div>
              )
            })}
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.15)", paddingBottom: "8px" }}>
          Circulo Esmeralda · Cannabis Medicinal
        </p>
      </div>
    </div>
  )
}