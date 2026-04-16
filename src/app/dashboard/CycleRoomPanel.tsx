"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarPlus, FlaskConical, ChevronDown, ChevronUp, Check, Sprout, X } from "lucide-react"
import { Alert } from "@/components/ui"

const EVENT_TYPES = [
  { value: "riego", label: "Riego" },
  { value: "nutrientes", label: "Nutrientes" },
  { value: "poda", label: "Poda" },
  { value: "defoliacion", label: "Defoliacion" },
  { value: "tratamiento", label: "Tratamiento / preventivo" },
  { value: "incidente", label: "Incidente" },
  { value: "descarte", label: "Descarte parcial" },
  { value: "otro", label: "Otro" },
]

interface Room { room_id: string; room_name: string; plant_count: number; plants_veg: number; plants_flower: number; plants_seedling: number }
interface Lot { id: string; lot_code: string; status: string; plant_count: number | null; genetic: { name: string } | null; room: { name: string } | null }
interface Product { id: string; name: string; unit: string; stock_actual: number; last_unit_cost: number | null }

interface Props {
  cycleId: string
  rooms: Room[]
  lots: Lot[]
  products: Product[]
  allRooms: { id: string; name: string; square_meters?: number }[]
}

export default function CycleRoomPanel({ cycleId, rooms, lots, products, allRooms }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<"evento" | "insumo" | null>(null)
  const [eventType, setEventType] = useState("riego")
  const [notes, setNotes] = useState("")
  const [selectedLotId, setSelectedLotId] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unitCost, setUnitCost] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const room = rooms.find(r => r.room_id === selectedRoom)
  const roomLots = lots.filter(l => l.room?.name === room?.room_name && ["plantines","vegetativo","floracion"].includes(l.status))
  const selectedProduct = products.find(p => p.id === selectedProductId)
  const totalCost = quantity && unitCost ? (parseFloat(quantity) * parseFloat(unitCost)).toLocaleString("es-AR", { minimumFractionDigits: 2 }) : null

  function handleProductChange(id: string) {
    setSelectedProductId(id)
    const p = products.find(p => p.id === id)
    setUnitCost(p?.last_unit_cost ? p.last_unit_cost.toString() : "")
  }

  function openRoom(roomId: string) {
    setSelectedRoom(roomId)
    setActivePanel(null)
    setError(null); setSuccess(null)
    setSelectedLotId(""); setEventType("riego"); setNotes("")
    setSelectedProductId(""); setQuantity(""); setUnitCost("")
  }

  async function handleEventSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const roomData = allRooms.find(r => r.id === selectedRoom)

    // Si no hay lote específico, registrar para todos los lotes de la sala
    const targetLots = selectedLotId ? [selectedLotId] : roomLots.map(l => l.id)

    if (targetLots.length === 0) {
      // Registrar sin lote, solo sala
      const res = await fetch("/api/cycles/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_id: cycleId, event_type: eventType,
          event_date: form.get("event_date"),
          room_id: selectedRoom, lot_id: null,
          notes: notes || null,
        })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
    } else {
      for (const lotId of targetLots) {
        await fetch("/api/cycles/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cycle_id: cycleId, event_type: eventType,
            event_date: form.get("event_date"),
            room_id: selectedRoom, lot_id: lotId,
            notes: notes || null,
          })
        })
      }
    }
    setSuccess(`Evento registrado en ${room?.room_name}${targetLots.length > 1 ? ` (${targetLots.length} lotes)` : ""}`)
    setLoading(false); setActivePanel(null)
    setTimeout(() => { setSuccess(null); router.refresh() }, 2000)
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
        movement_type: "consumo", quantity: qty,
        unit_cost: uc, total_cost: uc ? qty * uc : null,
        cycle_id: cycleId,
        lot_id: selectedLotId || null,
        room_id: selectedRoom,
        notes: form.get("notes") || null,
        movement_date: form.get("movement_date"),
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setSuccess(`Insumo registrado en ${room?.room_name}`)
    setLoading(false); setActivePanel(null)
    setSelectedProductId(""); setQuantity(""); setUnitCost("")
    setTimeout(() => { setSuccess(null); router.refresh() }, 2000)
  }

  return (
    <div className="space-y-3">
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">{success}</p>
        </div>
      )}

      {/* Grid de salas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {rooms.filter(r => r.plant_count > 0).map(r => (
          <button key={r.room_id} onClick={() => openRoom(r.room_id)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              selectedRoom === r.room_id
                ? "bg-[#0f1f12] border-[#2d5a27]"
                : "bg-white border-[#ddecd8] hover:border-[#4d8a3d] hover:bg-[#f5faf3]"
            }`}>
            <p className={`text-sm font-bold ${selectedRoom === r.room_id ? "text-[#e8f5e3]" : "text-[#1a2e1a]"}`}>{r.room_name}</p>
            <div className="flex items-center gap-1 mt-1">
              <Sprout className={`w-3 h-3 ${selectedRoom === r.room_id ? "text-[#7dc264]" : "text-[#9ab894]"}`} />
              <p className={`text-xs font-medium ${selectedRoom === r.room_id ? "text-[#7dc264]" : "text-[#6b8c65]"}`}>{r.plant_count} plantas</p>
            </div>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {r.plants_seedling > 0 && <span className={`text-xs ${selectedRoom === r.room_id ? "text-[#9ab894]" : "text-slate-400"}`}>{r.plants_seedling} pl</span>}
              {r.plants_veg > 0 && <span className={`text-xs font-medium ${selectedRoom === r.room_id ? "text-[#7dc264]" : "text-[#2d6a1f]"}`}>{r.plants_veg} vege</span>}
              {r.plants_flower > 0 && <span className={`text-xs font-medium ${selectedRoom === r.room_id ? "text-amber-300" : "text-amber-600"}`}>{r.plants_flower} flora</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Panel de acciones para la sala seleccionada */}
      {selectedRoom && room && (
        <div className="bg-white border border-[#ddecd8] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#0f1f12] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#e8f5e3]">{room.room_name}</p>
              <p className="text-xs text-[#7a9e74] mt-0.5">{roomLots.length} lote{roomLots.length !== 1 ? "s" : ""} activos</p>
            </div>
            <button onClick={() => setSelectedRoom(null)} className="text-[#7a9e74] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && <div className="px-4 pt-3"><Alert variant="error">{error}</Alert></div>}

          {/* Lotes de la sala */}
          {roomLots.length > 0 && (
            <div className="px-4 py-3 border-b border-[#eef5ea]">
              <div className="flex flex-wrap gap-1.5">
                {roomLots.map(l => (
                  <span key={l.id} className="text-xs bg-[#f5faf3] border border-[#ddecd8] text-[#2d5a27] rounded-full px-2.5 py-0.5 font-medium">
                    {l.lot_code} — {l.genetic?.name ?? "-"}
                    {l.plant_count ? ` (${l.plant_count})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Botones de accion */}
          <div className="grid grid-cols-2 divide-x divide-[#eef5ea]">
            <button onClick={() => setActivePanel(activePanel === "evento" ? null : "evento")}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${activePanel === "evento" ? "bg-[#edf7e8]" : "hover:bg-[#f5faf3]"}`}>
              <div className="w-8 h-8 rounded-lg bg-[#2d5a27] flex items-center justify-center shrink-0">
                <CalendarPlus className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#1a2e1a]">Registrar evento</p>
                <p className="text-xs text-[#9ab894]">Para toda la sala</p>
              </div>
            </button>
            <button onClick={() => setActivePanel(activePanel === "insumo" ? null : "insumo")}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${activePanel === "insumo" ? "bg-[#edf7e8]" : "hover:bg-[#f5faf3]"}`}>
              <div className="w-8 h-8 rounded-lg bg-[#4d8a3d] flex items-center justify-center shrink-0">
                <FlaskConical className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[#1a2e1a]">Usar insumo</p>
                <p className="text-xs text-[#9ab894]">Consumo del dia</p>
              </div>
            </button>
          </div>

          {activePanel === "evento" && (
            <form onSubmit={handleEventSubmit} className="border-t border-[#eef5ea] px-4 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-ong">Tipo *</label>
                  <select required className="input-ong" value={eventType} onChange={e => setEventType(e.target.value)}>
                    {EVENT_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-ong">Fecha *</label>
                  <input name="event_date" type="date" required className="input-ong" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
              </div>
              {roomLots.length > 1 && (
                <div>
                  <label className="label-ong">Lote (dejar vacio = toda la sala)</label>
                  <select className="input-ong" value={selectedLotId} onChange={e => setSelectedLotId(e.target.value)}>
                    <option value="">Toda la sala ({roomLots.length} lotes)</option>
                    {roomLots.map(l => <option key={l.id} value={l.id}>{l.lot_code} — {l.genetic?.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label-ong">Notas</label>
                <textarea name="notes" rows={2} className="input-ong resize-none" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActivePanel(null)} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={loading} className="px-3 py-1.5 text-xs bg-[#14532d] text-white rounded-lg hover:bg-[#166534] disabled:opacity-50">
                  {loading ? "Guardando..." : selectedLotId ? "Guardar evento" : `Guardar para ${roomLots.length > 0 ? "toda la sala" : "la sala"}`}
                </button>
              </div>
            </form>
          )}

          {activePanel === "insumo" && (
            <form onSubmit={handleInsumoSubmit} className="border-t border-[#eef5ea] px-4 py-4 space-y-3">
              <div>
                <label className="label-ong">Producto *</label>
                <select required className="input-ong" value={selectedProductId} onChange={e => handleProductChange(e.target.value)}>
                  <option value="">Selecciona...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} — {p.stock_actual} {p.unit}{p.last_unit_cost ? ` ($${p.last_unit_cost}/${p.unit})` : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-ong">Cantidad ({selectedProduct?.unit ?? "unidad"}) *</label>
                  <input type="number" required min="0.01" step="0.01" className="input-ong" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
                <div>
                  <label className="label-ong">Costo unitario</label>
                  <input type="number" min="0" step="0.01" className="input-ong" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
                </div>
              </div>
              {totalCost && (
                <div className="bg-[#edf7e8] border border-[#b8daa8] rounded-lg px-3 py-2 flex justify-between">
                  <span className="text-xs text-[#6b8c65]">Costo total</span>
                  <span className="text-sm font-bold text-[#1a2e1a]">${totalCost}</span>
                </div>
              )}
              {roomLots.length > 1 && (
                <div>
                  <label className="label-ong">Lote (opcional)</label>
                  <select className="input-ong" value={selectedLotId} onChange={e => setSelectedLotId(e.target.value)}>
                    <option value="">Sin asignar a lote especifico</option>
                    {roomLots.map(l => <option key={l.id} value={l.id}>{l.lot_code} — {l.genetic?.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label-ong">Fecha *</label>
                <input name="movement_date" type="date" required className="input-ong" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <label className="label-ong">Notas</label>
                <textarea name="notes" rows={2} className="input-ong resize-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActivePanel(null)} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={loading} className="px-3 py-1.5 text-xs bg-[#4d8a3d] text-white rounded-lg hover:bg-[#2d5a27] disabled:opacity-50">
                  {loading ? "Guardando..." : "Registrar consumo"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}