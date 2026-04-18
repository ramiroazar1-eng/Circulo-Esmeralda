"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, X, Mail, CheckCircle2, Loader2 } from "lucide-react"
import { Button, Alert } from "@/components/ui"

export default function PortalAccessButton({ patientId, patientName, patientEmail, patientDni }: {
  patientId: string
  patientName: string
  patientEmail: string | null
  patientDni: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState(patientEmail ?? "")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError("El email es obligatorio"); return }
    setLoading(true); setError(null)
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        full_name: patientName,
        role: "paciente",
        patient_id: patientId,
        use_invite: true,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Error al crear acceso"); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
    setTimeout(() => { setOpen(false); setSuccess(false); router.refresh() }, 2500)
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="w-3.5 h-3.5" />
        Dar acceso al portal
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-[#1a2e1a]">Dar acceso al portal</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{patientName}</p>
                </div>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && <Alert variant="error">{error}</Alert>}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs font-medium text-green-800">Invitacion enviada a {email}</p>
                  </div>
                )}
                {!success && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                      <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                        El paciente va a recibir un email para configurar su contrasena y acceder al portal desde <strong>/mi-perfil</strong>.
                      </p>
                    </div>
                    <div>
                      <label className="label-ong">Email *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="email@ejemplo.com"
                        className="input-ong"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-1">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                      <Button type="submit" size="sm" loading={loading}>
                        <Mail className="w-3.5 h-3.5" />
                        Enviar invitacion
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
