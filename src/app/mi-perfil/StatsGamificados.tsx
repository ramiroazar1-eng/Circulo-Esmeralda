"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatGrams } from "@/lib/utils"

const NIVELES = [
  { nombre: "Semilla",  min: 0,    color: "#6b7280" },
  { nombre: "Brote",    min: 50,   color: "#22c55e" },
  { nombre: "Planta",   min: 200,  color: "#16a34a" },
  { nombre: "Flor",     min: 500,  color: "#7c3aed" },
  { nombre: "Cosecha",  min: 1000, color: "#d97706" },
  { nombre: "Master",   min: 2000, color: "#dc2626" },
]

const INSIGNIAS = [
  { id: "primera",    icon: "\uD83C\uDF31", label: "Primera dispensa",   check: (s: any) => s.totalHistorico > 0 },
  { id: "veterano",   icon: "\u2B50", label: "6 meses en el club", check: (s: any) => s.mesesActivo >= 6 },
  { id: "explorador", icon: "\uD83E\uDDEC", label: "5 geneticas",        check: (s: any) => s.geneticasProbadas >= 5 },
  { id: "constante",  icon: "\uD83C\uDFC6", label: "Top 3 del mes",      check: (s: any) => s.posicionMes <= 3 },
  { id: "fiel",       icon: "\uD83D\uDD25", label: "12 meses activo",    check: (s: any) => s.mesesActivo >= 12 },
  { id: "lider",      icon: "\uD83D\uDC51", label: "Lider del club",     check: (s: any) => s.posicionHistorico === 1 },
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

export default function StatsGamificados({ patientId, firstName, createdAt }: { patientId: string; firstName: string; createdAt: string | null }) {
  const [stats, setStats] = useState<any>(null)
  const [topMes, setTopMes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const [mes, anio, historico, topMesRes] = await Promise.all([
        supabase.from("v_ranking_mes").select("*").eq("patient_id", patientId).maybeSingle(),
        supabase.from("v_ranking_anio").select("*").eq("patient_id", patientId).maybeSingle(),
        supabase.from("v_ranking_historico").select("*").eq("patient_id", patientId).maybeSingle(),
        supabase.from("v_ranking_mes").select("full_name, total_grams").order("posicion").limit(3),
      ])

      const mesesActivo = createdAt
        ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0

      setStats({
        totalMes: mes.data?.total_grams ?? 0,
        totalAnio: anio.data?.total_grams ?? 0,
        totalHistorico: historico.data?.total_grams ?? 0,
        visitasMes: mes.data?.visitas ?? 0,
        visitasTotal: historico.data?.visitas ?? 0,
        geneticasProbadas: historico.data?.geneticas_probadas ?? 0,
        geneticaFavorita: historico.data?.genetica_favorita ?? null,
        posicionMes: mes.data?.posicion ?? 99,
        posicionAnio: anio.data?.posicion ?? 99,
        posicionHistorico: historico.data?.posicion ?? 99,
        primeraDispensa: historico.data?.primera_dispensa ?? null,
        mesesActivo,
      })
      setTopMes(topMesRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [patientId, createdAt])

  if (loading || !stats) return null

  const { actual: nivel, siguiente: nivelSig, progreso } = getNivelYProgreso(stats.totalHistorico)
  const insignias = INSIGNIAS.filter(i => i.check(stats))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

      {/* Nivel y progreso */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: nivel.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "white" }}>
              {firstName[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 800, color: "white", margin: 0 }}>Nivel {nivel.nombre}</p>
              {nivelSig.nombre !== nivel.nombre && <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", margin: 0 }}>Siguiente: {nivelSig.nombre} ({nivelSig.min}g)</p>}
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{formatGrams(stats.totalHistorico)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px", height: "6px", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: "8px", background: nivel.color, width: `${progreso}%`, transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* Stats principales */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {[
          { label: "Este mes",  value: formatGrams(stats.totalMes),       sub: `#${stats.posicionMes} del club` },
          { label: "Este Año",  value: formatGrams(stats.totalAnio),      sub: `#${stats.posicionAnio} del club` },
          { label: "Historico", value: formatGrams(stats.totalHistorico), sub: `#${stats.posicionHistorico} del club` },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "12px 8px", textAlign: "center" }}>
            <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px" }}>{s.label}</p>
            <p style={{ fontSize: "15px", fontWeight: 800, color: "white", margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: "9px", color: "#4d7a46", margin: "3px 0 0" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Visitas y geneticas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "12px", textAlign: "center" }}>
          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px" }}>Visitas</p>
          <p style={{ fontSize: "24px", fontWeight: 800, color: "white", margin: 0 }}>{stats.visitasTotal}</p>
          <p style={{ fontSize: "9px", color: "#4d7a46", margin: "3px 0 0" }}>{stats.visitasMes} este mes</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "12px", textAlign: "center" }}>
          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px" }}>Geneticas</p>
          <p style={{ fontSize: "24px", fontWeight: 800, color: "white", margin: 0 }}>{stats.geneticasProbadas}</p>
          {stats.geneticaFavorita && <p style={{ fontSize: "9px", color: "#4d7a46", margin: "3px 0 0" }}>{stats.geneticaFavorita}</p>}
        </div>
      </div>

      {/* Insignias */}
      {insignias.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "#d97706", marginBottom: "10px", textTransform: "uppercase" }}>Insignias</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {insignias.map(ins => (
              <div key={ins.id} style={{ background: "rgba(217,119,6,0.15)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: "12px", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "11px", color: "#fcd34d" }}>{ins.icon}</span>
                <span style={{ fontSize: "10px", color: "#fcd34d", fontWeight: 500 }}>{ins.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top del mes */}
      {topMes.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "#7c3aed", marginBottom: "10px", textTransform: "uppercase" }}>Top del mes</p>
          {topMes.map((p: any, i: number) => {
            const medals = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"]
            const isMe = p.patient_id === patientId
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < topMes.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px" }}>{medals[i]}</span>
                  <span style={{ fontSize: "12px", fontWeight: isMe ? 700 : 400, color: isMe ? "#7dc264" : "white" }}>{p.full_name.split(" ")[0]}{isMe ? " (vos)" : ""}</span>
                </div>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{formatGrams(p.total_grams)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}