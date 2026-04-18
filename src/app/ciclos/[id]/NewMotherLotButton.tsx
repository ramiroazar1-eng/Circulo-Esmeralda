"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Sprout } from "lucide-react"
import { Button, Alert } from "@/components/ui"

interface Props {
  cycleId: string
  genetics: { id: string; name: string }[]
  rooms: { id: string; name: string }[]
}

export default function NewMotherLotButton({ cycleId, genetics, rooms }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/lots/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        genetic_id: form.get("genetic_id") || null,
        room_id: form.get("room_id") || null,
        seedling_date: form.get("seedling_date") || null,
        plant_count: form.get("plant_count") ? parseInt(form.get("plant_count") as string) : null,
        notes: form.get("notes") || null,
        cycle_id: cycleId,
        lot_subtype: "madre",
      })
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? "Error al crear lote"); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5" />Agregar madres
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea]">
                <div className="flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  <div>
                    <h2 className="text-sm font-bold text-[#1a2e1a]">Agregar madres nuevas</h2>
                    <p className="text-xs text-[#9ab894] mt-0.5">Nuevas madres al ciclo reproductivo</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && <Alert variant="error">{error}</Alert>}
                <div>
                  <label className="label-ong">Genetica *</label>
                  <select name="genetic_id" required className="input-ong">
                    <option value="">Seleccionar genetica...</option>
                    {genetics.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-ong">Sala</label>
                    <select name="room_id" className="input-ong">
                      <option value="">Sin asignar</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-ong">Cantidad de plantas</label>
                    <input name="plant_count" type="number" min="1" className="input-ong" placeholder="Ej: 4" />
                  </div>
                </div>
                <div>
                  <label className="label-ong">Fecha de ingreso</label>
                  <input name="seedling_date" type="date" className="input-ong" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <label className="label-ong">Notas</label>
                  <textarea name="notes" rows={2} className="input-ong resize-none" placeholder="Origen de las madres, observaciones..." />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" loading={loading}>
                    <Sprout className="w-3.5 h-3.5" />Agregar madres
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
