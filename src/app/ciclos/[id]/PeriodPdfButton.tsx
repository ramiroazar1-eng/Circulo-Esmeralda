"use client"
import { useState } from "react"
import { FileDown, X } from "lucide-react"
import { Button } from "@/components/ui"

export default function PeriodPdfButton({ cycleId }: { cycleId: string }) {
  const [open, setOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0])

  function handleDownload() {
    window.open(`/api/cycles/period-pdf?cycle_id=${cycleId}&from=${dateFrom}&to=${dateTo}`, "_blank")
    setOpen(false)
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <FileDown className="w-3.5 h-3.5" />Informe de trazabilidad
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">Informe de trazabilidad</h2>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-500">Genera un PDF por sala con todos los eventos e insumos del periodo seleccionado. Apto para imprimir y firmar.</p>
                <div>
                  <label className="label-ong">Desde</label>
                  <input type="date" className="input-ong" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="label-ong">Hasta</label>
                  <input type="date" className="input-ong" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleDownload}>
                    <FileDown className="w-3.5 h-3.5" />Descargar PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}