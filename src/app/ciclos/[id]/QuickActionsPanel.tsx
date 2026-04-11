"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarPlus, FlaskConical, ChevronDown, ChevronUp, Zap } from "lucide-react"
import { Button, Alert } from "@/components/ui"

const EVENT_TYPES = [
  { value: "riego",       label: "Riego" },
  { value: "nutrientes",  label: "Nutrientes" },
  { value: "poda",        label: "Poda" },
  { value: "defoliacion", label: "Defoliacion" },
  { value: "tratamiento", label: "Tratamiento / preventivo" },
  { value: "transplante", label: "Transplante" },
  { value: "traslado",    label: "Traslado" },
  { value: "incidente",   label: "Incidente" },
  { value: "descarte",    label: "Descarte parcial" },
  { value: "otro",        label: "Otro" },
]

interface Lot {
  id: string
  lot_code: string
  status: string
  genetic_name: string | null
  room_name: string | null
  room_id: string | null
}
interface Product { id: string; name: string; unit: string; stock_actual: number; last_unit_cost: number | null }
interface Room { id: string; name: string }
interface Template { id: string; name: string; event_type: string; notes: string | null }

interface Props {
  cycleId: string
  lots: Lot[]
  products: Product[]
  rooms: Room[]
  canManageTemplates?: boolean
}

export default function QuickActionsPanel({ cycleId, lots, products, rooms, canManageTemplates = false }: Props) {
  const [activePanel, setActivePanel] = useState<"evento" | "insumo" | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unitCost, setUnitCost] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [eventType, setEventType] = useState("riego")
  const [notes, setNotes] = useState("")
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [selectedEventLotId, setSelectedEventLotId] = useState("")
  const [selectedEventRoomId, setSelectedEventRoomId] = useState("")
  const [selectedInsumoLotId, setSelectedInsumoLotId] = useState("")
  const [selectedInsumoRoomId, setSelectedInsumoRoomId] = useState("")
  const router = useRouter()

  useEffect(() => {
    fetch("/api/cycles/event-templates")
      .then(r => r.json())
      .then(d => setTemplates(d.data ?? []))
  }, [])

  function applyTemplate(template: Template) {
    setEventType(template.event_type)
    setNotes(template.notes ?? "")
  }

  function handleEventLotChange(lotId: string) {
    setSelectedEventLotId(lotId)
    const lot = lots.find(l => l.id === lotId)
    setSelectedEventRoomId(lot?.room_id ?? "")
  }

  function handleInsumoLotChange(lotId: string) {
    setSelectedInsumoLotId(lotId)
    const lot = lots.find(l => l.id === lotId)
    setSelectedInsumoRoomId(lot?.room_id ?? "")
  }

  function handleProductChange(productId: string) {
    setSelectedProductId(productId)
    const product = products.find(p => p.id === productId)
    setUnitCost(product?.last_unit_cost ? product.last_unit_cost.toString() : "")
  }

  function togglePanel(panel: "evento" | "insumo") {
    setActivePanel(prev => prev === panel ? null : panel)
    setError(null); setSuccess(null); setNotes(""); setEventType("riego")
    setSelectedEventLotId(""); setSelectedEventRoomId("")
    setSelectedInsumoLotId(""); setSelectedInsumoRoomId("")
  }

  const totalCost = quantity && unitCost
    ? (parseFloat(quantity) * parseFloat(unitCost)).toLocaleString("es-AR", { minimumFractionDigits: 2 })
    : null

  async function handleEventSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/cycles/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle_id: cycleId,
        event_type: eventType,
        event_date: form.get("event_date"),
        lot_id: selectedEventLotId || null,
        room_id: selectedEventRoomId || null,
        notes: notes || null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setSuccess("Evento registrado")
    setLoading(false)
    setTimeout(() => { setActivePanel(null); setSuccess(null); router.refresh() }, 1500)
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) return
    await fetch("/api/cycles/event-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName, event_type: eventType, notes })
    })
    setTemplateName(""); setShowNewTemplate(false)
    fetch("/api/cycles/event-templates").then(r => r.json()).then(d => setTemplates(d.data ?? []))
  }

  async function handleInsumoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const qty = parseFloat(quantity)
    const uc = parseFloat(unitCost) || null
    const res = await fetch("/api/supplies/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supply_product_id: selectedProductId,
        movement_type: "consumo",
        quantity: qty,
        unit_cost: uc,
        total_cost: uc ? qty * uc : null,
        cycle_id: cycleId,
        lot_id: selectedInsumoLotId || null,
        room_id: selectedInsumoRoomId || null,
        notes: form.get("notes") || null,
        movement_date: form.get("movement_date"),
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setSuccess("Consumo registrado")
    setLoading(false)
    setSelectedProductId(""); setQuantity(""); setUnitCost("")
    setTimeout(() => { setActivePanel(null); setSuccess(null); router.refresh() }, 1500)
  }

  return (
    <div className="bg-white border border-[#ddecd8] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#eef5ea]">
        <p className="text-sm font-bold text-[#1a2e1a]">Acciones rapidas</p>
        <p className="text-xs text-[#9ab894] mt-0.5">Registro operativo del dia</p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-[#eef5ea]">
        <button onClick={() => togglePanel("evento")}
          className={`flex items-center justify-between px-5 py-4 transition-colors ${activePanel === "evento" ? "bg-[#edf7e8]" : "hover:bg-[#f5faf3]"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2d5a27] flex items-center justify-center shrink-0">
              <CalendarPlus className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#1a2e1a]">Registrar evento</p>
              <p className="text-xs text-[#9ab894]">Poda, riego, tratamiento...</p>
            </div>
          </div>
          {activePanel === "evento" ? <ChevronUp className="w-4 h-4 text-[#9ab894]" /> : <ChevronDown className="w-4 h-4 text-[#9ab894]" />}
        </button>

        <button onClick={() => togglePanel("insumo")}
          className={`flex items-center justify-between px-5 py-4 transition-colors ${activePanel === "insumo" ? "bg-[#edf7e8]" : "hover:bg-[#f5faf3]"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#4d8a3d] flex items-center justify-center shrink-0">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#1a2e1a]">Usar insumo</p>
              <p className="text-xs text-[#9ab894]">Registrar consumo del dia</p>
            </div>
          </div>
          {activePanel === "insumo" ? <ChevronUp className="w-4 h-4 text-[#9ab894]" /> : <ChevronDown className="w-4 h-4 text-[#9ab894]" />}
        </button>
      </div>

      {activePanel && (
        <div className="border-t border-[#eef5ea] px-5 py-4">
          {error && <div className="mb-3"><Alert variant="error">{error}</Alert></div>}
          {success && <div className="mb-3"><Alert variant="success">{success}</Alert></div>}

          {activePanel === "evento" && (
            <form onSubmit={handleEventSubmit} className="space-y-3">
              {templates.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                    <Zap className="w-3 h-3" />Templates rapidos
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {templates.map(t => (
                      <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                        className="text-xs bg-[#f5faf3] hover:bg-[#edf7e8] text-[#2d5a27] border border-[#ddecd8] rounded-lg px-2.5 py-1.5 transition-colors">
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-ong">Tipo *</label>
                  <select required className="input-ong" value={eventType} onChange={e => setEventType(e.target.value)}>
                    {EVENT_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-ong">Fecha *</label>
                  <input name="event_date" type="date" required className="input-ong" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-ong">Lote</label>
                  <select className="input-ong" value={selectedEventLotId} onChange={e => handleEventLotChange(e.target.value)}>
                    <option value="">Todo el ciclo</option>
                    {lots.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.lot_code}{l.genetic_name ? ` - ${l.genetic_name}` : ""}{l.room_name ? ` (${l.room_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-ong">
                    Sala {selectedEventRoomId && <span className="text-[#9ab894] ml-1 font-normal">(autoasignada)</span>}
                  </label>
                  <select className="input-ong" value={selectedEventRoomId} onChange={e => setSelectedEventRoomId(e.target.value)}>
                    <option value="">Sin especificar</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-ong">Notas</label>
                <textarea rows={2} className="input-ong resize-none" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              {canManageTemplates && (
                <div>
                  {!showNewTemplate ? (
                    <button type="button" onClick={() => setShowNewTemplate(true)}
                      className="text-xs text-[#9ab894] hover:text-[#2d5a27] flex items-center gap-1">
                      <Zap className="w-3 h-3" />Guardar como template
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input type="text" className="input-ong flex-1 text-xs" placeholder="Nombre del template..."
                        value={templateName} onChange={e => setTemplateName(e.target.value)} />
                      <Button type="button" size="sm" onClick={handleSaveTemplate}>Guardar</Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setShowNewTemplate(false)}>X</Button>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setActivePanel(null)}>Cancelar</Button>
                <Button type="submit" size="sm" loading={loading}>Guardar evento</Button>
              </div>
            </form>
          )}

          {activePanel === "insumo" && (
            <form onSubmit={handleInsumoSubmit} className="space-y-3">
              <div>
                <label className="label-ong">Producto *</label>
                <select required className="input-ong" value={selectedProductId} onChange={e => handleProductChange(e.target.value)}>
                  <option value="">Selecciona un producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — stock: {p.stock_actual} {p.unit}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-ong">Cantidad *</label>
                  <input type="number" required min="0.01" step="0.01" className="input-ong"
                    value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
                <div>
                  <label className="label-ong">
                    Costo unitario {unitCost && <span className="text-[#9ab894] ml-1 font-normal">(ultimo precio)</span>}
                  </label>
                  <input type="number" min="0" step="0.01" className="input-ong" placeholder="$0.00"
                    value={unitCost} onChange={e => setUnitCost(e.target.value)} />
                </div>
              </div>
              {totalCost && (
                <div className="bg-[#f5faf3] rounded-lg px-3 py-2 flex justify-between">
                  <span className="text-xs text-[#6b8c65]">Costo total</span>
                  <span className="text-sm font-bold text-[#1a2e1a]">${totalCost}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-ong">Lote</label>
                  <select className="input-ong" value={selectedInsumoLotId} onChange={e => handleInsumoLotChange(e.target.value)}>
                    <option value="">Sin asignar</option>
                    {lots.map(l => <option key={l.id} value={l.id}>{l.lot_code}{l.room_name ? ` (${l.room_name})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-ong">
                    Sala {selectedInsumoRoomId && <span className="text-[#9ab894] ml-1 font-normal">(autoasignada)</span>}
                  </label>
                  <select className="input-ong" value={selectedInsumoRoomId} onChange={e => setSelectedInsumoRoomId(e.target.value)}>
                    <option value="">Sin asignar</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-ong">Fecha *</label>
                <input name="movement_date" type="date" required className="input-ong"
                  defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <label className="label-ong">Notas</label>
                <textarea name="notes" rows={2} className="input-ong resize-none" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setActivePanel(null)}>Cancelar</Button>
                <Button type="submit" size="sm" loading={loading}>Registrar consumo</Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}