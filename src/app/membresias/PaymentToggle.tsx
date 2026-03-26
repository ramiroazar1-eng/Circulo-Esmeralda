"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui"
import { CheckCircle2 } from "lucide-react"

export default function PaymentToggle({ patientId, year, month, amount }: { patientId: string; year: number; month: number; amount: number | null }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  async function markPaid() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: patient } = await supabase.from("patients").select("membership_plan_id").eq("id", patientId).single()
    if (!patient?.membership_plan_id) { alert("El paciente no tiene un plan asignado."); setLoading(false); return }
    await supabase.from("membership_periods").upsert({ patient_id: patientId, plan_id: patient.membership_plan_id, period_year: year, period_month: month, amount: amount ?? 0, payment_status: "pagado", paid_at: new Date().toISOString(), registered_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "patient_id,period_year,period_month" })
    setLoading(false)
    router.refresh()
  }
  return <Button variant="secondary" size="sm" loading={loading} onClick={markPaid}>{!loading && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}Marcar pagado</Button>
}
