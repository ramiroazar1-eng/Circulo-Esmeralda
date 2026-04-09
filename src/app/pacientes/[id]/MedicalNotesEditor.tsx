"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Save, Edit2, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"

export default function MedicalNotesEditor({ patientId, initialNotes }: { patientId: string; initialNotes: string | null }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(initialNotes ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSave() {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/patients/medical-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId, medical_notes: notes || null })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setEditing(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div>
      {error && <div className="mb-2"><Alert variant="error">{error}</Alert></div>}
      {!editing ? (
        <div>
          {notes ? (
            <p className="text-sm text-slate-700 whitespace-pre-line">{notes}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">Sin notas clinicas registradas</p>
          )}
          <button
            onClick={() => setEditing(true)}
            className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Edit2 className="w-3 h-3" />Editar notas
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            className="input-ong resize-none text-sm"
            placeholder="Observaciones clinicas, evolucion, indicaciones medicas..."
          />
          <div className="flex gap-2">
            <Button size="sm" loading={loading} onClick={handleSave}>
              <Save className="w-3.5 h-3.5" />Guardar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setNotes(initialNotes ?? "") }}>
              <X className="w-3.5 h-3.5" />Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}