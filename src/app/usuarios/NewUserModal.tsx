"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button, Alert } from "@/components/ui"

export default function NewUserModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [role, setRole] = useState("")
  const [patients, setPatients] = useState<any[]>([])
  const router = useRouter()
  const isPatient = role === "paciente"

  useEffect(() => {
    if (open && isPatient) {
      const supabase = createClient()
      supabase.from("patients").select("id, full_name, dni").is("deleted_at", null).order("full_name")
        .then(({ data }) => setPatients(data ?? []))
    }
  }, [open, isPatient])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null); setSuccess(null)
    const form = new FormData(e.currentTarget)
    const body: any = { email: form.get("email"), full_name: form.get("full_name"), role: form.get("role"), patient_id: form.get("patient_id") || null, use_invite: isPatient }
    if (!isPatient) body.password = form.get("password")
    const res = await fetch("/api/admin/create-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Error al crear usuario"); setLoading(false); return }
    setSuccess(isPatient ? `Invitacion enviada a ${form.get("email")}` : "Usuario creado correctamente.")
    setLoading(false)
    setTimeout(() => { setOpen(false); setSuccess(null); setRole(""); router.refresh() }, 2500)
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Nuevo usuario</Button>

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-[#1a2e1a]">Nuevo usuario</h2>
            <button onClick={() => { setOpen(false); setRole("") }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success"><div className="flex items-center gap-2">{isPatient && <Mail className="w-4 h-4 shrink-0" />}{success}</div></Alert>}
            <div><label className="label-ong">Nombre completo *</label><input name="full_name" required className="input-ong" placeholder="Apellido, Nombre" /></div>
            <div><label className="label-ong">Email *</label><input name="email" type="email" required className="input-ong" placeholder="usuario@email.com" /></div>
            <div>
              <label className="label-ong">Rol *</label>
              <select name="role" required className="input-ong" value={role} onChange={e => setRole(e.target.value)}>
                <option value="">Selecciona un rol...</option>
                <option value="administrativo">Administrativo</option>
                <option value="medico">Medico</option>
                <option value="biologo">Biologo</option>
                <option value="paciente">Paciente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {role && !isPatient && (
              <div><label className="label-ong">Contrasena inicial *</label><input name="password" type="password" required minLength={8} className="input-ong" placeholder="Minimo 8 caracteres" /></div>
            )}
            {isPatient && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div><p className="text-xs font-medium text-blue-800">Invitacion por email</p><p className="text-xs text-blue-600 mt-0.5">El paciente recibira un email para configurar su propia contrasena.</p></div>
              </div>
            )}
            {isPatient && (
              <div>
                <label className="label-ong">Vincular con ficha de paciente *</label>
                <select name="patient_id" required className="input-ong">
                  <option value="">Selecciona el paciente...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name} — DNI {p.dni}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setOpen(false); setRole("") }}>Cancelar</Button>
              <Button type="submit" loading={loading}>{isPatient ? <><Mail className="w-3.5 h-3.5" />Enviar invitacion</> : "Crear usuario"}</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
