"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatGrams } from "@/lib/utils"
import { ShoppingBag, Clock, CheckCircle2, Package, X, Plus, Loader2 } from "lucide-react"

interface GeneticOption {
  genetic_id: string
  genetic_name: string
  total_available: number
}

interface Order {
  id: string
  status: string
  grams: number
  product_desc: string
  created_at: string
  genetic: { name: string } | null
  lot: { lot_code: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nuevo:                { label: "Nuevo",       color: "text-blue-600",   bg: "bg-blue-50" },
  pendiente_aprobacion: { label: "Pendiente",    color: "text-amber-600",  bg: "bg-amber-50" },
  aprobado:             { label: "Aprobado",     color: "text-green-600",  bg: "bg-green-50" },
  en_preparacion:       { label: "Preparando",   color: "text-purple-600", bg: "bg-purple-50" },
  empaquetado:          { label: "Listo",        color: "text-orange-600", bg: "bg-orange-50" },
  entregado:            { label: "Entregado",    color: "text-slate-500",  bg: "bg-slate-50" },
  cancelado:            { label: "Cancelado",    color: "text-red-500",    bg: "bg-red-50" },
}

export default function PedidosWidget({ patientId, monthlyLimit, usedGrams }: { patientId: string; monthlyLimit: number | null; usedGrams: number }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [genetics, setGenetics] = useState<GeneticOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGenetic, setSelectedGenetic] = useState("")
  const [grams, setGrams] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const [ordersRes, geneticsRes] = await Promise.all([
        supabase.from("orders")
          .select("*, genetic:genetics(name), lot:lots(lot_code)")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("v_stock_available")
          .select("lot_id, lot_code, available_grams, genetic_name, genetic_id")
          .gt("available_grams", 0)
      ])

      setOrders((ordersRes.data ?? []) as Order[])

      // Agrupar por genetica
      const grouped: Record<string, GeneticOption> = {}
      for (const row of (geneticsRes.data ?? []) as any[]) {
        if (!row.genetic_id) continue
        if (!grouped[row.genetic_id]) {
          grouped[row.genetic_id] = { genetic_id: row.genetic_id, genetic_name: row.genetic_name ?? "Sin nombre", total_available: 0 }
        }
        grouped[row.genetic_id].total_available += parseFloat(row.available_grams)
      }
      setGenetics(Object.values(grouped))
      setLoading(false)
    }

    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [patientId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGenetic || !grams) return
    setSubmitting(true); setError(null)

    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId, genetic_id: selectedGenetic, grams: parseFloat(grams), notes: notes || null })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSubmitting(false); return }
    setShowForm(false); setSelectedGenetic(""); setGrams(""); setNotes("")
    setSubmitting(false)
  }

  async function cancelOrder(orderId: string) {
    if (!confirm("Cancelar este pedido?")) return
    await fetch("/api/orders/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, status: "cancelado" })
    })
  }

  const availableGrams = monthlyLimit ? monthlyLimit - usedGrams : null
  const activeOrders = orders.filter(o => !["entregado","cancelado"].includes(o.status))

  if (loading) return null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Header con limite mensual */}
      {monthlyLimit && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px" }}>Disponible este mes</p>
            <p style={{ fontSize: "13px", fontWeight: 700, color: availableGrams && availableGrams > 0 ? "#4ade80" : "#f87171" }}>
              {availableGrams !== null ? formatGrams(Math.max(availableGrams, 0)) : "—"} de {formatGrams(monthlyLimit)}
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px", height: "6px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: availableGrams && availableGrams > monthlyLimit * 0.3 ? "#4ade80" : "#f87171", borderRadius: "8px", width: `${Math.min((usedGrams / monthlyLimit) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Pedidos activos */}
      {activeOrders.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Mis pedidos activos</p>
          {activeOrders.map(order => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.nuevo
            return (
              <div key={order.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>{cfg.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>{formatGrams(order.grams)}</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{order.genetic?.name ?? "Sin especificar"}</p>
                </div>
                {["nuevo","pendiente_aprobacion"].includes(order.status) && (
                  <button onClick={() => cancelOrder(order.id)} style={{ fontSize: "11px", color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "4px 10px", cursor: "pointer" }}>
                    Cancelar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Formulario nuevo pedido */}
      {showForm ? (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>Nuevo pedido</p>
            <button onClick={() => { setShowForm(false); setError(null) }} style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>
          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#f87171", marginBottom: "10px" }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Genetica</p>
              <select value={selectedGenetic} onChange={e => setSelectedGenetic(e.target.value)} required
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }}>
                <option value="" style={{ background: "#0f1f12" }}>Seleccionar genetica...</option>
                {genetics.map(g => (
                  <option key={g.genetic_id} value={g.genetic_id} style={{ background: "#0f1f12" }}>
                    {g.genetic_name} — Disponible: {formatGrams(g.total_available)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Gramos</p>
              <input type="number" step="0.1" min="0.1" max={availableGrams ?? undefined} value={grams} onChange={e => setGrams(e.target.value)} required placeholder="0.0"
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
            </div>
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Notas (opcional)</p>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..."
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
            </div>
            <button type="submit" disabled={submitting}
              style={{ width: "100%", background: "#2d5a27", color: "#a8e095", border: "none", borderRadius: "10px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
              {submitting ? "Enviando..." : "Confirmar pedido"}
            </button>
          </form>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          disabled={availableGrams !== null && availableGrams <= 0}
          style={{ width: "100%", background: availableGrams !== null && availableGrams <= 0 ? "rgba(255,255,255,0.04)" : "#2d5a27", color: availableGrams !== null && availableGrams <= 0 ? "rgba(255,255,255,0.3)" : "#a8e095", border: `1px solid ${availableGrams !== null && availableGrams <= 0 ? "rgba(255,255,255,0.08)" : "#4d8a3d"}`, borderRadius: "14px", padding: "14px", fontSize: "13px", fontWeight: 700, cursor: availableGrams !== null && availableGrams <= 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <Plus size={16} />
          {availableGrams !== null && availableGrams <= 0 ? "Limite mensual alcanzado" : "Hacer un pedido"}
        </button>
      )}
    </div>
  )
}
