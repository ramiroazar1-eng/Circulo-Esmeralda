"use client"
import { useState } from "react"
import { Download, QrCode, Loader2, RefreshCw } from "lucide-react"

interface Props {
  entityId: string
  entityType: "patient" | "lot"
  entityName: string
  currentToken?: string | null
}

export default function QRDisplay({ entityId, entityType, entityName, currentToken }: Props) {
  const [qrData, setQrData] = useState<{ qrDataUrl: string; token: string; qrUrl: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateQR() {
    setLoading(true); setError(null)
    const body = entityType === "patient" ? { patientId: entityId } : { lotId: entityId }
    const res = await fetch(`/api/qr/${entityType === "patient" ? "patient" : "lot"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setQrData(data)
    setLoading(false)
  }

  function downloadQR() {
    if (!qrData) return
    const link = document.createElement("a")
    link.href = qrData.qrDataUrl
    link.download = `qr-${entityType}-${entityName.replace(/\s+/g, "-")}.png`
    link.click()
  }

  function printCard() {
    if (!qrData) return
    const win = window.open("", "_blank")
    if (!win) return
    const isPatient = entityType === "patient"
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${entityName}</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; }
          .card { background: white; border-radius: 16px; padding: 24px; text-align: center; width: 280px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; }
          .logo { font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; }
          .qr-img { width: 200px; height: 200px; margin: 0 auto 16px; display: block; }
          .name { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .sub { font-size: 11px; color: #94a3b8; margin-top: 4px; }
          .token { font-family: monospace; font-size: 10px; color: #cbd5e1; margin-top: 12px; }
          .divider { border: none; border-top: 1px solid #f1f5f9; margin: 12px 0; }
          @media print { body { background: white; } .card { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">Cannabis Medicinal · ONG</div>
          <img src="${qrData.qrDataUrl}" class="qr-img" alt="QR" />
          <hr class="divider" />
          <div class="name">${entityName}</div>
          ${isPatient ? '<div class="sub">Socio / Paciente</div>' : `<div class="sub">Lote de produccion</div>`}
          <div class="token">${qrData.token}</div>
        </div>
        <script>window.onload = () => window.print()</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  if (!qrData) {
    return (
      <div>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <button
          onClick={generateQR}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-3 py-1.5 hover:border-slate-400 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
          {currentToken ? "Ver QR" : "Generar QR"}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <img src={qrData.qrDataUrl} alt="QR Code" className="w-40 h-40" />
      <p className="font-mono text-xs text-slate-400">{qrData.token}</p>
      <div className="flex gap-2">
        <button onClick={downloadQR} className="inline-flex items-center gap-1.5 text-xs bg-slate-900 text-white rounded px-3 py-1.5">
          <Download className="w-3.5 h-3.5" />Descargar
        </button>
        <button onClick={printCard} className="inline-flex items-center gap-1.5 text-xs bg-white text-slate-700 border border-slate-300 rounded px-3 py-1.5">
          Imprimir tarjeta
        </button>
        <button onClick={() => setQrData(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
