"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"

const EVENT_TYPES = [
  { value: "poda",        label: "Poda" },
  { value: "nutrientes",  label: "Aplicacion de nutrientes" },
  { value: "tratamiento", label: "Tratamiento de plagas" },
  { value: "transplante", label: "Transplante" },
  { value: "otro",        label: "Otro" },
]

export default function NewEventModal({ cycleId }: { cycleId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/cycles/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle_id: cycleId,
        event_type: form.get("event_type"),
        event_date: form.get("event_date"),
        notes: form.get("notes") || null,
      })
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? "Error al guardar"); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Agregar evento</Button>

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