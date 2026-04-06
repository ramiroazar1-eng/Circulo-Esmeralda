import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import TerpenosChart from "@/components/TerpenosChart"

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: "Pendiente",   color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
  preparando:  { label: "Preparando",  color: "#60a5fa", bg: "rgba(59,130,246,0.15)" },
  listo:       { label: "Listo",       color: "#4ade80", bg: "rgba(34,197,94,0.15)"  },
  entregado:   { label: "Entregado",   color: "#a78bfa", bg: "rgba(139,92,246,0.15)" },
  cancelado:   { label: "Cancelado",   color: "#f87171", bg: "rgba(239,68,68,0.15)"  },
}

const STRAIN_LABELS: Record<string, string> = {
  indica: "Indica", sativa: "Sativa", hibrida: "Hibrida",
  hibrida_indica: "Hibrida / Indica", hibrida_sativa: "Hibrida / Sativa"
}

export default async function PublicOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = await createServiceClient()

  const { data: order } = await service
    .from("orders")
    .select("id, status, grams, created_at, packed_at, delivered_at, delivery_type, patient:patients(full_name), lot:lots(lot_code, genetic:genetics(name)), items:order_items(grams, genetic:genetics(name, thc_percentage, cbd_percentage, terpenes, effects, medical_uses, strain_type, photo_url), lot:lots(lot_code))")
    .eq("qr_token", token)
    .single()

  if (!order) notFound()

  const st = STATUS_LABELS[(order as any).status] ?? STATUS_LABELS.pendiente
  const patient = (order as any).patient
  const items = (order as any).items ?? []
  const totalGrams = items.reduce((acc: number, i: any) => acc + (i.grams ?? 0), 0)
  const multiGenetic = items.length > 1

  return (
    <div style={{ minHeight: "100vh", background: "#080f09", color: "white", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#0f1f12", padding: "32px 20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Circulo Esmeralda</div>
        <div style={{ fontSize: "24px", fontWeight: 800 }}>Tu pedido</div>
        <div style={{ marginTop: "10px", display: "inline-block", padding: "4px 16px", borderRadius: "99px", background: st.bg, color: st.color, fontSize: "12px", fontWeight: 700 }}>{st.label}</div>
      </div>

      <div style={{ padding: "16px", maxWidth: "400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Paciente */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" }}>Socio</p>
          <p style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>{patient?.full_name ?? "-"}</p>
        </div>

        {/* Items */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 10px" }}>Contenido del paquete</p>
          {items.length === 0 ? (
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Sin items</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map((item: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>{item.genetic?.name ?? "Flor seca"}</p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: 0 }}>Lote: {item.lot?.lot_code ?? "-"}</p>
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#4d7a46" }}>{item.grams}g</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Total</span>
                <span style={{ fontSize: "16px", fontWeight: 800, color: "white" }}>{totalGrams}g</span>
              </div>
            </div>
          )}
        </div>

        {/* Ficha por genetica */}
        {items.filter((item: any) => item.genetic).map((item: any, i: number) => {
          const g = item.genetic
          const terpList = g.terpenes ? g.terpenes.split(",").map((t: string) => t.trim()).filter(Boolean) : []
          return (
            <div key={i} style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Foto o gradiente */}
              {g.photo_url ? (
                <div style={{ position: "relative", height: multiGenetic ? "120px" : "180px", overflow: "hidden" }}>
                  <img src={g.photo_url} alt={g.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #080f09 0%, transparent 60%)" }} />
                  <div style={{ position: "absolute", bottom: "12px", left: "14px" }}>
                    <p style={{ fontSize: multiGenetic ? "16px" : "20px", fontWeight: 800, margin: 0 }}>{g.name}</p>
                    {g.strain_type && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: 0 }}>{STRAIN_LABELS[g.strain_type] ?? g.strain_type}</p>}
                  </div>
                </div>
              ) : (
                <div style={{ background: "rgba(255,255,255,0.04)", padding: "14px" }}>
                  <p style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 2px" }}>{g.name}</p>
                  {g.strain_type && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0 }}>{STRAIN_LABELS[g.strain_type] ?? g.strain_type}</p>}
                </div>
              )}
              <div style={{ padding: "14px", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* THC / CBD */}
                {(g.thc_percentage || g.cbd_percentage) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {g.thc_percentage && (
                      <div style={{ background: "rgba(88,28,135,0.25)", border: "1px solid rgba(147,51,234,0.3)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "#d8b4fe", marginBottom: "4px" }}>THC</div>
                        <div style={{ fontSize: "26px", fontWeight: 800, lineHeight: 1 }}>{g.thc_percentage}<span style={{ fontSize: "13px", opacity: 0.5 }}>%</span></div>
                      </div>
                    )}
                    {g.cbd_percentage && (
                      <div style={{ background: "rgba(6,78,59,0.25)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "#6ee7b7", marginBottom: "4px" }}>CBD</div>
                        <div style={{ fontSize: "26px", fontWeight: 800, lineHeight: 1 }}>{g.cbd_percentage}<span style={{ fontSize: "13px", opacity: 0.5 }}>%</span></div>
                      </div>
                    )}
                  </div>
                )}
                {/* Terpenos */}
                {terpList.length > 0 && (
                  <div>
                    <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "#d97706", marginBottom: "10px" }}>TERPENOS</p>
                    <TerpenosChart terpenos={g.terpenes} />
                  </div>
                )}
                {/* Efectos */}
                {g.effects && (
                  <div>
                    <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "#93c5fd", marginBottom: "8px" }}>EFECTOS</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {g.effects.split(",").map((e: string, j: number) => (
                        <span key={j} style={{ background: "rgba(30,58,138,0.4)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "20px", fontSize: "11px", padding: "3px 10px" }}>{e.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Usos medicinales */}
                {g.medical_uses && (
                  <div>
                    <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "#6ee7b7", marginBottom: "8px" }}>USOS MEDICINALES</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {g.medical_uses.split(",").map((u: string, j: number) => (
                        <span key={j} style={{ background: "rgba(6,78,59,0.4)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "20px", fontSize: "11px", padding: "3px 10px" }}>{u.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Timeline */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 10px" }}>Timeline</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Pedido</span>
              <span style={{ fontSize: "12px" }}>{new Date((order as any).created_at).toLocaleDateString("es-AR")}</span>
            </div>
            {(order as any).packed_at && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Empaquetado</span>
                <span style={{ fontSize: "12px" }}>{new Date((order as any).packed_at).toLocaleDateString("es-AR")}</span>
              </div>
            )}
            {(order as any).delivered_at && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Entregado</span>
                <span style={{ fontSize: "12px" }}>{new Date((order as any).delivered_at).toLocaleDateString("es-AR")}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", fontFamily: "monospace" }}>Circulo Esmeralda · Uso medicinal exclusivo</p>
        </div>
      </div>
    </div>
  )
}