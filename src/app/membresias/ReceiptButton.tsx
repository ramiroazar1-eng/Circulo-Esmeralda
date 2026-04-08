"use client"
import { FileText } from "lucide-react"

export default function ReceiptButton({ paymentId }: { paymentId: string }) {
  return (
    <a
      href={`/api/payments/receipt?id=${paymentId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-[#2d5a27] hover:text-[#4d8a3d] border border-[#b8daa8] hover:border-[#4d8a3d] rounded-lg px-2.5 py-1.5 transition-colors"
    >
      <FileText className="w-3.5 h-3.5" />
      Recibo
    </a>
  )
}