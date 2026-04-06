"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Loader2 } from "lucide-react"

export default function PlanReviewButtons({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handleReview(status: "aprobado" | "rechazado") {
    setLoading(status)
    const res = await fetch("/api/plan-requests/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, status })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setLoading(null); return }
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleReview("aprobado")}
        disabled={loading !== null}
        className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 hover:bg-green-100 transition-colors disabled:opacity-50"
      >
        {loading === "aprobado" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        Aprobar
      </button>
      <button
        onClick={() => handleReview("rechazado")}
        disabled={loading !== null}
        className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        {loading === "rechazado" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        Rechazar
      </button>
    </div>
  )
}