"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"
import { formatGrams } from "@/lib/utils"

interface Patient { id: string; full_name: string; dni: string }
interface LotOption { lot_id: string; lot_code: string; available_grams: number; genetic_name: string | null; genetic_id: string | null }
interface CartItem { lot_id: string; lot_code: string; genetic_name: string; grams: number; available_grams: number }

export default function NewDispenseModal({ patients, lots }: { patients: Patient[]; lots: LotOption[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patientId, setPatientId] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedLot, setSelectedLot] = useState("")
  const [itemGrams, setItemGrams] = useState("")
  const [productDesc, setProductDesc] = useState("flor seca")
  const [observations, setObservations] = useState("")
  const [dispensedAt, setDispensedAt] = useState(new Date().toISOString().slice(0, 16))
  const router = useRouter()

  function addToCart() {
    if (!selectedLot || !itemGrams || parseFloat(itemGrams) <= 0) return
    const lot = lots.find(l => l.lot_id === selectedLot)
    if (!lot) return
    const existing = cart.find(c => c.lot_id === selectedLot)
    const totalForLot = existing ? existing.grams + parseFloat(itemGrams) : parseFloat(itemGrams)
    if (totalForLot > lot.available_grams) {
      setError(`Stock insuficiente para ${lot.lot_code}. Disponible: ${formatGrams(lot.available_grams)}`)
      return
    }
    setError(null)
    if (existing) {
      setCart(cart.map(c => c.lot_id === selectedLot ? { ...c, grams: c.grams + parseFloat(itemGrams) } : c))
    } else {
      setCart([...cart, { lot_id: lot.lot_id, lot_code: lot.lot_code, genetic_name: lot.genetic_name ?? "Sin genetica", grams: parseFloat(itemGrams), available_grams: lot.available_grams }])
    }
    setSelectedLot(""); setItemGrams("")
  }

  function removeFromCart(lot_id: string) {
    setCart(cart.filter(c => c.lot_id !== lot_id))
  }

  function reset() {
    setPatientId(""); setCart([]); setSelectedLot(""); setItemGrams("")
    setProductDesc("flor seca"); setObservations(""); setError(null)
    setDispensedAt(new Date().toISOString().slice(0, 16))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId) { setError("Selecciona un paciente"); return }
    if (cart.length === 0) { setError("Agrega al menos un lote"); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Insertar una dispensa por cada item del carrito
    for (const item of cart) {
      const { error: insertError } = await supabase.from("dispenses").insert({
        patient_id: patientId,
        lot_id: item.lot_id,
        grams: item.grams,
        product_desc: productDesc || "flor seca",
        observations: observations || null,
        dispensed_at: dispensedAt || new Date().toISOString(),
        performed_by: user.id
      })
      if (insertError) { setError(insertError.message); setLoading(false); return }
    }

    setOpen(false); reset(); router.refresh()
  }

  const cartTotal = cart.reduce((acc, c) => acc + c.grams, 0)

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Registrar dispensa</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => { setOpen(false); reset() }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
            <h2 className="text-sm font-semibold text-slate-900">Registrar dispensa</h2>
            <button onClick={() => { setOpen(false); reset() }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <div>
              <label className="label-ong">Paciente *</label>
              <select value={patientId} onChange={e => setPatientId(e.target.value)} required className="input-ong">
                <option value="">Selecciona un paciente...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.dni})</option>)}
              </select>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-600">Agregar lote</p>
              <div className="grid grid-cols-2 gap-2">
                <select value={selectedLot} onChange={e => setSelectedLot(e.target.value)} className="input-ong text-xs col-span-2">
                  <option value="">Seleccionar lote...</option>
                  {lots.map(l => <option key={l.lot_id} value={l.lot_id}>{l.lot_code} - {l.genetic_name ?? "Sin genetica"} - {formatGrams(l.available_grams)}</option>)}
                </select>
                <input type="number" step="0.1" min="0.1" value={itemGrams} onChange={e => setItemGrams(e.target.value)} placeholder="Gramos" className="input-ong font-mono text-xs" />
                <button type="button" onClick={addToCart} disabled={!selectedLot || !itemGrams}
                  className="flex items-center justify-center gap-1 text-xs bg-[#2d5a27] text-white rounded-lg py-2 disabled:opacity-40 hover:bg-[#3b6d30] transition-colors">
                  <Plus className="w-3 h-3" /> Agregar
                </button>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                {cart.map(item => (
                  <div key={item.lot_id} className="flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-slate-800">{item.genetic_name}</p>
                      <p className="text-xs text-slate-500 font-mono">{item.lot_code} - {formatGrams(item.grams)}</p>
                    </div>
                    <button type="button" onClick={() => removeFromCart(item.lot_id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-700">
                  <span>Total</span>
                  <span className="font-mono">{formatGrams(cartTotal)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-ong">Producto</label><input value={productDesc} onChange={e => setProductDesc(e.target.value)} className="input-ong" /></div>
              <div><label className="label-ong">Fecha y hora</label><input type="datetime-local" value={dispensedAt} onChange={e => setDispensedAt(e.target.value)} className="input-ong" /></div>
            </div>
            <div><label className="label-ong">Observaciones</label><textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} className="input-ong resize-none" placeholder="Opcional..." /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setOpen(false); reset() }}>Cancelar</Button>
              <Button type="submit" loading={loading} disabled={cart.length === 0}>Registrar {cart.length > 0 ? `(${formatGrams(cartTotal)})` : ""}</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}