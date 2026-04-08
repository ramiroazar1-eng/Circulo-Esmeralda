"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { MapPin, Phone, Package, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"

interface OrderItem { id: string; grams: number; genetic?: { name: string } | null }
interface Patient { id: string; full_name: string; phone?: string | null; address?: string | null }
interface Order {
  id: string
  status: string
  created_at: string
  delivery_notes?: string | null
  patient?: Patient | null
  order_items?: OrderItem[]
}

export default function DeliveryOrderCard({ order, deliveredBy }: { order: Order; deliveredBy: string }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEntregado() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase
      .from("orders")
      .update({
        status: "entregado",
        delivered_by: deliveredBy,
        delivery_notes: notes || null,
      })
      .eq("id", order.id)

    if (error) {
      setError("Error al actualizar. Intenta de nuevo.")
      setLoading(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900 text-base">{order.patient?.full_name ?? "-"}</p>
            <div className="mt-1 space-y-0.5">
              {order.patient?.phone && (
                <a href={`tel:${order.patient.phone}`} className="flex items-center gap-1.5 text-xs text-blue-600">
                  <Phone className="w-3 h-3" />{order.patient.phone}
                </a>
              )}
              {order.patient?.address && (
                <div className="flex items-start gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />{order.patient.address}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-slate-400 mt-0.5">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {order.order_items?.map(item => (
            <span key={item.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Package className="w-2.5 h-2.5" />{item.genetic?.name ?? "-"} - {item.grams}g
            </span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Observaciones (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: Recibio el vecino, timbre roto..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleEntregado}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? "Registrando..." : "Marcar como entregado"}
          </button>
        </div>
      )}
    </div>
  )
}