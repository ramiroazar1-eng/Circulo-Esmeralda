"use client"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:            { label: "Pendiente",   color: "#f87171", bg: "rgba(239,68,68,0.1)" },
  pendiente_aprobacion: { label: "En revision", color: "#fbbf24", bg: "rgba(245,158,11,0.1)" },
  pagado:               { label: "Pagado",      color: "#4ade80", bg: "rgba(34,197,94,0.1)" },
  vencido:              { label: "Vencido",     color: "#f87171", bg: "rgba(239,68,68,0.15)" },
  exento:               { label: "Exento",      color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
}

export default function CuotasWidget({ patientId }: { patientId: string }) {
  const [periods, setPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from("membership_periods")
      .select("id, period_year, period_month, amount, payment_status, paid_at, comprobante_url, comprobante_uploaded_at")
      .eq("patient_id", patientId)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(24)
    setPeriods(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [patientId])

  async function handleUpload(periodId: string, file: File) {
    setUploading(periodId)
    setError(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("period_id", periodId)
    const res = await fetch("/api/payments/upload-comprobante", { method: "POST", body: fd })
    const json = await res.json()
    if (!res.ok) setError(json.error ?? "Error al subir")
    else await load()
    setUploading(null)
  }

  if (loading) return null

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px", marginTop: "12px" }}>
      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Mis cuotas</p>
      {error && <p style={{ fontSize: "11px", color: "#f87171", marginBottom: "8px" }}>{error}</p>}
      {periods.length === 0 ? (
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Sin cuotas registradas</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {periods.map((p: any) => {
            const st = STATUS_LABEL[p.payment_status] ?? STATUS_LABEL.pendiente
            const canUpload = p.payment_status === "pendiente"
            const isUploading = uploading === p.id
            const borderColor = st.color + "33"
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "10px", background: st.bg, border: "1px solid " + borderColor }}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>{MONTHS[p.period_month - 1]} {p.period_year}</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                    {p.paid_at ? "Aprobado " + new Date(p.paid_at).toLocaleDateString("es-AR") :
                     p.comprobante_uploaded_at ? "Comprobante enviado " + new Date(p.comprobante_uploaded_at).toLocaleDateString("es-AR") :
                     "$" + parseFloat(p.amount).toLocaleString("es-AR")}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: st.color, padding: "2px 8px", borderRadius: "99px", background: st.color + "22" }}>{st.label}</span>
                  {canUpload && (
                    <>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: "none" }}
                        ref={el => { fileRefs.current[p.id] = el }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(p.id, f) }}
                      />
                      <button
                        onClick={() => fileRefs.current[p.id]?.click()}
                        disabled={isUploading}
                        style={{ fontSize: "10px", padding: "4px 10px", borderRadius: "8px", background: "#2d5a27", color: "white", border: "none", cursor: "pointer", opacity: isUploading ? 0.6 : 1 }}
                      >
                        {isUploading ? "Subiendo..." : "Subir comprobante"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}