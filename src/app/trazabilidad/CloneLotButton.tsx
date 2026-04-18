"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sprout, X, GitBranch } from "lucide-react"
import { Button, Alert } from "@/components/ui"

interface Props {
  lotId: string
  lotCode: string
  geneticName: string
  rooms: { id: string; name: string }[]
}

const DESTINATIONS = [
  {
    value: "vege",
    label: "A vegetativo",
    description: "Los esquejes van a sala de vege, luego pasan a flora.",
    color: "#2d6a1f",
    bg: "bg-[#f0fdf4]",
    border: "border-[#bbf7d0]",
  },
  {
    value: "flora",
    label: "Directo a flora",
    description: "Los esquejes van directamente a sala de floracion.",
    color: "#b45309",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    value: "madre",
    label: "Nuevas madres",
    description: "Los esquejes se incorporan al ciclo reproductivo como nuevas madres.",
    color: "#1d4ed8",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
]

export default function CloneLotButton({ lotId, lotCode, geneticName, rooms }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [destination, setDestination] = useState("vege")
  const [plantCount, setPlantCount] = useState("")
  const [roomId, setRoomId] = useState("")
  const [notes, setNotes] = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!plantCount || parseInt(plantCount) <= 0) { setError("Ingresa la cantidad de esquejes"); return }
    setLoading(true); setError(null)
    const res = await fetch("/api/lots/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parent_lot_id: lotId,
        plant_count: parseInt(plantCount),
        room_id: roomId || null,
        destination,
        notes: notes || null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Error al crear esquejes"); setLoading(false); return }
    setOpen(false)
    setPlantCount(""); setRoomId(""); setNotes(""); setDestination("vege")
    router.refresh()
  }

  const selectedDest = DESTINATIONS.find(d => d.value === destination)!

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <GitBranch className="w-3.5 h-3.5" />
        Sacar esquejes
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea]">
                <div>
                  <h2 className="text-sm font-bold text-[#1a2e1a]">Sacar esquejes</h2>
                  <p className="text-xs text-[#9ab894] mt-0.5 font-mono">{lotCode} — {geneticName}</p>
                </div>
                <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                {/* Destino */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Destino de los esquejes *</p>
                  <div className="space-y-2">
                    {DESTINATIONS.map(d => (
                      <button key={d.value} type="button" onClick={() => setDestination(d.value)}
                        className={`w-full text-left rounded-xl border p-3 transition-all flex items-start gap-3 ${destination === d.value ? `${d.bg} ${d.border}` : "border-slate-200 hover:border-slate-300"}`}>
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center`}
                          style={{ borderColor: destination === d.value ? d.color : "#cbd5e1", background: destination === d.value ? d.color : "transparent" }}>
                          {destination === d.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1a2e1a]">{d.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{d.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="label-ong">Cantidad de esquejes *</label>
                  <input type="number" min="1" required value={plantCount} onChange={e => setPlantCount(e.target.value)}
                    className="input-ong" placeholder="Ej: 10" />
                </div>

                {/* Sala */}
                <div>
                  <label className="label-ong">Sala destino (opcional)</label>
                  <select value={roomId} onChange={e => setRoomId(e.target.value)} className="input-ong">
                    <option value="">Sin asignar</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                {/* Notas */}
                <div>
                  <label className="label-ong">Notas</label>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    className="input-ong resize-none" placeholder="Observaciones..." />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-[#eef5ea]">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" loading={loading}>
                    <Sprout className="w-3.5 h-3.5" />
                    Crear esquejes
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
