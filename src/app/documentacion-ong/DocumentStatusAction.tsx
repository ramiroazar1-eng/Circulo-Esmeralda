"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  documentId: string
  currentStatus: string
  table: "patient_documents" | "org_documents"
  isReprocann?: boolean
}

export default function DocumentStatusAction({ documentId, currentStatus, table, isReprocann }: Props) {
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showObservation, setShowObservation] = useState(false)
  const [observation, setObservation] = useState("")
  const router = useRouter()

  if (currentStatus === "faltante" || currentStatus === "pendiente_vinculacion") return null

  async function changeStatus(newStatus: string, obs?: string) {
    setLoading(true)
    setShowMenu(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const updateData: any = {
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (newStatus === "observado" && obs) updateData.observations = obs
    if (newStatus !== "observado") updateData.observations = null

    await supabase.from(table).update(updateData).eq("id", documentId)
    setLoading(false)
    setShowObservation(false)
    setObservation("")
    router.refresh()
  }

  if (showObservation) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={observation}
          onChange={e => setObservation(e.target.value)}
          placeholder="Motivo de la observacion..."
          className="text-xs border border-slate-300 rounded px-2 py-1 w-48"
          autoFocus
          onKeyDown={e => e.key === "Enter" && observation.trim() && changeStatus("observado", observation)}
        />
        <button
          onClick={() => changeStatus("observado", observation)}
          disabled={!observation.trim() || loading}
          className="text-xs bg-orange-500 text-white rounded px-2 py-1.5 disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Observar"}
        </button>
        <button onClick={() => setShowObservation(false)} className="text-xs text-slate-400 hover:text-slate-600">
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-2 py-1 hover:border-slate-400 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Revisar"}
        {!loading && <ChevronDown className="w-3 h-3" />}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 w-48 py-1">
            {currentStatus !== "aprobado" && (
              <button
                onClick={() => changeStatus("aprobado")}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-green-50 text-green-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aprobar
              </button>
            )}
            <button
              onClick={() => { setShowMenu(false); setShowObservation(true) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-orange-50 text-orange-700"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Observar
            </button>
            {currentStatus !== "pendiente_revision" && (
              <button
                onClick={() => changeStatus("pendiente_revision")}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-amber-50 text-amber-700"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Volver a pendiente
              </button>
            )}
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => changeStatus("vencido")}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-red-50 text-red-700"
            >
              <XCircle className="w-3.5 h-3.5" />
              Marcar vencido
            </button>
          </div>
        </>
      )}
    </div>
  )
}
