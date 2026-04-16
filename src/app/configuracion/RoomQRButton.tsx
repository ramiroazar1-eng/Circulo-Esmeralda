"use client"
import { useState } from "react"
import { QrCode, X, Printer } from "lucide-react"

interface Props {
  room: { id: string; name: string; qr_token: string }
}

export default function RoomQRButton({ room }: Props) {
  const [open, setOpen] = useState(false)

  if (!room.qr_token) return null

  const qrUrl = `${typeof window !== "undefined" ? window.location.origin : "https://www.circuloesmeralda.com.ar"}/r/${room.qr_token}`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`

  function handlePrint() {
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR ${room.name}</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: white; }
          .container { text-align: center; padding: 40px; border: 3px solid #14532d; border-radius: 16px; }
          h1 { color: #14532d; font-size: 28px; margin: 0 0 8px; }
          p { color: #6b8c65; font-size: 14px; margin: 0 0 24px; }
          img { width: 220px; height: 220px; }
          .footer { margin-top: 20px; font-size: 12px; color: #9ab894; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Circulo Esmeralda</h1>
          <p>${room.name}</p>
          <img src="${qrImageUrl}" alt="QR ${room.name}" />
          <div class="footer">Escanea para registrar eventos en esta sala</div>
        </div>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-[#2d5a27] hover:text-[#14532d] font-medium">
        <QrCode className="w-3.5 h-3.5" />Ver QR
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-xs">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">QR — {room.name}</h2>
                <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
              </div>
              <div className="p-5 flex flex-col items-center gap-4">
                <div className="bg-[#f5faf3] rounded-xl p-4 border border-[#ddecd8]">
                  <img src={qrImageUrl} alt={`QR ${room.name}`} className="w-48 h-48" />
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Pegar en la pared de {room.name}. Los operarios escanean para registrar eventos.
                </p>
                <button onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#14532d] py-2.5 text-sm font-medium text-white hover:bg-[#166534]">
                  <Printer className="w-4 h-4" />Imprimir QR
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}