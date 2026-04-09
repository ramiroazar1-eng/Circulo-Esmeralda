"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"

const CATEGORIES = [
  { value: "fertilizante", label: "Fertilizante" },
  { value: "sustrato", label: "Sustrato" },
  { value: "packaging", label: "Packaging" },
  { value: "limpieza", label: "Limpieza" },
  { value: "herramienta", label: "Herramienta" },
  { value: "preventivo", label: "Preventivo" },
  { value: "otro", label: "Otro" },
]

const UNITS = ["kg", "g", "l", "ml", "unidad", "bolsa", "rollo", "caja", "par"]

export default function NewSupplyProductModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/supplies/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        category: form.get("category"),
        unit: form.get("unit"),
        stock_alert_threshold: parseFloat(form.get("stock_alert_threshold") as string) || 0,
        notes: form.get("notes") || null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setOpen(false)
    router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo producto</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Nuevo producto</h2>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div><label className="label-ong">Nombre *</label><input name="name" required className="input-ong" placeholder="Ej: Nutriflor A" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Categoria *</label>
                <select name="category" required className="input-ong">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-ong">Unidad *</label>
                <select name="unit" required className="input-ong">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label-ong">Alerta de stock minimo</label><input name="stock_alert_threshold" type="number" min="0" step="0.1" className="input-ong" placeholder="0" /></div>
            <div><label className="label-ong">Notas</label><textarea name="notes" rows={2} className="input-ong resize-none" /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Crear producto</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}