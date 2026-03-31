"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2, ChevronDown } from "lucide-react"

export default function DeletePatientButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()

  async function handleDelete(permanent: boolean) {
    setShowMenu(false)
    const msg = permanent
      ? `ELIMINAR DEFINITIVAMENTE a "${patientName}"? Se borran todos sus documentos, dispensas y datos. Esta accion NO se puede deshacer.`
      : `Dar de baja a "${patientName}"? El registro quedara archivado y no aparecera en el listado activo.`
    if (!confirm(msg)) return
    setLoading(true)
    const res = await fetch("/api/admin/delete-patient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, permanent })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setLoading(false); return }
    router.push("/pacientes")
  }

  return (
    <div className="relative">
      <div className="flex items-center">
        <button onClick={() => handleDelete(false)} disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-l-lg px-3 py-1.5 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Dar de baja
        </button>
        <button onClick={() => setShowMenu(!showMenu)} disabled={loading}
          className="inline-flex items-center border border-l-0 border-red-200 hover:border-red-400 rounded-r-lg px-1.5 py-1.5 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 w-52 py-1">
            <button onClick={() => handleDelete(false)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-amber-50 text-amber-700">
              <Trash2 className="w-3.5 h-3.5" />Dar de baja (archiva)
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button onClick={() => handleDelete(true)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-red-50 text-red-700 font-medium">
              <Trash2 className="w-3.5 h-3.5" />Eliminar definitivamente
            </button>
          </div>
        </>
      )}
    </div>
  )
}
