"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatGrams } from "@/lib/utils"
import { Package, Clock, CheckCircle2, Truck, X, ChevronDown, Printer } from "lucide-react"

interface Order {
  id: string
  status: string
  grams: number
  product_desc: string
  notes: string | null
  created_at: string
  packed_at: string | null
  lot_id: string | null
  delivery_type: string | null
  delivery_address: string | null
  delivery_phone: string | null
  patient: { full_name: string; dni: string } | null
  genetic: { name: string } | null
  lot: { lot_code: string } | null
  created_by_profile: { full_name: string } | null
}

interface LotOption {
  lot_id: string
  lot_code: string
  available_grams: number
  genetic_name: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  nuevo:                { label: "Nuevo",          color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  pendiente_aprobacion: { label: "Pendiente",       color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  aprobado:             { label: "Aprobado",        color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
  en_preparacion:       { label: "Preparando",      color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  empaquetado:          { label: "Empaquetado",     color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  entregado:            { label: "Entregado",       color: "text-slate-600",  bg: "bg-slate-50",  border: "border-slate-200" },
  cancelado:            { label: "Cancelado",       color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200" },
}

const NEXT_STATUS: Record<string, string> = {
  nuevo: "en_preparacion",
  pendiente_aprobacion: "aprobado",
  aprobado: "en_preparacion",
  en_preparacion: "empaquetado",
  empaquetado: "entregado",
}

const NEXT_STATUS_LABEL: Record<string, string> = {
  nuevo: "Iniciar preparacion",
  pendiente_aprobacion: "Aprobar pedido",
  aprobado: "Iniciar preparacion",
  en_preparacion: "Marcar empaquetado",
  empaquetado: "Marcar entregado",
}

export default function OrdersPanel({ lots }: { lots: LotOption[] }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("activos")
  const [assigningLot, setAssigningLot] = useState<string | null>(null)
  const [selectedLot, setSelectedLot] = useState<Record<string, string>>({})
  const [prevActiveCount, setPrevActiveCount] = useState<number | null>(null)
  const [newOrderAlert, setNewOrderAlert] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function loadOrders() {
      const { data } = await supabase
        .from("orders")
        .select("*, patient:patients(full_name, dni), lot:lots(lot_code), created_by_profile:profiles!orders_created_by_fkey(full_name), items:order_items(grams, lot:lots(lot_code), genetic:genetics(name))")
        .order("created_at", { ascending: false })
        .limit(50)
      const newData = (data ?? []) as Order[]
      const activeCount = newData.filter(o => !["entregado","cancelado"].includes(o.status)).length
      
      setPrevActiveCount(prev => {
        if (prev !== null && activeCount > prev) {
          // Nuevo pedido detectado
          setNewOrderAlert(true)
          setTimeout(() => setNewOrderAlert(false), 5000)
          // Sonido
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.setValueAtTime(880, ctx.currentTime)
            osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.4)
          } catch(e) {}
          // Push notification
          if (Notification.permission === "granted") {
            new Notification("Nuevo pedido", {
              body: `Hay ${activeCount} pedido${activeCount !== 1 ? "s" : ""} activo${activeCount !== 1 ? "s" : ""}`,
              icon: "/favicon.ico"
            })
          }
        }
        return activeCount
      })
      
      setOrders(newData)
      setLoading(false)
    }

    loadOrders()
    const interval = setInterval(loadOrders, 3000)
    return () => clearInterval(interval)
  }, [])

  async function updateStatus(orderId: string, status: string, lotId?: string) {
    const res = await fetch("/api/orders/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, status, lot_id: lotId })
    })
    if (!res.ok) {
      const data = await res.json()
      alert(data.error)
    }
  }

  function printLabel(orderId: string) {
    window.open(`/api/orders/label?id=${orderId}`, "_blank")
  }

  const filtered = orders.filter(o => {
    if (filter === "activos") return !["entregado","cancelado"].includes(o.status)
    if (filter === "entregado") return o.status === "entregado"
    if (filter === "cancelado") return o.status === "cancelado"
    return true
  })

  const counts = {
    activos: orders.filter(o => !["entregado","cancelado"].includes(o.status)).length,
    entregado: orders.filter(o => o.status === "entregado").length,
    cancelado: orders.filter(o => o.status === "cancelado").length,
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-slate-400">Cargando pedidos...</p></div>

  return (
    <div className="space-y-4">

      {/* Alerta nuevo pedido */}
      {newOrderAlert && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 animate-pulse">
          <span className="text-xl">??</span>
          <p className="text-sm font-semibold text-blue-700">Nuevo pedido recibido</p>
        </div>
      )}

      {/* Boton notificaciones */}
      {typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "default" && (
        <button onClick={() => Notification.requestPermission()}
          className="w-full text-xs text-slate-500 border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
          ?? Activar notificaciones del navegador
        </button>
      )}

      {/* Stats rapidas */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { key: "activos", label: "Activos", icon: Clock, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { key: "entregado", label: "Entregados hoy", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { key: "cancelado", label: "Cancelados", icon: X, color: "text-red-500", bg: "bg-red-50 border-red-200" },
        ].map(s => (
          <div key={s.key} className={`rounded-xl border p-4 cursor-pointer ${filter === s.key ? s.bg : "bg-white border-slate-200"}`} onClick={() => setFilter(s.key)}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-2xl font-black mt-1 ${filter === s.key ? s.color : "text-slate-900"}`}>{counts[s.key as keyof typeof counts]}</p>
          </div>
        ))}
        <div className="rounded-xl border bg-white border-slate-200 p-4 cursor-pointer" onClick={() => setFilter("todos")}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Todos</p>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black mt-1 text-slate-900">{orders.length}</p>
        </div>
      </div>

      {/* Lista de pedidos */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No hay pedidos en esta categoria</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.nuevo
            const nextStatus = NEXT_STATUS[order.status]
            const nextLabel = NEXT_STATUS_LABEL[order.status]
            const needsLot = false

            return (
              <div key={order.id} className={`bg-white border rounded-xl p-4 ${statusCfg.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                        {statusCfg.label}
                      </span>
                      <span className="text-xs font-mono text-slate-400">#{order.id.substring(0, 8).toUpperCase()}</span>
                      <span className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString("es-AR")}</span>
                    </div>
                    <p className="text-base font-bold text-[#1a2e1a]">{order.patient?.full_name ?? "—"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-black text-[#1a2e1a]">{formatGrams(order.grams)}</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      {((order as any).items ?? []).map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] rounded-full px-2 py-0.5">{item.genetic?.name ?? "Sin genetica"}</span>
                          <span className="text-xs font-black text-[#1a2e1a]">{formatGrams(item.grams)}</span>
                          {item.lot ? (
                            <span className="text-xs font-mono bg-slate-100 text-slate-600 rounded px-2 py-0.5">{item.lot.lot_code}</span>
                          ) : (
                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">Sin lote</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {order.delivery_type === "envio" && (
                      <div className="mt-1 text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1">
                        <span className="font-semibold text-blue-700">Envio: </span>
                        <span className="text-blue-600">{order.delivery_address}</span>
                        {order.delivery_phone && <span className="text-blue-500"> - Tel: {order.delivery_phone}</span>}
                      </div>
                    )}
                    {order.notes && <p className="text-xs text-slate-500 mt-1 italic">{order.notes}</p>}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => printLabel(order.id)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 transition-colors">
                      <Printer className="w-3 h-3" />Etiqueta
                    </button>
                    {order.status !== "entregado" && order.status !== "cancelado" && (
                      <button onClick={() => updateStatus(order.id, "cancelado")} className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-2 py-1.5 transition-colors">
                        <X className="w-3 h-3" />Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* Asignar lote si es necesario */}
                {needsLot && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-2">Asignar lote antes de preparar:</p>
                    <div className="flex gap-2">
                      <select
                        className="input-ong flex-1 text-xs"
                        value={selectedLot[order.id] ?? ""}
                        onChange={e => setSelectedLot(prev => ({ ...prev, [order.id]: e.target.value }))}
                      >
                        <option value="">Seleccionar lote...</option>
                        {lots.map(l => (
                          <option key={l.lot_id} value={l.lot_id}>
                            {l.lot_code} — {l.genetic_name ?? "Sin genetica"} — {formatGrams(l.available_grams)}
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={!selectedLot[order.id]}
                        onClick={() => updateStatus(order.id, "en_preparacion", selectedLot[order.id])}
                        className="text-xs bg-[#2d5a27] text-white rounded-lg px-3 py-1.5 disabled:opacity-50 hover:bg-[#3b6d30] transition-colors"
                      >
                        Preparar
                      </button>
                    </div>
                  </div>
                )}

                {/* Boton de avance de estado */}
                {nextStatus && !needsLot && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => updateStatus(order.id, nextStatus)}
                      className="w-full text-xs font-semibold bg-[#2d5a27] text-white rounded-lg px-3 py-2 hover:bg-[#3b6d30] transition-colors flex items-center justify-center gap-2"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      {nextLabel}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}





