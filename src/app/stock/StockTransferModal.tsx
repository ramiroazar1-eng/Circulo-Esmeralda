"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"
import { formatGrams } from "@/lib/utils"

interface Props {
  lots: any[]
  geneticName: string
  singleLot?: boolean
}

export default function StockTransferModal({ lots, geneticName, singleLot = false }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLotId, setSelectedLotId] = useState(lots[0]?.lot?.id ?? "")
  const [grams, setGrams] = useState("")
  const router = useRouter()

  const selectedLot = lots.find((s: any) => s.lot?.id === selectedLotId)
  const maxGrams = selectedLot?.available_grams ?? 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/stock/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lot_id: selectedLotId,
        grams: parseFloat(grams),
        notes: form.get("notes") || null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setOpen(false); setGrams(""); setError(null)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <ArrowDown className="w-3.5 h-3.5" />Transferir
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Transferir a operativo</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{geneticName}</p>
                </div>
                <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                {!singleLot && lots.length > 1 && (
                  <div>
                    <label className="label-ong">Lote *</label>
                    <select className="input-ong" value={selectedLotId} onChange={e => setSelectedLotId(e.target.value)}>
                      {lots.map((s: any) => (
                        <option key={s.lot?.id} value={s.lot?.id}>
                          {s.lot?.lot_code} — {formatGrams(s.available_grams)} en acopio
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-[#f5faf3] rounded-lg px-3 py-2 flex justify-between items-center">
                  <span className="text-xs text-[#6b8c65]">Disponible en acopio</span>
                  <span className="text-sm font-bold text-[#1a2e1a]">{formatGrams(maxGrams)}</span>
                </div>

                <div>
                  <label className="label-ong">Gramos a transferir *</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    max={maxGrams}
                    step="0.1"
                    className="input-ong"
                    placeholder="Ej: 400"
                    value={grams}
                    onChange={e => setGrams(e.target.value)}
                  />
                  {grams && parseFloat(grams) > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Quedara en acopio: {formatGrams(maxGrams - parseFloat(grams))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label-ong">Notas</label>
                  <input name="notes" type="text" className="input-ong" placeholder="Ej: Entrega semanal al administrativo" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" loading={loading}>
                    <ArrowDown className="w-3.5 h-3.5" />Confirmar transferencia
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