import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatARS, formatDate, MONTH_LABELS } from "@/lib/utils"
import type { CurrentMembership } from "@/types"
import PaymentToggle from "./PaymentToggle"

export default async function MembresiasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const { data: memberships } = await supabase.from("v_current_memberships").select("*")
  const list = (memberships ?? []) as CurrentMembership[]
  const pagados = list.filter(m => m.payment_status === "pagado").length
  const pendientes = list.filter(m => m.payment_status === "pendiente" || m.payment_status == null).length
  const vencidos = list.filter(m => m.payment_status === "vencido").length
  const totalRecaudado = list.filter(m => m.payment_status === "pagado").reduce((acc, m) => acc + (m.monthly_amount ?? 0), 0)

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title={`Membresias — ${MONTH_LABELS[month]} ${year}`} description="Estado de pagos del mes en curso" />
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Pagados" value={pagados} variant={pagados > 0 ? "ok" : "default"} />
        <StatCard label="Pendientes" value={pendientes} variant={pendientes > 0 ? "atencion" : "ok"} />
        <StatCard label="Vencidos" value={vencidos} variant={vencidos > 0 ? "critico" : "ok"} />
        <StatCard label="Recaudado" value={formatARS(totalRecaudado)} />
      </div>
      <Card padding={false}>
        {list.length === 0 ? <EmptyState title="Sin pacientes activos" /> : (
          <Table>
            <thead><tr><th>Paciente</th><th>Plan</th><th>Monto</th><th>Estado de pago</th><th>Fecha de pago</th><th>Accion</th></tr></thead>
            <tbody>
              {list.map(m => (
                <tr key={m.patient_id}>
                  <td className="font-medium text-slate-900">{m.full_name}</td>
                  <td>{m.plan_name ?? <span className="text-slate-400">Sin plan</span>}</td>
                  <td className="tabular-nums">{m.monthly_amount ? formatARS(m.monthly_amount) : "—"}</td>
                  <td><span className={`text-xs rounded px-1.5 py-0.5 border font-medium ${m.payment_status === "pagado" ? "bg-green-50 text-green-700 border-green-200" : m.payment_status === "vencido" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{m.payment_status === "pagado" ? "Pagado" : m.payment_status === "vencido" ? "Vencido" : "Pendiente"}</span></td>
                  <td>{m.paid_at ? formatDate(m.paid_at) : <span className="text-slate-400">—</span>}</td>
                  <td>{m.payment_status !== "pagado" && <PaymentToggle patientId={m.patient_id} year={year} month={month} amount={m.monthly_amount} />}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
