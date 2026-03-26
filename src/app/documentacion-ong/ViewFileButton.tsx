"use client"
import { useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  filePath: string | null
  bucketName: "patient-documents" | "org-documents"
}

export default function ViewFileButton({ filePath, bucketName }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!filePath) return null

  async function handleView() {
    if (!filePath) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: signError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 60) // URL valida por 60 segundos

    if (signError || !data?.signedUrl) {
      setError("No se pudo abrir el archivo")
      setLoading(false)
      return
    }

    window.open(data.signedUrl, "_blank")
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-1">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        onClick={handleView}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 hover:border-slate-400 transition-colors disabled:opacity-50"
        title="Ver archivo"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
        Ver
      </button>
    </div>
  )
}
