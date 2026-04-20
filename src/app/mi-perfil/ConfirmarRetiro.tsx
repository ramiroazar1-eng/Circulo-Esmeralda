"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Package, Loader2 } from "lucide-react"

interface Props {
  pendingDispenses: {
    id: string
    dispense_id: string
    grams: number
    genetic_name: string
    lot_code: string
  }[]
}

export default function ConfirmarRetiro({ pendingDispenses }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<string[]>([])
  const router = useRouter()

  async function handleConfirm(dispense_id: string) {
    setLoading(dispense_id)
    const res = await fetch("/api/dispenses/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dispense_id })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? "Error al confirmar"); setLoading(null); return }
    setConfirmed(prev => [...prev, dispense_id])
    setLoading(null)
    router.refresh()
  }

  const pending = pendingDispenses.filter(d => !confirmed.includes(d.dispense_id))
  if (pending.length === 0) return null

  return (
    <div style={{
      background: "#1A2018",
      borderRadius: "16px",
      padding: "16px",
      marginBottom: "4px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: "#C4956A", flexShrink: 0,
          boxShadow: "0 0 0 3px rgba(196,149,106,0.2)"
        }} />
        <p style={{ fontSize: "13px", fontWeight: 500, color: "#F0F0EE" }}>
          {pending.length === 1 ? "Tenés un retiro para confirmar" : `Tenés ${pending.length} retiros para confirmar`}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {pending.map(d => (
          <div key={d.dispense_id} style={{
            background: "rgba(255,255,255,0.05)",
            border: "0.5px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "12px 14px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Package style={{ width: "14px", height: "14px", color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "#F0F0EE" }}>
                  {d.grams}g · {d.genetic_name}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                  {d.lot_code}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleConfirm(d.dispense_id)}
              disabled={loading === d.dispense_id}
              style={{
                width: "100%",
                background: "#5C7A5C",
                border: "none",
                borderRadius: "10px",
                padding: "11px",
                fontSize: "13px",
                fontWeight: 500,
                color: "white",
                cursor: loading === d.dispense_id ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                opacity: loading === d.dispense_id ? 0.7 : 1
              }}
            >
              {loading === d.dispense_id
                ? <><Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" />Confirmando...</>
                : <><CheckCircle2 style={{ width: "14px", height: "14px" }} />Confirmar que recibí</>
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
