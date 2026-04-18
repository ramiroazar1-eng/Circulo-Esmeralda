"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, X, FileDown, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui"

export default function CloseCycleButton({ cycleId, cycleName, cycleType = "productivo" }: {
  cycleId: string
  cycleName: string
  cycleType?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [stockRemanente, setStockRemanente] = useState<number>(0)
  const router = useRouter()

  async function handleDownloadPdf() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/cycles/closure-pdf?cycle_id=${cycleId}`)
      if (!res.ok) { alert("Error al generar PDF"); setDownloading(false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${cycleName.replace(/\s+/g, "_")}_movimientos.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert("Error al descargar") }
    setDownloading(false)
  }

  async function handleClose(force = false) {
    setLoading(true)
    const res = await fetch("/api/cycles/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycle_id: cycleId, force })
    })
    const json = await res.json()

    if (json.warning) {
      setWarning(json.message)
      setStockRemanente(json.stock_remanente)
      setLoading(false)
      return
    }

    if (!res.ok) { alert(json.error ?? "Error al cerrar ciclo"); setLoading(false); return }
    setOpen(false); setWarning(null)
    router.refresh()
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => { setOpen(true); setWarning(null) }}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        {cycleType === "reproductivo" ? "Renovar ciclo" : "Cerrar ciclo"}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-slate-800">
                    {cycleType === "reproductivo" ? "Renovar ciclo reproductivo" : "Cerrar ciclo productivo"}
                  </h2>
                </div>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Warning de stock remanente */}
                {warning && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-red-800 mb-1">Stock remanente detectado</p>
                        <p className="text-xs text-red-700 leading-relaxed">{warning}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleDownloadPdf} disabled={downloading}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-red-300 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50">
                        <FileDown className="w-3.5 h-3.5" />
                        {downloading ? "Generando..." : "Descargar historial"}
                      </button>
                      <button onClick={() => handleClose(true)} disabled={loading}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 rounded-lg text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                        {loading ? "Cerrando..." : "Cerrar igual"}
                      </button>
                    </div>
                  </div>
                )}

                {!warning && (
                  <>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {cycleType === "reproductivo"
                        ? `Vas a cerrar "${cycleName}" para renovar las madres. Esta accion no se puede deshacer.`
                        : `Vas a cerrar "${cycleName}". Esta accion no se puede deshacer.`}
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-amber-800 mb-1">Exportar antes de cerrar</p>
                      <p className="text-xs text-amber-700 leading-relaxed mb-3">
                        Se recomienda descargar el historial completo de movimientos.
                      </p>
                      <button onClick={handleDownloadPdf} disabled={downloading}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-medium text-amber-800 hover:bg-amber-50 transition-colors disabled:opacity-50">
                        <FileDown className="w-3.5 h-3.5" />
                        {downloading ? "Generando PDF..." : "Descargar historial completo"}
                      </button>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                      <Button size="sm" loading={loading} onClick={() => handleClose(false)}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {cycleType === "reproductivo" ? "Confirmar renovacion" : "Confirmar cierre"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
