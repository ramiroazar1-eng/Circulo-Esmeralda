"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"

export default function DeleteManualButton({ manualId, filePath, title }: { manualId: string; filePath: string | null; title: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Eliminar "${title}"? Esta accion no se puede deshacer.`)) return
    setLoading(true)
    const res = await fetch("/api/manuales/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: manualId, file_path: filePath })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setLoading(false); return }
    router.refresh()
  }

  return (
    <button onClick={handleDelete} disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 rounded px-2 py-1 transition-colors disabled:opacity-50">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
    </button>
  )
}
