"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { TrendingUp, AlertCircle, Loader2, X, Check } from "lucide-react"

interface Plan {
  id: string
  name: string
  monthly_grams: number
  monthly_amount: number
}

interface PlanRequest {
  id: string
  request_type: string
  status: string
  requested_grams: number | null
  requested_plan: { name: string } | null
  created_at: string
}

export default function PlanRequestWidget({ 
  patientId, 
  currentPlanId,
  currentPlanGrams,
  usedGrams
}: { 
  patientId: string
  currentPlanId: string | null
  currentPlanGrams: number | null
  usedGrams: number
}) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [pendingRequest, setPendingRequest] = useState<PlanRequest | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [requestType, setRequestType] = useState<"upgrade" | "exception">("upgrade")
  const [selectedPlan, setSelectedPlan] = useState("")
  const [requestedGrams, setRequestedGrams] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const [plansRes, requestRes] = await Promise.all([
        supabase.from("membership_plans").select("id, name, monthly_grams, monthly_amount").eq("is_active", true).order("monthly_grams"),
        supabase.from("plan_requests").select("*, requested_plan:membership_plans(name)").eq("patient_id", patientId).eq("status", "pendiente").maybeSingle()
      ])
      setPlans((plansRes.data ?? []) as Plan[])
      setPendingRequest(requestRes.data as PlanRequest | null)
    }
    load()
  }, [patientId, success])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError(null)
    const res = await fetch("/api/plan-requests/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        request_type: requestType,
        requested_plan_id: requestType === "upgrade" ? selectedPlan : null,
        requested_grams: requestType === "exception" ? parseFloat(requestedGrams) : null,
        reason
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSubmitting(false); return }
    setSuccess(true); setShowForm(false); setSubmitting(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  const upgradeOptions = plans.filter(p => p.id !== currentPlanId)
  const isOverLimit = true // Siempre mostrar opciones

  if (pendingRequest) {
    return (
      <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "16px", padding: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <AlertCircle size={14} color="#fbbf24" />
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "1px" }}>Solicitud pendiente</p>
        </div>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>
          {pendingRequest.request_type === "upgrade" 
            ? `Cambio al plan ${pendingRequest.requested_plan?.name ?? "—"}` 
            : `Excepcion de ${pendingRequest.requested_grams}g`}
        </p>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>En revision por el equipo</p>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "16px", padding: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Check size={16} color="#4ade80" />
        <p style={{ fontSize: "13px", color: "#4ade80" }}>Solicitud enviada correctamente</p>
      </div>
    )
  }

  if (!isOverLimit && !showForm) return null

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
      {!showForm ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <TrendingUp size={14} color="#a8e095" />
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#a8e095" }}>Gestionar mi plan</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button onClick={() => { setRequestType("upgrade"); setShowForm(true) }}
              style={{ background: "#2d5a27", color: "#a8e095", border: "1px solid #4d8a3d", borderRadius: "10px", padding: "10px 8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <TrendingUp size={13} />Cambiar plan
            </button>
            <button onClick={() => { setRequestType("exception"); setShowForm(true) }}
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px 8px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
              Solicitar excepcion
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>
              {requestType === "upgrade" ? "Cambiar de plan" : "Solicitar excepcion"}
            </p>
            <button onClick={() => { setShowForm(false); setError(null) }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>

          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#f87171", marginBottom: "10px" }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {requestType === "upgrade" ? (
              <div>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Plan disponibles</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {upgradeOptions.map(plan => (
                    <label key={plan.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: selectedPlan === plan.id ? "rgba(45,90,39,0.3)" : "rgba(255,255,255,0.04)", border: `1px solid ${selectedPlan === plan.id ? "#4d8a3d" : "rgba(255,255,255,0.08)"}`, borderRadius: "10px", padding: "10px 12px", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input type="radio" name="plan" value={plan.id} checked={selectedPlan === plan.id} onChange={() => setSelectedPlan(plan.id)} style={{ accentColor: "#4d8a3d" }} />
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>{plan.name}</p>
                          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{plan.monthly_grams}g por mes</p>
                        </div>
                      </div>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#4ade80" }}>${plan.monthly_amount?.toLocaleString("es-AR")}/mes</p>
                    </label>
                  ))}
                </div>
                {currentPlanGrams && selectedPlan && (
                  <div style={{ background: "rgba(45,90,39,0.2)", border: "1px solid rgba(77,138,61,0.3)", borderRadius: "8px", padding: "8px 12px", marginTop: "8px", fontSize: "11px", color: "#a8e095" }}>
                    El nuevo plan aplica desde el proximo mes. Los {Math.max(usedGrams - currentPlanGrams, 0)}g extra de este mes se descuentan del proximo.
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Gramos extra solicitados</p>
                <input type="number" step="0.1" min="1" value={requestedGrams} onChange={e => setRequestedGrams(e.target.value)} required placeholder="0.0"
                  style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
              </div>
            )}

            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Motivo</p>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Explicá brevemente el motivo de tu solicitud..." rows={2}
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none", resize: "none" }} />
            </div>

            <button type="submit" disabled={submitting || (requestType === "upgrade" && !selectedPlan)}
              style={{ width: "100%", background: "#2d5a27", color: "#a8e095", border: "none", borderRadius: "10px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
              {submitting ? "Enviando..." : "Enviar solicitud"}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
