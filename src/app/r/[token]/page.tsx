"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { CheckCircle2, Loader2, AlertTriangle, CalendarPlus, FlaskConical, ChevronDown, Sprout } from "lucide-react"

const EVENT_TYPES = [
  { value: "riego",       label: "Riego" },
  { value: "nutrientes",  label: "Nutrientes" },
  { value: "poda",        label: "Poda" },
  { value: "defoliacion", label: "Defoliacion" },
  { value: "tratamiento", label: "Tratamiento / preventivo" },
  { value: "transplante", label: "Transplante" },
  { value: "incidente",   label: "Incidente" },
  { value: "descarte",    label: "Descarte parcial" },
  { value: "otro",        label: "Otro" },
]

export default function RoomQRPage() {
  const { token } = useParams() as { token: string }
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<"evento" | "insumo" | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedLotId, setSelectedLotId] = useState("")
  const [eventType, setEventType] = useState("riego")
  const [quantity, setQuantity] = useState("")
  const [products, setProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")

  useEffect(() => {
    fetch(`/api/qr/scan-room?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d); setLoading(false)
        fetch("/api/supplies/products")
          .then(r => r.json())
          .then(p => setProducts(p.data ?? []))
      })
      .catch(() => { setError("Error al cargar la sala"); setLoading(false) })
  }, [token])

  async function handleEventSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true); setSubmitError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/cycles/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle_id: data.active_cycle?.id,
        event_type: eventType,
        event_date: new Date().toISOString().split("T")[0],
        lot_id: selectedLotId || null,
        room_id: data.room.id,
        notes: form.get("notes") || null,
      })
    })
    const result = await res.json()
    if (!res.ok) { setSubmitError(result.error); setSubmitting(false); return }
    setSuccess("Evento registrado")
    setSubmitting(false); setActivePanel(null); setSelectedLotId(""); setEventType("riego")
    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleInsumoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true); setSubmitError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/supplies/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supply_product_id: selectedProductId,
        movement_type: "consumo",
        quantity: parseFloat(quantity),
        cycle_id: data.active_cycle?.id,
        lot_id: selectedLotId || null,
        room_id: data.room.id,
        notes: form.get("notes") || null,
        movement_date: new Date().toISOString().split("T")[0],
      })
    })
    const result = await res.json()
    if (!res.ok) { setSubmitError(result.error); setSubmitting(false); return }
    setSuccess("Insumo registrado")
    setSubmitting(false); setActivePanel(null); setQuantity(""); setSelectedProductId("")
    setTimeout(() => setSuccess(null), 3000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5faf3]">
      <Loader2 className="w-8 h-8 animate-spin text-[#2d5a27]" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5faf3] p-4">
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-slate-700 font-medium">{error}</p>
      </div>
    </div>
  )

  const { room, lots, active_cycle } = data

  return (
    <div className="min-h-screen bg-[#f5faf3]">
      <div className="bg-[#0f1f12] px-5 py-5">
        <p className="text-xs text-[#7a9e74] uppercase tracking-widest">Circulo Esmeralda</p>
        <h1 className="text-2xl font-bold text-white mt-1">{room.name}</h1>
        {active_cycle && <p className="text-sm text-[#7a9e74] mt-0.5">{active_cycle.name}</p>}
        {room.square_meters && <p className="text-xs text-[#4d7a46] mt-0.5">{room.square_meters} m²</p>}
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
        )}

        {lots.length > 0 && (
          <div className="bg-white rounded-xl border border-[#ddecd8] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#eef5ea]">
              <p className="text-sm font-bold text-[#1a2e1a]">Lotes activos en esta sala</p>
            </div>
            <div className="divide-y divide-[#f5faf3]">
              {lots.map((lot: any) => (
                <div key={lot.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[#1a2e1a]">{lot.lot_code}</p>
                    <p className="text-xs text-[#6b8c65]">{lot.genetic?.name ?? "Sin genetica"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lot.plant_count && (
                      <span className="text-xs text-[#9ab894] flex items-center gap-1">
                        <Sprout className="w-3 h-3" />{lot.plant_count}
                      </span>
                    )}
                    <span className="text-xs bg-[#fdf8ec] text-[#8a6010] border border-[#e8d48a] rounded-full px-2 py-0.5 font-medium">
                      {lot.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!active_cycle && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-800 font-medium">Sin ciclo activo</p>
            <p className="text-xs text-amber-600 mt-0.5">No se pueden registrar eventos sin un ciclo activo</p>
          </div>
        )}

        {active_cycle && (
          <div className="space-y-3">
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            )}

            <div className="bg-white rounded-xl border border-[#ddecd8] overflow-hidden">
              <button onClick={() => setActivePanel(activePanel === "evento" ? null : "evento")}
                className="w-full flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2d5a27] flex items-center justify-center">
                    <CalendarPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#1a2e1a]">Registrar evento</p>
                    <p className="text-xs text-[#9ab894]">Poda, riego, tratamiento, incidente...</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#9ab894] transition-transform ${activePanel === "evento" ? "rotate-180" : ""}`} />
              </button>

              {activePanel === "evento" && (
                <form onSubmit={handleEventSubmit} className="border-t border-[#eef5ea] px-4 py-4 space-y-3">
                  <div>
                    <label className="label-ong">Tipo de evento *</label>
                    <select required className="input-ong" value={eventType} onChange={e => setEventType(e.target.value)}>
                      {EVENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-ong">Lote (dejar vacio para toda la sala)</label>
                    <select className="input-ong" value={selectedLotId} onChange={e => setSelectedLotId(e.target.value)}>
                      <option value="">Toda la sala</option>
                      {lots.map((l: any) => <option key={l.id} value={l.id}>{l.lot_code} — {l.genetic?.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-ong">Notas</label>
                    <textarea name="notes" rows={3} className="input-ong resize-none" placeholder="Describe lo que hiciste..." />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#14532d] py-3.5 text-sm font-bold text-white disabled:opacity-60">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirmar evento
                  </button>
                </form>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[#ddecd8] overflow-hidden">
              <button onClick={() => setActivePanel(activePanel === "insumo" ? null : "insumo")}
                className="w-full flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#4d8a3d] flex items-center justify-center">
                    <FlaskConical className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#1a2e1a]">Usar insumo</p>
                    <p className="text-xs text-[#9ab894]">Registrar lo que se aplico hoy</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#9ab894] transition-transform ${activePanel === "insumo" ? "rotate-180" : ""}`} />
              </button>

              {activePanel === "insumo" && (
                <form onSubmit={handleInsumoSubmit} className="border-t border-[#eef5ea] px-4 py-4 space-y-3">
                  <div>
                    <label className="label-ong">Producto *</label>
                    <select required className="input-ong" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                      <option value="">Selecciona...</option>
                      {products.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} — {p.stock_actual} {p.unit}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-ong">Cantidad *</label>
                    <input type="number" required min="0.01" step="0.01" className="input-ong"
                      value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.0" />
                  </div>
                  <div>
                    <label className="label-ong">Lote (dejar vacio para toda la sala)</label>
                    <select className="input-ong" value={selectedLotId} onChange={e => setSelectedLotId(e.target.value)}>
                      <option value="">Toda la sala</option>
                      {lots.map((l: any) => <option key={l.id} value={l.id}>{l.lot_code} — {l.genetic?.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-ong">Notas</label>
                    <textarea name="notes" rows={2} className="input-ong resize-none" placeholder="Opcional..." />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4d8a3d] py-3.5 text-sm font-bold text-white disabled:opacity-60">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirmar insumo
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#9ab894] pb-4">Circulo Esmeralda — {room.name}</p>
      </div>
    </div>
  )
}