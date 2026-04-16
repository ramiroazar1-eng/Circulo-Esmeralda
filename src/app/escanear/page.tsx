"use client"
import { useState, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { BackButton } from "@/components/ui/BackButton"
import { Pill, Sprout, ScanLine, X } from "lucide-react"

const QRCameraScanner = lazy(() => import("@/components/qr/QRCameraScanner"))

export default function EscanearPage() {
  const [scanning, setScanning] = useState(false)
  const router = useRouter()

  function handleRoomScan(value: string) {
    console.log("QR scanned:", value)
    setScanning(false)
    const token = value.includes("/r/") ? value.split("/r/")[1].split("?")[0] : value.trim()
    router.push(`/r/${token}`)
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      <BackButton label="Volver al dashboard" />
      {scanning && (
        <Suspense fallback={null}>
          <QRCameraScanner onScan={handleRoomScan} onClose={() => setScanning(false)} />
        </Suspense>
      )}

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Escanear</h1>
        <p className="text-sm text-slate-500 mt-0.5">Selecciona que queres hacer</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Dispensa */}
        <button
          onClick={() => router.push("/dispensas/qr")}
          className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 hover:border-[#4d8a3d] hover:bg-[#f5faf3] transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
            <Pill className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Escanear dispensa</p>
            <p className="text-xs text-slate-500 mt-0.5">Escanear QR del paciente y lote para registrar una dispensa</p>
          </div>
        </button>

        {/* Sala */}
        <button
          onClick={() => setScanning(true)}
          className="flex items-center gap-4 bg-white border border-[#ddecd8] rounded-xl p-5 hover:border-[#4d8a3d] hover:bg-[#f5faf3] transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-[#2d5a27] flex items-center justify-center shrink-0">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1a2e1a]">Escanear sala</p>
            <p className="text-xs text-[#6b8c65] mt-0.5">Escanear QR de la sala para registrar eventos e insumos del dia</p>
          </div>
        </button>
      </div>

      <div className="bg-[#f5faf3] border border-[#ddecd8] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ScanLine className="w-4 h-4 text-[#2d5a27]" />
          <p className="text-xs font-medium text-[#1a2e1a]">Como funciona</p>
        </div>
        <p className="text-xs text-[#6b8c65]">Para dispensar: escaneÃƒÂ¡ el QR del paciente y luego el del lote.</p>
        <p className="text-xs text-[#6b8c65] mt-1">Para registrar en sala: escaneÃƒÂ¡ el QR pegado en la pared de la sala.</p>
      </div>
    </div>
  )
}