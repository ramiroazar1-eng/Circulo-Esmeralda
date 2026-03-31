"use client"
import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"

export default function ReceiptButton({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleReceipt() {
    setLoading(true)
    const res = await fetch(`/api/payments/receipt?id=${paymentId}`)
    if (!res.ok) { alert("Error al generar recibo"); setLoading(false); return }
    const html = await res.text()
    const win = window.open("", "_blank")
    if (win) { win.document.write(html); win.document.close() }
    setLoading(false)
  }

  return (
    <button onClick={handleReceipt} disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-[#2d5a27] hover:text-[#4d8a3d] border border-[#b8daa8] hover:border-[#4d8a3d] rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
      Recibo
    </button>
  )
}
