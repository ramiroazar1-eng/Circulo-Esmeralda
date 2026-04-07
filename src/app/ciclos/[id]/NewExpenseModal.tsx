"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"
import { createClient } from "@/lib/supabase/client"

const CATEGORIES = [
  { value: "sueldo",        label: "Sueldo" },
  { value: "alquiler",      label: "Alquiler" },
  { value: "expensas",      label: "Expensas" },
  { value: "servicios",     label: "Servicios (luz, agua, internet)" },
  { value: "insumos",       label: "Insumos" },
  { value: "equipamiento",  label: "Equipamiento" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "otros",         label: "Otros" },
]

export default function NewExpenseModal({ cycleId }: { cycleId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const usefulCycles = parseInt(form.get("useful_cycles") as string) || 1
    const totalAmount = parseFloat(form.get("total_amount") as string)
    const allocatedAmount = totalAmount / usefulCycles

    const res = await fetch("/api/cycles/expense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle_id: cycleId,
        category: form.get("category"),
        description: form.get("description"),
        supplier: form.get("supplier") || null,
        invoice_number: form.get("invoice_number") || null,
        quantity: parseFloat(form.get("quantity") as string) || null,
        unit: form.get("unit") || null,
        unit_price: parseFloat(form.get("unit_price") as string) || null,
        total_amount: totalAmount,
        purchase_date: form.get("purchase_date"),
        useful_cycles: usefulCycles,
        allocated_amount: allocatedAmount,
        notes: form.get("notes") || null,
      })
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? "Error al guardar"); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Agregar gasto</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea] sticky top-0 bg-white">
            <h2 className="text-sm font-bold text-[#1a2e1a]">Agregar gasto</h2>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label-ong">Categoria *</label>
                <select name="category" required className="input-ong">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label-ong">Descripcion *</label>
                <input name="description" required className="input-ong" placeholder="Ej: Nutriente A, Sueldo enero..." />
              </div>
              <div>
                <label className="label-ong">Proveedor</label>
                <input name="supplier" className="input-ong" placeholder="Nombre del proveedor" />
              </div>
              <div>
                <label className="label-ong">Nro. factura/recibo</label>
                <input name="invoice_number" className="input-ong" placeholder="0001-00001234" />
              </div>
              <div>
                <label className="label-ong">Cantidad</label>
                <input name="quantity" type="number" step="0.01" className="input-ong" placeholder="Ej: 1" />
              </div>
              <div>
                <label className="label-ong">Unidad</label>
                <input name="unit" className="input-ong" placeholder="kg, litro, unidad..." />
              </div>
              <div>
                <label className="label-ong">Precio unitario</label>
                <input name="unit_price" type="number" step="0.01" className="input-ong" placeholder="$" />
              </div>
              <div>
                <label className="label-ong">Monto total *</label>
                <input name="total_amount" type="number" step="0.01" required className="input-ong" placeholder="$" />
              </div>
              <div>
                <label className="label-ong">Fecha *</label>
                <input name="purchase_date" type="date" required className="input-ong" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div>
                <label className="label-ong">Dura cuantos ciclos?</label>
                <input name="useful_cycles" type="number" min="1" className="input-ong" defaultValue="1" />
                <p className="text-xs text-[#9ab894] mt-1">El monto se prorratea entre los ciclos</p>
              </div>
              <div className="col-span-2">
                <label className="label-ong">Notas</label>
                <textarea name="notes" rows={2} className="input-ong resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Guardar gasto</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}