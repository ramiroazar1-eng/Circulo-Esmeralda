"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"

export default function DeliveryOrderCard({ order, deliveredBy }: { order: any; deliveredBy: string }) {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 4) { setError("El código debe tener 4 dígitos"); return }
    setLoading(true); setError(null)
    const res = await fetch("/api/orders/confirm-delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id, delivery_code: code })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Código incorrecto"); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.refresh(), 1500)
  }

  if (success) return (
    <div className="bg-white rounded-xl border border-green-200 p-5 flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-green-800">Entrega confirmada</p>
        <p className="text-xs text-green-600">{order.patient?.full_name}</p>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <p className="font-semibold text-slate-900 text-base mb-1">{order.patient?.full_name ?? "-"}</p>
        {order.patient?.phone && (
          <a href={`tel:${order.patient.phone}`} className="text-xs text-blue-600 block mb-1">{order.patient.phone}</a>
        )}
        {order.patient?.address && (
          <p className="text-xs text-slate-500 mb-2">{order.patient.address}</p>
        )}
        <div className="flex flex-wrap gap-1 mb-3">
          {order.order_items?.map((item: any) => (
            <span key={item.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {item.genetic?.name ?? "-"} · {item.grams}g
            </span>
          ))}
        </div>
        <form onSubmit={handleConfirm} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Código del paciente (4 dígitos)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              className="w-full text-center text-2xl font-mono font-bold border border-slate-200 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 tracking-widest"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 4}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {loading ? "Confirmando..." : "Confirmar entrega"}
          </button>
        </form>
      </div>
    </div>
  )
}
