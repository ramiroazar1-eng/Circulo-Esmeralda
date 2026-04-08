"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownUp, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"
import type { SupplyStock } from "@/types"

const MOVEMENT_TYPES = [
  { value: "compra", label: "Compra (ingreso)" },
  { value: "consumo", label: "Consumo (egreso)" },
  { value: "ajuste", label: "Ajuste de inventario" },
  { value: "merma", label: "Merma / perdida" },
]

interface Props {
  products: SupplyStock[]
  cycles: { id: string; name: string }[]
  lots: { id: string; lot_code: string }[]
  rooms: { id: string; name: string }[]
}

export default function NewSupplyMovementModal({ products, cycles, lots, rooms }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [movementType, setMovementType] = useState("compra")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const quantity = parseFloat(form.get("quantity") as string)
    const unit_cost = parseFloat(form.get("unit_cost") as string) || null
    const res = await fetch("/api/supplies/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supply_product_id: form.get("supply_product_id"),
        movement_type: form.get("movement_type"),
        quantity,
        unit_cost,
        total_cost: unit_cost ? quantity * unit_cost : null,
        cycle_id: form.get("cycle_id") || null,
        lot_id: form.get("lot_id") || null,
        room_id: form.get("room_id") || null,
        notes: form.get("notes") || null,
        movement_date: form.get("movement_date"),
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
      <ArrowDownUp className="w-3.5 h-3.5" />Registrar movimiento
    </Button>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Registrar movimiento</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div>
              <label className="label-ong">Tipo *</label>
              <select name="movement_type" required className="input-ong" value={movementType} onChange={e => setMovementType(e.target.value)}>
                {MOVEMENT_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-ong">Producto *</label>
              <select name="supply_product_id" required className="input-ong">
                <option value="">Selecciona...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — stock: {p.stock_actual} {p.unit}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Cantidad *</label><input name="quantity" type="number" required min="0.01" step="0.01" className="input-ong" /></div>
              <div><label className="label-ong">Costo unitario</label><input name="unit_cost" type="number" min="0" step="0.01" className="input-ong" placeholder="$0.00" /></div>
            </div>
            <div><label className="label-ong">Fecha *</label><input name="movement_date" type="date" required className="input-ong" defaultValue={new Date().toISOString().split("T")[0]} /></div>
            {movementType === "consumo" && (
              <>
                <div>
                  <label className="label-ong">Ciclo</label>
                  <select name="cycle_id" className="input-ong">
                    <option value="">Sin asignar</option>
                    {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-ong">Lote</label>
                  <select name="lot_id" className="input-ong">
                    <option value="">Sin asignar</option>
                    {lots.map(l => <option key={l.id} value={l.id}>{l.lot_code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-ong">Sala</label>
                  <select name="room_id" className="input-ong">
                    <option value="">Sin asignar</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div><label className="label-ong">Notas</label><textarea name="notes" rows={2} className="input-ong resize-none" /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Registrar</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}