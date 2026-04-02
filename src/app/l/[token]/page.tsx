import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDate } from "@/lib/utils"

const TIMELINE_STEPS = [
  { key: "seedling_date",     label: "Plantines",  color: "#2d5a27" },
  { key: "veg_date",          label: "Vegetativo", color: "#2d5a27" },
  { key: "pruning_date",      label: "Poda",       color: "#2d5a27" },
  { key: "flower_date",       label: "Floracion",  color: "#7c3aed" },
  { key: "harvest_date",      label: "Cosecha",    color: "#d97706" },
  { key: "drying_start_date", label: "Secado",     color: "#ea580c" },
  { key: "curing_start_date", label: "Curado",     color: "#ca8a04" },
]

const STRAIN_LABELS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  indica:         { label: "Indica",                     bg: "rgba(88,28,135,0.5)",  color: "#d8b4fe", border: "rgba(147,51,234,0.4)" },
  sativa:         { label: "Sativa",                     bg: "rgba(120,53,15,0.5)",  color: "#fcd34d", border: "rgba(217,119,6,0.4)" },
  hibrida:        { label: "Hibrida",                    bg: "rgba(6,78,59,0.5)",    color: "#6ee7b7", border: "rgba(16,185,129,0.4)" },
  hibrida_indica: { label: "Hibrida / Indica",           bg: "rgba(88,28,135,0.4)",  color: "#d8b4fe", border: "rgba(147,51,234,0.3)" },
  hibrida_sativa: { label: "Hibrida / Sativa",           bg: "rgba(120,53,15,0.4)",  color: "#fcd34d", border: "rgba(217,119,6,0.3)" },
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

  const steps = TIMELINE_STEPS.map((step, i) => {
    const date = (lot as any)[step.key]
    const nextStep = TIMELINE_STEPS[i + 1]
    const nextDate = nextStep ? (lot as any)[nextStep.key] : null
    const days = date && nextDate
      ? Math.round((new Date(nextDate).getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
      : null
    return { ...step, date, days }
  })

  const completedSteps = steps.filter(s => s.date).length

  return (
    <div style={{ minHeight: "100vh", background: "#080f09", color: "white", fontFamily: "system-ui, sans-serif" }}>

      {/* Hero */}
      <div style={{ position: "relative", height: "220px", overflow: "hidden" }}>
        {genetic?.photo_url
          ? <img src={genetic.photo_url} alt={genetic.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
          : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #0f2412, #080f09)" }} />
        }
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #080f09 0%, rgba(8,15,9,0.5) 50%, transparent 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 20px 20px" }}>
          {strain && (
            <span style={{ display: "inline-block", background: strain.bg, color: strain.color, border: `1px solid ${strain.border}`, borderRadius: "20px", fontSize: "11px", fontWeight: 600, padding: "3px 12px", marginBottom: "8px", letterSpacing: "0.3px" }}>
              {strain.label}
            </span>
          )}
          <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.1 }}>{genetic?.name ?? "Flor seca"}</div>
          <div style={{ fontSize: "12px", color: "#4d7a46", marginTop: "4px" }}>Produccion propia · Uso medicinal exclusivo</div>
        </div>
        <div style={{ position: "absolute", top: "16px", right: "16px", width: "36px", height: "36px", borderRadius: "10px", background: "#2d5a27", border: "1px solid #4d8a3d", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: "2px solid #7dc264" }} />
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px", margin: "0 auto" }}>

        {/* THC / CBD */}
        {(genetic?.thc_percentage || genetic?.cbd_percentage) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {genetic?.thc_percentage && (
              <div style={{ background: "rgba(88,28,135,0.25)", border: "1px solid rgba(147,51,234,0.3)", borderRadius: "16px", padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#d8b4fe", marginBottom: "6px" }}>THC</div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "white", lineHeight: 1 }}>{genetic.thc_percentage}<span style={{ fontSize: "16px", opacity: 0.5 }}>%</span></div>
              </div>
            )}
            {genetic?.cbd_percentage && (
              <div style={{ background: "rgba(6,78,59,0.25)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "16px", padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#6ee7b7", marginBottom: "6px" }}>CBD</div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "white", lineHeight: 1 }}>{genetic.cbd_percentage}<span style={{ fontSize: "16px", opacity: 0.5 }}>%</span></div>
              </div>
            )}
          </div>
        )}

        {/* Terpenos */}
        {genetic?.terpenes && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#d97706", marginBottom: "10px" }}>TERPENOS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {genetic.terpenes.split(",").map((t: string, i: number) => (
                <span key={i} style={{ background: "rgba(120,53,15,0.4)", color: "#fcd34d", border: "1px solid rgba(217,119,6,0.3)", borderRadius: "20px", fontSize: "12px", padding: "4px 12px" }}>{t.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {/* Efectos */}
        {genetic?.effects && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#93c5fd", marginBottom: "10px" }}>EFECTOS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {genetic.effects.split(",").map((e: string, i: number) => (
                <span key={i} style={{ background: "rgba(30,58,138,0.4)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "20px", fontSize: "12px", padding: "4px 12px" }}>{e.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {/* Usos medicinales */}
        {genetic?.medical_uses && (
          <div style={{ background: "rgba(6,78,59,0.15)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "16px", padding: "14px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#6ee7b7", marginBottom: "10px" }}>USOS MEDICINALES</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {genetic.medical_uses.split(",").map((u: string, i: number) => (
                <span key={i} style={{ background: "rgba(6,78,59,0.4)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "20px", fontSize: "12px", padding: "4px 12px" }}>{u.trim()}</span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {completedSteps > 0 && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "#4d7a46", marginBottom: "14px" }}>PROCESO DE PRODUCCION</div>
            <div>
              {steps.map((step, i) => (
                <div key={step.key} style={{ display: "flex", gap: "10px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "20px", flexShrink: 0 }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", marginTop: "4px", flexShrink: 0, background: step.date ? step.color : "rgba(255,255,255,0.1)", border: step.date ? "none" : "1px solid rgba(255,255,255,0.15)" }} />
                    {i < steps.length - 1 && <div style={{ width: "1px", flex: 1, background: "rgba(255,255,255,0.06)", minHeight: "20px", margin: "2px 0" }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: step.date ? "white" : "rgba(255,255,255,0.2)" }}>{step.label}</span>
                      {step.date && <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{formatDate(step.date)}</span>}
                    </div>
                    {step.days !== null && step.days > 0 && (
                      <div style={{ fontSize: "11px", color: "#4d7a46", marginTop: "2px" }}>{step.days} dias</div>
                    )}
                    {step.key === "drying_start_date" && (lot as any).drying_days && (
                      <div style={{ fontSize: "11px", color: "#4d7a46", marginTop: "2px" }}>{(lot as any).drying_days} dias de secado</div>
                    )}
                    {step.key === "curing_start_date" && (lot as any).curing_days && (
                      <div style={{ fontSize: "11px", color: "#4d7a46", marginTop: "2px" }}>{(lot as any).curing_days} dias de curado</div>
                    )}
                    {!step.date && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", marginTop: "2px" }}>Pendiente</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", fontFamily: "monospace" }}>
            <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", border: "1.5px solid #4d7a46", marginRight: "6px", verticalAlign: "middle" }} />
            Circulo Esmeralda · {lot.lot_code}
          </div>
        </div>
      </div>
    </div>
  )
}