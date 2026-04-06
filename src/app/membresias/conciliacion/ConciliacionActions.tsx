"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ConciliacionActions({ periodId }: { periodId: string }) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handle(action: "aprobar" | "rechazar") {
    setLoading(action)
    const res = await fetch("/api/payments/conciliar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period_id: periodId, action })
    })
    const json = await res.json()
    if (!res.ok) alert(json.error ?? "Error")
    else router.refresh()
    setLoading(null)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handle("aprobar")}
        disabled={!!loading}
        className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8] hover:bg-[#d4eecc] disabled:opacity-50 cursor-pointer"
      >
        {loading === "aprobar" ? "..." : "Aprobar"}
      </button>
      <button
        onClick={() => handle("rechazar")}
        disabled={!!loading}
        className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#fdf0f0] text-[#9b2020] border border-[#f0b8b8] hover:bg-[#fde0e0] disabled:opacity-50 cursor-pointer"
      >
        {loading === "rechazar" ? "..." : "Rechazar"}
      </button>
    </div>
  )
}