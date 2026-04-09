"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightLeft, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"

interface Props {
  lotId: string
  lotCode: string
  currentRoomId: string | null
  currentRoomName: string | null
  rooms: { id: string; name: string }[]
}

export default function TransferLotModal({ lotId, lotCode, currentRoomId, currentRoomName, rooms }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const availableRooms = rooms.filter(r => r.id !== currentRoomId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/lots/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lot_id: lotId,
        new_room_id: form.get("new_room_id"),
        transfer_date: form.get("transfer_date"),
        notes: form.get("notes") || null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <ArrowRightLeft className="w-3.5 h-3.5" />Trasladar
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">Trasladar lote {lotCode}</h2>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && <Alert variant="error">{error}</Alert>}
                {currentRoomName && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-500">Sala actual</p>
                    <p className="text-sm font-medium text-slate-900">{currentRoomName}</p>
                  </div>
                )}
                <div>
                  <label className="label-ong">Nueva sala *</label>
                  <select name="new_room_id" required className="input-ong">
                    <option value="">Selecciona...</option>
                    {availableRooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-ong">Fecha de traslado *</label>
                  <input name="transfer_date" type="date" required className="input-ong" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <label className="label-ong">Notas</label>
                  <textarea name="notes" rows={2} className="input-ong resize-none" placeholder="Ej: Fin de vegetativo, pasa a floracion" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" loading={loading}>
                    <ArrowRightLeft className="w-3.5 h-3.5" />Confirmar traslado
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