"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatGrams } from "@/lib/utils"
import { ShoppingBag, Clock, X, Plus, Loader2, Trash2 } from "lucide-react"

interface GeneticOption {
  genetic_id: string
  genetic_name: string
  total_available: number
}

interface CartItem {
  genetic_id: string
  genetic_name: string
  grams: number
}

interface Order {
  id: string
  status: string
  grams: number
  delivery_type: string | null
  created_at: string
  items: { genetic: { name: string } | null; grams: number }[]
}

const STATUS_CONFIG: Record<string, { label: string }> = {
  nuevo:                { label: "Nuevo" },
  pendiente_aprobacion: { label: "Pendiente" },
  aprobado:             { label: "Aprobado" },
  en_preparacion:       { label: "Preparando" },
  empaquetado:          { label: "Listo para retirar" },
  entregado:            { label: "Entregado" },
  cancelado:            { label: "Cancelado" },
}

const STATUS_COLORS: Record<string, string> = {
  nuevo: "#60a5fa", pendiente_aprobacion: "#fbbf24", aprobado: "#4ade80",
  en_preparacion: "#c084fc", empaquetado: "#fb923c", entregado: "#6b7280", cancelado: "#f87171"
}

export default function PedidosWidget({ patientId, monthlyLimit, usedGrams }: { patientId: string; monthlyLimit: number | null; usedGrams: number }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [genetics, setGenetics] = useState<GeneticOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedGenetic, setSelectedGenetic] = useState("")
  const [itemGrams, setItemGrams] = useState("")
  const [notes, setNotes] = useState("")
  const [deliveryType, setDeliveryType] = useState<"retiro" | "envio">("retiro")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [deliveryPhone, setDeliveryPhone] = useState("")

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const [ordersRes, geneticsRes] = await Promise.all([
        supabase.from("orders")
          .select("*, items:order_items(grams, genetic:genetics(name))")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("v_stock_available")
          .select("lot_id, available_grams, genetic_name, genetic_id")
          .gt("available_grams", 0)
      ])

      setOrders((ordersRes.data ?? []) as any)

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

  function addToCart() {
    if (!selectedGenetic || !itemGrams || parseFloat(itemGrams) <= 0) return
    const genetic = genetics.find(g => g.genetic_id === selectedGenetic)
    if (!genetic) return
    if (parseFloat(itemGrams) > genetic.total_available) {
      setError(`Stock insuficiente. Maximo disponible: ${genetic.total_available.toFixed(1)}g`)
      return
    }
    setError(null)
    const existing = cart.find(c => c.genetic_id === selectedGenetic)
    if (existing) {
      setCart(cart.map(c => c.genetic_id === selectedGenetic ? { ...c, grams: c.grams + parseFloat(itemGrams) } : c))
    } else {
      setCart([...cart, { genetic_id: selectedGenetic, genetic_name: genetic.genetic_name, grams: parseFloat(itemGrams) }])
    }
    setSelectedGenetic(""); setItemGrams("")
  }

  function removeFromCart(genetic_id: string) {
    setCart(cart.filter(c => c.genetic_id !== genetic_id))
  }

  const cartTotal = cart.reduce((acc, c) => acc + c.grams, 0)
  const availableGrams = monthlyLimit ? monthlyLimit - usedGrams : null

  async function cancelOrder(orderId: string) {
    if (!confirm("Cancelar este pedido?")) return
    await fetch("/api/orders/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, status: "cancelado" })
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) { setError("Agrega al menos un item al pedido"); return }
    if (deliveryType === "envio" && !deliveryAddress) { setError("Ingresa la direccion de envio"); return }
    setSubmitting(true); setError(null)

    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        items: cart.map(c => ({ genetic_id: c.genetic_id, grams: c.grams })),
        notes: notes || null,
        delivery_type: deliveryType,
        delivery_address: deliveryType === "envio" ? deliveryAddress : null,
        delivery_phone: deliveryType === "envio" ? deliveryPhone : null
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSubmitting(false); return }
    setShowForm(false); setCart([]); setNotes(""); setDeliveryType("retiro"); setDeliveryAddress(""); setDeliveryPhone("")
    setSubmitting(false)
  }

  const activeOrders = orders.filter(o => !["entregado","cancelado"].includes(o.status))

  if (loading) return null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {monthlyLimit && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px" }}>Disponible este mes</p>
            <p style={{ fontSize: "13px", fontWeight: 700, color: availableGrams !== null && availableGrams > 0 ? "#4ade80" : "#f87171" }}>
              {availableGrams !== null ? formatGrams(Math.max(availableGrams, 0)) : "-"} de {formatGrams(monthlyLimit)}
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "8px", height: "6px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: availableGrams !== null && availableGrams > monthlyLimit * 0.3 ? "#4ade80" : "#f87171", borderRadius: "8px", width: `${Math.min((usedGrams / monthlyLimit) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {activeOrders.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Mis pedidos activos</p>
          {activeOrders.map(order => (
            <div key={order.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: "rgba(255,255,255,0.08)", color: STATUS_COLORS[order.status] ?? "white" }}>
                  {STATUS_CONFIG[order.status]?.label ?? order.status}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "white" }}>{formatGrams(order.grams)}</span>
              </div>
              {order.items?.map((item, i) => (
                <p key={i} style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                  {item.genetic?.name ?? "-"} - {formatGrams(item.grams)}
                </p>
              ))}
              {order.delivery_type === "envio" && (
                <p style={{ fontSize: "11px", color: "#60a5fa", marginTop: "4px" }}>Envio a domicilio</p>
              )}
              {["nuevo", "pendiente_aprobacion"].includes(order.status) && (
                <button onClick={() => cancelOrder(order.id)}
                  style={{ marginTop: "6px", fontSize: "11px", color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "4px 10px", cursor: "pointer" }}>
                  Cancelar pedido
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>Nuevo pedido</p>
            <button onClick={() => { setShowForm(false); setError(null); setCart([]) }} style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>

          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#f87171", marginBottom: "10px" }}>{error}</div>}

          {/* Agregar item al carrito */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "10px", marginBottom: "10px" }}>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Agregar genetica</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px auto", gap: "6px", alignItems: "end" }}>
              <select value={selectedGenetic} onChange={e => setSelectedGenetic(e.target.value)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 10px", fontSize: "12px", color: "white", outline: "none" }}>
                <option value="" style={{ background: "#0f1f12" }}>Seleccionar...</option>
                {genetics.map(g => (
                  <option key={g.genetic_id} value={g.genetic_id} style={{ background: "#0f1f12" }}>
                    {g.genetic_name} ({formatGrams(g.total_available)})
                  </option>
                ))}
              </select>
              <input type="number" step="0.1" min="0.1" value={itemGrams} onChange={e => setItemGrams(e.target.value)} placeholder="g" max={selectedGenetic ? (genetics.find(g => g.genetic_id === selectedGenetic)?.total_available ?? "") : ""}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 10px", fontSize: "12px", color: "white", outline: "none" }} />
              <button type="button" onClick={addToCart} disabled={!selectedGenetic || !itemGrams}
                style={{ background: "#2d5a27", border: "none", borderRadius: "8px", padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: !selectedGenetic || !itemGrams ? 0.5 : 1 }}>
                <Plus size={14} color="#a8e095" />
              </button>
            </div>
          </div>

          {/* Carrito */}
          {cart.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              {cart.map(item => (
                <div key={item.genetic_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <p style={{ fontSize: "13px", color: "white" }}>{item.genetic_name}</p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{formatGrams(item.grams)}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.genetic_id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", fontSize: "12px", fontWeight: 700 }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Total</span>
                <span style={{ color: "white" }}>{formatGrams(cartTotal)}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Tipo de entrega</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {(["retiro", "envio"] as const).map(type => (
                  <button key={type} type="button" onClick={() => setDeliveryType(type)}
                    style={{ background: deliveryType === type ? "rgba(45,90,39,0.4)" : "rgba(255,255,255,0.04)", border: `1px solid ${deliveryType === type ? "#4d8a3d" : "rgba(255,255,255,0.08)"}`, borderRadius: "8px", padding: "8px", fontSize: "12px", fontWeight: 600, color: deliveryType === type ? "#a8e095" : "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                    {type === "retiro" ? "Retiro en local" : "Envio a domicilio"}
                  </button>
                ))}
              </div>
            </div>

            {deliveryType === "envio" && (
              <>
                <div>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Direccion *</p>
                  <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Calle, numero, piso..."
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
                </div>
                <div>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Telefono</p>
                  <input type="tel" value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)} placeholder="11 1234 5678"
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
                </div>
              </>
            )}

            <div>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Notas (opcional)</p>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..."
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "white", outline: "none" }} />
            </div>

            <button type="submit" disabled={submitting || cart.length === 0}
              style={{ width: "100%", background: cart.length === 0 ? "rgba(255,255,255,0.04)" : "#2d5a27", color: cart.length === 0 ? "rgba(255,255,255,0.3)" : "#a8e095", border: "none", borderRadius: "10px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: cart.length === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
              {submitting ? "Enviando..." : `Confirmar pedido${cart.length > 0 ? ` (${formatGrams(cartTotal)})` : ""}`}
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