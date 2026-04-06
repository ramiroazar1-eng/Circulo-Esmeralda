import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: "Pendiente",   color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
  preparando:  { label: "Preparando",  color: "#60a5fa", bg: "rgba(59,130,246,0.15)" },
  listo:       { label: "Listo",       color: "#4ade80", bg: "rgba(34,197,94,0.15)"  },
  entregado:   { label: "Entregado",   color: "#a78bfa", bg: "rgba(139,92,246,0.15)" },
  cancelado:   { label: "Cancelado",   color: "#f87171", bg: "rgba(239,68,68,0.15)"  },
}

export default async function PublicOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = await createServiceClient()

  const { data: order } = await service
    .from("orders")
    .select("id, status, grams, created_at, packed_at, delivered_at, delivery_type, patient:patients(full_name), lot:lots(lot_code, genetic:genetics(name)), items:order_items(grams, genetic:genetics(name), lot:lots(lot_code))")
    .eq("qr_token", token)
    .single()

  if (!order) notFound()

  const st = STATUS_LABELS[(order as any).status] ?? STATUS_LABELS.pendiente
  const patient = (order as any).patient
  const items = (order as any).items ?? []
  const totalGrams = items.reduce((acc: number, i: any) => acc + (i.grams ?? 0), 0)

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

        {/* Fechas */}
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