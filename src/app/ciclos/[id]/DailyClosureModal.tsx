"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, X, Download } from "lucide-react"
import { Button, Alert } from "@/components/ui"

interface Closure {
  id: string
  closure_date: string
  events_count: number
  events_hash: string
  closed_by_profile?: { full_name: string }
}

interface Props {
  cycleId: string
  closures: Closure[]
}

export default function DailyClosureModal({ cycleId, closures }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/cycles/close-daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle_id: cycleId,
        closure_date: form.get("closure_date"),
        notes: form.get("notes") || null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setSuccess(`Cierre registrado. ${data.events_count} eventos bloqueados.`)
    setLoading(false)
    setTimeout(() => { setOpen(false); setSuccess(null); router.refresh() }, 2000)
  }

  function downloadPdf(closureId: string) {
    window.open(`/api/cycles/closure-pdf?id=${closureId}`, "_blank")
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Lock className="w-3.5 h-3.5" />Cierre diario
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">Cierre de jornada</h2>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && <Alert variant="error">{error}</Alert>}
                  {success && <Alert variant="success">{success}</Alert>}
                  <div>
                    <label className="label-ong">Fecha de cierre *</label>
                    <input name="closure_date" type="date" required className="input-ong" defaultValue={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div>
                    <label className="label-ong">Observaciones</label>
                    <textarea name="notes" rows={2} className="input-ong resize-none" placeholder="Notas del cierre..." />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    <p className="text-xs font-medium text-amber-800">Los eventos del dia quedaran bloqueados y no podran editarse.</p>
                    <p className="text-xs text-amber-600 mt-0.5">Correcciones posteriores deben registrarse como nuevos eventos.</p>
                  </div>
                  <Button type="submit" loading={loading} className="w-full">
                    <Lock className="w-3.5 h-3.5" />Cerrar jornada
                  </Button>
                </form>

                {closures.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Cierres anteriores</p>
                    <div className="space-y-2">
                      {closures.map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {new Date(c.closure_date + "T12:00:00").toLocaleDateString("es-AR")}
                            </p>
                            <p className="text-xs text-slate-500">{c.events_count} eventos - {c.closed_by_profile?.full_name ?? "-"}</p>
                          </div>
                          <button
                            onClick={() => downloadPdf(c.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-3.5 h-3.5" />PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}