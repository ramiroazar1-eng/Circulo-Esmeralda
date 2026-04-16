"use client"
import { useState, useRef, lazy, Suspense } from "react"
import { BackButton } from "@/components/ui/BackButton"
import { Alert } from "@/components/ui"
import { ScanLine, CheckCircle2, Loader2, ArrowRight, Camera, Lock, Unlock } from "lucide-react"
import { formatGrams } from "@/lib/utils"

const QRCameraScanner = lazy(() => import("@/components/qr/QRCameraScanner"))

interface LotData {
  id: string
  lot_code: string
  status: string
  genetic: { name: string } | null
  room: { name: string } | null
  stock_acopio: number
  stock_operativo: number
}

export default function QRTransferPage() {
  const [lot, setLot] = useState<LotData | null>(null)
  const [grams, setGrams] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function scanLot(value: string) {
    if (!value.trim()) return
    setLoading(true); setError(null)
    const token = value.includes("/l/") ? value.split("/l/")[1].split("?")[0] : value.trim()
    const res = await fetch(`/api/qr/scan-lot?token=${encodeURIComponent(token)}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Lote no encontrado"); setLoading(false); return }
    if (data.stock_acopio <= 0) { setError("Este lote no tiene stock en acopio"); setLoading(false); return }
    setLot(data); setLoading(false)
  }

  async function handleTransfer() {
    if (!lot || !grams) return
    setLoading(true); setError(null)
    const res = await fetch("/api/stock/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lot_id: lot.id,
        grams: parseFloat(grams),
        notes: notes || null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setSuccess(true); setLoading(false)
    setTimeout(() => {
      setSuccess(false); setLot(null); setGrams(""); setNotes(""); setError(null)
    }, 2500)
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Transferencia registrada</h2>
        <p className="text-sm text-slate-500">{grams}g de {lot?.lot_code} transferidos al operativo</p>
        <p className="text-xs text-slate-400">Escaneá otro lote para continuar...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {showCamera && (
        <Suspense fallback={null}>
          <QRCameraScanner onScan={v => { setShowCamera(false); scanLot(v) }} onClose={() => setShowCamera(false)} />
        </Suspense>
      )}

      <BackButton label="Volver a stock" />
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Transferir desde acopio</h1>
        <p className="text-sm text-slate-500 mt-0.5">Escanea el QR del lote para transferir al operativo</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!lot ? (
        <div className="card-ong p-6 space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#edf7e8] rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-[#2d5a27]" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Escanear QR del lote</h2>
            <p className="text-xs text-slate-500 mt-1">Escaneá la etiqueta del frasco del acopio</p>
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Escanear o escribir token..."
            className="input-ong text-center font-mono text-sm"
            onKeyDown={e => e.key === "Enter" && scanLot((e.target as HTMLInputElement).value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCamera(true)}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
              <Camera className="w-4 h-4" />Usar camara
            </button>
            <button onClick={() => scanLot(inputRef.current?.value ?? "")} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#14532d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#166534] disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Identificar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Info del lote */}
          <div className="card-ong p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono font-bold text-slate-900">{lot.lot_code}</p>
                <p className="text-xs text-slate-500">{lot.genetic?.name ?? "Sin genetica"} · {lot.room?.name ?? "-"}</p>
              </div>
              <button onClick={() => { setLot(null); setGrams(""); setNotes("") }}
                className="text-xs text-slate-400 hover:text-red-500">Cambiar</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-[#0f1f12] rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Lock className="w-3 h-3 text-[#7dc264]" />
                  <p className="text-xs text-[#7dc264]">Acopio</p>
                </div>
                <p className="text-lg font-bold text-white">{formatGrams(lot.stock_acopio)}</p>
              </div>
              <div className="bg-[#edf7e8] border border-[#b8daa8] rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Unlock className="w-3 h-3 text-[#2d5a27]" />
                  <p className="text-xs text-[#2d5a27]">Operativo actual</p>
                </div>
                <p className="text-lg font-bold text-[#1a2e1a]">{formatGrams(lot.stock_operativo)}</p>
              </div>
            </div>
          </div>

          {/* Formulario transferencia */}
          <div className="card-ong p-5 space-y-4">
            <div>
              <label className="label-ong text-center block">Gramos a transferir al operativo</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={lot.stock_acopio}
                value={grams}
                onChange={e => setGrams(e.target.value)}
                onKeyDown={e => e.key === "Enter" && grams && handleTransfer()}
                className="input-ong text-center text-2xl font-semibold font-mono mt-2"
                placeholder="0.0"
                autoFocus
              />
              {grams && parseFloat(grams) > 0 && (
                <p className="text-xs text-slate-400 mt-1 text-center">
                  Quedara en acopio: {formatGrams(lot.stock_acopio - parseFloat(grams))}
                </p>
              )}
            </div>
            <div>
              <label className="label-ong">Notas</label>
              <input type="text" className="input-ong" placeholder="Ej: Entrega semanal"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <button
              onClick={handleTransfer}
              disabled={loading || !grams || parseFloat(grams) <= 0 || parseFloat(grams) > lot.stock_acopio}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#14532d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#166534] disabled:opacity-60 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              Confirmar transferencia
            </button>
          </div>
        </div>
      )}
    </div>
  )
}