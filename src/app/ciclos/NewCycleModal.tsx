"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Sprout, FlaskConical } from "lucide-react"
import { Button, Alert } from "@/components/ui"

const CYCLE_TYPES = [
  {
    value: "productivo",
    label: "Ciclo productivo",
    description: "Salas de floracion. Rota cada 60-90 dias. Se puede cerrar y abrir otro.",
    color: "#fbbf24",
  },
  {
    value: "reproductivo",
    label: "Ciclo reproductivo",
    description: "Sala de madres en vege continuo. Permanece activo hasta cambio de geneticas.",
    color: "#4ade80",
  },
]

export default function NewCycleModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cycleType, setCycleType] = useState<"productivo" | "reproductivo">("productivo")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/cycles/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: form.get("notes") || null, cycle_type: cycleType })
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? "Error al crear ciclo"); setLoading(false); return }
    setOpen(false); setCycleType("productivo"); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo ciclo</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea]">
            <div>
              <h2 className="text-sm font-bold text-[#1a2e1a]">Nuevo ciclo</h2>
              <p className="text-xs text-[#9ab894] mt-0.5">El nombre y fecha se generan automaticamente</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Tipo de ciclo *</p>
              <div className="space-y-2">
                {CYCLE_TYPES.map(ct => (
                  <button key={ct.value} type="button" onClick={() => setCycleType(ct.value as "productivo" | "reproductivo")}
                    className="w-full text-left rounded-xl border p-3 transition-all flex items-start gap-3"
                    style={{ background: cycleType === ct.value ? "rgba(45,90,39,0.06)" : "transparent", borderColor: cycleType === ct.value ? ct.color : "#e2e8f0" }}>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1a2e1a]">{ct.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{ct.description}</p>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center"
                      style={{ borderColor: cycleType === ct.value ? ct.color : "#cbd5e1", background: cycleType === ct.value ? ct.color : "transparent" }}>
                      {cycleType === ct.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {cycleType === "reproductivo" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-emerald-700 leading-relaxed">
                Este ciclo permanece activo hasta que se renueven las madres o cambien las geneticas.
              </div>
            )}
            <div>
              <label className="label-ong">Notas (opcional)</label>
              <textarea name="notes" rows={2} className="input-ong resize-none" placeholder="Observaciones iniciales..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Crear ciclo</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
