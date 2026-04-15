"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"

interface Props {
  genetics: { id: string; name: string }[]
  rooms: { id: string; name: string }[]
}

export default function NewLotModal({ genetics, rooms }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCycle, setSuccessCycle] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const plantCount = form.get("plant_count")

    const res = await fetch("/api/lots/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        genetic_id:    form.get("genetic_id") || null,
        room_id:       form.get("room_id") || null,
        seedling_date: form.get("seedling_date") || null,
        plant_count:   plantCount ? parseInt(plantCount as string) : null,
        notes:         form.get("notes") || null,
      })
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? "Error al crear lote"); setLoading(false); return }
    setLoading(false)
    setOpen(false)
    if (json.cycle_name) setSuccessCycle(json.cycle_name)
    router.refresh()
  }

  if (!open) return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => { setOpen(true); setSuccessCycle(null) }}><Plus className="w-3.5 h-3.5" />Nuevo lote</Button>
      {successCycle && <span className="text-xs text-[#2d6a1f] bg-[#edf7e8] border border-[#b8daa8] rounded-lg px-2.5 py-1.5">Lote asignado a {successCycle}</span>}
    </div>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea]">
            <div>
              <h2 className="text-sm font-bold text-[#1a2e1a]">Nuevo lote de produccion</h2>
              <p className="text-xs text-[#9ab894] mt-0.5">El codigo se genera automaticamente</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Genetica</label>
                <select name="genetic_id" className="input-ong">
                  <option value="">Sin especificar</option>
                  {genetics.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label-ong">Sala</label>
                <select name="room_id" className="input-ong">
                  <option value="">Sin especificar</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Fecha de plantines</label>
                <input name="seedling_date" type="date" className="input-ong" />
              </div>
              <div>
                <label className="label-ong">Cantidad de plantas</label>
                <input name="plant_count" type="number" min="1" step="1" className="input-ong" placeholder="Ej: 20" />
              </div>
            </div>
            <p className="text-xs text-[#9ab894] -mt-2">El estado del lote se actualizara automaticamente a medida que cargues las fechas de cada etapa.</p>
            <div>
              <label className="label-ong">Notas</label>
              <textarea name="notes" rows={2} className="input-ong resize-none" placeholder="Observaciones iniciales..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Crear lote</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}