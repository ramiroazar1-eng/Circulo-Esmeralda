"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button, Alert } from "@/components/ui"

interface Props {
  patients: any[]
  currentMonth: number
  currentYear: number
  preselectedPatient?: any
  inline?: boolean
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export default function NewPaymentModal({ patients, currentMonth, currentYear, preselectedPatient, inline }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const selectedPatient = preselectedPatient ?? null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null)
    const form = new FormData(e.currentTarget)
    const patientId = form.get("patient_id") as string
    const patient = patients.find(p => p.id === patientId)

    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        plan_id: patient?.membership_plan?.id ?? null,
        period_month: parseInt(form.get("period_month") as string),
        period_year: parseInt(form.get("period_year") as string),
        amount: parseFloat(form.get("amount") as string),
        payment_date: form.get("payment_date"),
        payment_method: form.get("payment_method"),
        notes: form.get("notes") || null,
      })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setOpen(false); router.refresh()
  }

  const trigger = inline
    ? <button onClick={() => setOpen(true)} className="text-xs text-[#2d5a27] hover:text-[#4d8a3d] font-semibold underline">Registrar pago</button>
    : <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />Registrar pago</Button>

  if (!open) return trigger

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#ddecd8] shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef5ea]">
            <h2 className="text-sm font-bold text-[#1a2e1a]">Registrar pago de membresia</h2>
            <button onClick={() => setOpen(false)} className="text-[#9ab894] hover:text-[#3d6637]"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div>
              <label className="label-ong">Paciente *</label>
              <select name="patient_id" required defaultValue={preselectedPatient?.id ?? ""} className="input-ong">
                <option value="">Seleccionar paciente...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name} â€” {p.membership_plan?.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Mes *</label>
                <select name="period_month" required defaultValue={currentMonth} className="input-ong">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label-ong">AÃ±o *</label>
                <input name="period_year" type="number" required defaultValue={currentYear} className="input-ong" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-ong">Monto *</label>
                <input name="amount" type="number" step="0.01" required className="input-ong" placeholder="0.00" />
              </div>
              <div>
                <label className="label-ong">Fecha de pago *</label>
                <input name="payment_date" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="input-ong" />
              </div>
            </div>
            <div>
              <label className="label-ong">Forma de pago</label>
              <select name="payment_method" className="input-ong">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="debito">Debito</option>
                <option value="credito">Credito</option>
                <option value="mercadopago">MercadoPago</option>
              </select>
            </div>
            <div>
              <label className="label-ong">Observaciones</label>
              <input name="notes" className="input-ong" placeholder="Opcional..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>Guardar pago</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
