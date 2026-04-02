"use client"
import { useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function ViewManualButton({ filePath }: { filePath: string | null }) {
  const [loading, setLoading] = useState(false)
  if (!filePath) return null

  async function handleView() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.storage.from("manuales").createSignedUrl(filePath!, 60)
    if (error || !data?.signedUrl) { alert("No se pudo abrir el archivo"); setLoading(false); return }
    window.open(data.signedUrl, "_blank")
    setLoading(false)
  }

  return (
    <button onClick={handleView} disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 hover:border-slate-400 transition-colors disabled:opacity-50">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
      Ver
    </button>
  )
}
