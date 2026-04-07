"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui"

export default function CloseCycleButton({ cycleId, cycleName }: { cycleId: string; cycleName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClose() {
    if (!confirm(`Cerrar el ciclo "${cycleName}"? Esta accion no se puede deshacer.`)) return
    setLoading(true)
    const res = await fetch("/api/cycles/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycle_id: cycleId })
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error ?? "Error al cerrar ciclo"); setLoading(false); return }
    router.refresh()
  }

  return (
    <Button variant="secondary" size="sm" loading={loading} onClick={handleClose}>
      <CheckCircle2 className="w-3.5 h-3.5" />
      Cerrar ciclo
    </Button>
  )
}