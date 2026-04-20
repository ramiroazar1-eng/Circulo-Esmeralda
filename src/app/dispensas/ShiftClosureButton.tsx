"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Scale, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import { Button, Alert } from "@/components/ui"
import { formatGrams } from "@/lib/utils"

export default function ShiftClosureButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actualGrams, setActualGrams] = useState("")
  const [explanation, setExplanation] = useState("")
  const [requiresExplanation, setRequiresExplanation] = useState(false)
  const [difference, setDifference] = useState<number | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!actualGrams) { setError("Ingresa el peso real del stock"); return }
    setLoading(true); setError(null)
    const res = await fetch("/api/shift/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actual_grams: parseFloat(actualGrams),
        explanation: explanation || null
      })
    })
    const data = await res.json()
    if (!res.ok) {
      if (data.requires_explanation) {
        setRequiresExplanation(true)
        setDifference(data.difference)
        setError(data.error)
        setLoading(false)
        return
      }
      setError(data.error ?? "Error al cerrar turno")
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    setTimeout(() => { setOpen(false); setSuccess(false); setActualGrams(""); setExplanation(""); setRequiresExplanation(false); router.refresh() }, 2000)
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Scale className="w-3.5 h-3.5" />Cerrar turno
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-bold text-slate-800">Cierre de turno</h2>
                </div>
                <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && <Alert variant="error">{error}</Alert>}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-medium text-green-800">Turno cerrado correctamente</p>
                  </div>
                )}
                {!success && (
                  <>
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-slate-500 leading-relaxed">Pesá el stock operativo disponible e ingresá el peso real. El sistema va a calcular la diferencia automáticamente.</p>
                    </div>
                    <div>
                      <label className="label-ong">Peso real del stock (gramos) *</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={actualGrams}
                        onChange={e => setActualGrams(e.target.value)}
                        className="input-ong"
                        placeholder="Ej: 342.5"
                      />
                    </div>
                    {requiresExplanation && difference !== null && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <p className="text-xs font-semibold text-red-800">Diferencia de {difference.toFixed(1)}g detectada</p>
                        </div>
                        <div>
                          <label className="label-ong">Explicación obligatoria *</label>
                          <textarea
                            required
                            rows={3}
                            value={explanation}
                            onChange={e => setExplanation(e.target.value)}
                            className="input-ong resize-none"
                            placeholder="Describí qué pasó con la diferencia..."
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-3 pt-1">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                      <Button type="submit" size="sm" loading={loading}>
                        <Scale className="w-3.5 h-3.5" />Cerrar turno
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
