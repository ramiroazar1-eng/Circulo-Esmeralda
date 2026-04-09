"use client"
import { useState, useEffect } from "react"
import { Plus, X, Trash2 } from "lucide-react"
import { Button, Alert } from "@/components/ui"

const CATEGORIES = [
  { value: "sueldo", label: "Sueldo" },
  { value: "alquiler", label: "Alquiler" },
  { value: "expensas", label: "Expensas" },
  { value: "servicios", label: "Servicios" },
  { value: "insumos", label: "Insumos" },
  { value: "equipamiento", label: "Equipamiento" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "otros", label: "Otros" },
]

const CATEGORY_LABELS: Record<string, string> = {
  sueldo: "Sueldo", alquiler: "Alquiler", expensas: "Expensas",
  servicios: "Servicios", insumos: "Insumos", equipamiento: "Equipamiento",
  mantenimiento: "Mantenimiento", otros: "Otros"
}

interface Template {
  id: string
  category: string
  description: string
  supplier: string | null
  amount: number
  is_active: boolean
}

export default function RecurringExpensesSection() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const res = await fetch("/api/recurring-expenses")
    const data = await res.json()
    setTemplates((data.data ?? []).filter((t: Template) => t.is_active))
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/recurring-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: form.get("category"),
        description: form.get("description"),
        supplier: form.get("supplier") || null,
        amount: parseFloat(form.get("amount") as string),
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setShowForm(false)
    setLoading(false)
    load()
  }

  async function handleDelete(id: string) {
    await fetch("/api/recurring-expenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    })
    load()
  }

  const total = templates.reduce((acc, t) => acc + t.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-500 mt-0.5">
            Se cargan automaticamente el 1 de cada mes y se distribuyen entre ciclos activos por m2.
            {total > 0 && <span className="ml-1 font-medium text-slate-700">Total mensual: ${total.toLocaleString("es-AR")}</span>}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(f => !f)}>
          <Plus className="w-3.5 h-3.5" />Agregar
        </Button>
      </div>

      {showForm && (
        <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
          {error && <div className="mb-3"><Alert variant="error">{error}</Alert></div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Categoria *</label>
                <select name="category" required className="input-ong">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-ong">Monto mensual *</label>
                <input name="amount" type="number" required min="1" step="0.01" className="input-ong" placeholder="$0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Descripcion *</label>
                <input name="description" required className="input-ong" placeholder="Ej: Sueldo operario" />
              </div>
              <div>
                <label className="label-ong">Proveedor</label>
                <input name="supplier" className="input-ong" placeholder="Opcional" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" size="sm" loading={loading}>Guardar</Button>
            </div>
          </form>
        </div>
      )}

      {templates.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">Sin gastos recurrentes configurados</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{t.description}</p>
                <p className="text-xs text-slate-500">
                  {CATEGORY_LABELS[t.category] ?? t.category}
                  {t.supplier && ` - ${t.supplier}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900">${t.amount.toLocaleString("es-AR")}/mes</span>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}