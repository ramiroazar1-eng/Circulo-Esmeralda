"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"

const EVENT_TYPES = [
  { value: "poda",        label: "Poda" },
  { value: "nutrientes",  label: "Aplicacion de nutrientes" },
  { value: "tratamiento", label: "Tratamiento / preventivo" },
  { value: "transplante", label: "Transplante" },
  { value: "riego",       label: "Riego" },
  { value: "defoliacion", label: "Defoliacion" },
  { value: "traslado",    label: "Traslado" },
  { value: "incidente",   label: "Incidente" },
  { value: "descarte",    label: "Descarte parcial" },
  { value: "otro",        label: "Otro" },
]

interface Props {
  cycleId: string
  lots?: { id: string; lot_code: string }[]
  rooms?: { id: string; name: string }[]
}

export default function NewEventModal({ cycleId, lots = [], rooms = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/cycles/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle_id: cycleId,
        event_type: form.get("event_type"),
        event_date: form.get("event_date"),
        lot_id: form.get("lot_id") || null,
        room_id: form.get("room_id") || null,
        notes: form.get("notes") || null,
      })
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? "Error al guardar"); setLoading(false); return }
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
      <Plus className="w-3.5 h-3.5" />Agregar evento
    </Button>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea]">
            <h2 className="text-sm font-bold text-[#1a2e1a]">Agregar evento al ciclo</h2>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div>
              <label className="label-ong">Tipo de evento *</label>
              <select name="event_type" required className="input-ong">
                {EVENT_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-ong">Fecha *</label>
              <input name="event_date" type="date" required className="input-ong" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            {lots.length > 0 && (
              <div>
                <label className="label-ong">Lote (opcional)</label>
                <select name="lot_id" className="input-ong">
                  <option value="">Todo el ciclo</option>
                  {lots.map(l => <option key={l.id} value={l.id}>{l.lot_code}</option>)}
                </select>
              </div>
            )}
            {rooms.length > 0 && (
              <div>
                <label className="label-ong">Sala (opcional)</label>
                <select name="room_id" className="input-ong">
                  <option value="">Sin especificar</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label-ong">Notas</label>
              <textarea name="notes" rows={3} className="input-ong resize-none" placeholder="Descripcion del evento..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Guardar evento</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}