"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { PageHeader, Card, Button, Alert } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"

export default function EditarPacientePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [patient, setPatient] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [physicians, setPhysicians] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data: p } = await supabase.from("patients").select("*").eq("id", id).single()
      const { data: pl } = await supabase.from("membership_plans").select("id, name").eq("is_active", true)
      const { data: ph } = await supabase.from("profiles").select("id, full_name").eq("role", "medico").eq("is_active", true)
      setPatient(p)
      setPlans(pl ?? [])
      setPhysicians(ph ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const supabase = createClient()

    const { error: err } = await supabase.from("patients").update({
      full_name:             form.get("full_name"),
      dni:                   form.get("dni"),
      birth_date:            form.get("birth_date") || null,
      phone:                 form.get("phone") || null,
      email:                 form.get("email") || null,
      address:               form.get("address") || null,
      reprocann_ref:         form.get("reprocann_ref") || null,
      reprocann_expiry:      form.get("reprocann_expiry") || null,
      status:                form.get("status"),
      membership_plan_id:    form.get("membership_plan_id") || null,
      treating_physician_id: form.get("treating_physician_id") || null,
      internal_notes:        form.get("internal_notes") || null,
      updated_at:            new Date().toISOString(),
    }).eq("id", id)

    if (err) { setError(err.message); setSaving(false); return }

    setSuccess(true)
    setSaving(false)
    setTimeout(() => router.push(`/pacientes/${id}`), 1200)
  }

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <BackButton label="Volver a la ficha" />
        <PageHeader
          title={`Editar — ${patient.full_name}`}
          description="Modificá los datos del paciente"
        />
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">Paciente actualizado correctamente. Redirigiendo...</Alert>}

          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Datos personales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label-ong">Nombre y apellido *</label>
                <input name="full_name" required defaultValue={patient.full_name} className="input-ong" />
              </div>
              <div>
                <label className="label-ong">DNI *</label>
                <input name="dni" required defaultValue={patient.dni} className="input-ong font-mono" />
              </div>
              <div>
                <label className="label-ong">Fecha de nacimiento</label>
                <input name="birth_date" type="date" defaultValue={patient.birth_date ?? ""} className="input-ong" />
              </div>
              <div>
                <label className="label-ong">Telefono</label>
                <input name="phone" type="tel" defaultValue={patient.phone ?? ""} className="input-ong" />
              </div>
              <div>
                <label className="label-ong">Email</label>
                <input name="email" type="email" defaultValue={patient.email ?? ""} className="input-ong" />
              </div>
              <div className="col-span-2">
                <label className="label-ong">Direccion</label>
                <input name="address" defaultValue={patient.address ?? ""} className="input-ong" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">REPROCANN</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-ong">Numero / referencia</label>
                <input name="reprocann_ref" defaultValue={patient.reprocann_ref ?? ""} className="input-ong font-mono" />
              </div>
              <div>
                <label className="label-ong">Fecha de vencimiento</label>
                <input name="reprocann_expiry" type="date" defaultValue={patient.reprocann_expiry ?? ""} className="input-ong" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Estado y asignaciones</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-ong">Estado del paciente</label>
                <select name="status" defaultValue={patient.status} className="input-ong">
                  <option value="activo">Activo</option>
                  <option value="pendiente_documental">Pendiente documental</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div>
                <label className="label-ong">Plan de membresia</label>
                <select name="membership_plan_id" defaultValue={patient.membership_plan_id ?? ""} className="input-ong">
                  <option value="">Sin plan asignado</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {physicians.length > 0 && (
                <div className="col-span-2">
                  <label className="label-ong">Medico tratante</label>
                  <select name="treating_physician_id" defaultValue={patient.treating_physician_id ?? ""} className="input-ong">
                    <option value="">Sin asignar</option>
                    {physicians.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Notas internas</h2>
            <textarea
              name="internal_notes"
              rows={3}
              defaultValue={patient.internal_notes ?? ""}
              className="input-ong resize-none"
              placeholder="Observaciones internas..."
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Link href={`/pacientes/${id}`}>
              <Button variant="secondary" type="button">Cancelar</Button>
            </Link>
            <Button type="submit" loading={saving}>Guardar cambios</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
