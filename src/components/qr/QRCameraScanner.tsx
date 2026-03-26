"use client"
import { useEffect, useRef, useState } from "react"
import { X, Camera } from "lucide-react"

interface Props {
  onScan: (value: string) => void
  onClose: () => void
}

export default function QRCameraScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const scannerRef = useRef<any>(null)
  const elementId = "qr-camera-scanner"

  useEffect(() => {
    let scanner: any = null

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        scanner = new Html5Qrcode(elementId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            scanner.stop().catch(() => {})
            onScan(decodedText)
          },
          () => {}
        )
        setStarted(true)
      } catch (err: any) {
        setError("No se pudo acceder a la camara. Verifica los permisos.")
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-900">Escanear QR</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={onClose} className="mt-4 text-xs text-slate-500 underline">Cerrar</button>
            </div>
          ) : (
            <>
              <div id={elementId} className="w-full rounded-lg overflow-hidden" style={{ minHeight: 280 }} />
              <p className="text-xs text-slate-400 text-center mt-3">
                Apunta la camara al codigo QR
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
