"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"

export default function NewCycleModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)

    const res = await fetch("/api/cycles/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: form.get("notes") || null })
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? "Error al crear ciclo"); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo ciclo</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea]">
            <div>
              <h2 className="text-sm font-bold text-[#1a2e1a]">Nuevo ciclo de produccion</h2>
              <p className="text-xs text-[#9ab894] mt-0.5">El nombre y fecha de inicio se generan automaticamente</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div>
              <label className="label-ong">Notas (opcional)</label>
              <textarea name="notes" rows={2} className="input-ong resize-none" placeholder="Observaciones iniciales del ciclo..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Crear ciclo</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}