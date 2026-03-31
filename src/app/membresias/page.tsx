import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, SectionHeader, StatCard } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { CreditCard, CheckCircle2, Clock } from "lucide-react"
import NewPaymentModal from "./NewPaymentModal"
import ReceiptButton from "./ReceiptButton"

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

export default async function MembresiasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, dni, membership_plan:membership_plans(id, name, monthly_amount)")
    .eq("status", "activo")
    .is("deleted_at", null)
    .not("membership_plan_id", "is", null)
    .order("full_name")

  const { data: payments } = await supabase
    .from("membership_payments")
    .select("*")
    .eq("period_month", currentMonth)
    .eq("period_year", currentYear)

  const patientList = (patients ?? []) as any[]
  const paymentList = (payments ?? []) as any[]
  const paidIds = new Set(paymentList.map((p: any) => p.patient_id))
  const totalPagados = paymentList.length
  const totalPendientes = patientList.filter(p => !paidIds.has(p.id)).length
  const totalRecaudado = paymentList.reduce((acc: number, p: any) => acc + parseFloat(p.amount), 0)

  const { data: allPayments } = await supabase
    .from("membership_payments")
    .select("*, patient:patients(full_name, dni), plan:membership_plans(name)")
    .order("created_at", { ascending: false })
    .limit(30)

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader
        title="Membresias"
        description={`${MONTHS[currentMonth - 1]} ${currentYear} · Estado de pagos`}
        actions={<NewPaymentModal patients={patientList} currentMonth={currentMonth} currentYear={currentYear} />}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Pagados este mes" value={totalPagados} variant="ok" icon={CheckCircle2} />
        <StatCard label="Pendientes" value={totalPendientes} variant={totalPendientes > 0 ? "atencion" : "ok"} icon={Clock} />
        <StatCard label="Recaudado" value={`$${totalRecaudado.toLocaleString("es-AR")}`} icon={CreditCard} />
      </div>
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title={`Estado de pagos — ${MONTHS[currentMonth - 1]} ${currentYear}`} /></div>
        {patientList.length === 0 ? (
          <div className="pb-5"><EmptyState title="Sin pacientes con membresia activa" icon={CreditCard} /></div>
        ) : (
          <Table>
            <thead><tr><th>Paciente</th><th>DNI</th><th>Plan</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {patientList.map((p: any) => {
                const payment = paymentList.find((pay: any) => pay.patient_id === p.id)
                const isPaid = !!payment
                return (
                  <tr key={p.id}>
                    <td className="font-medium text-[#1a2e1a]">{p.full_name}</td>
                    <td className="font-mono text-xs">{p.dni}</td>
                    <td>{p.membership_plan?.name ?? "—"}</td>
                    <td className="tabular-nums">${parseFloat(p.membership_plan?.monthly_amount ?? 0).toLocaleString("es-AR")}</td>
                    <td>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8]"><span className="w-1.5 h-1.5 rounded-full bg-[#4caf35]" />Pagado</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#fdf8ec] text-[#8a6010] border border-[#e8d48a]"><span className="w-1.5 h-1.5 rounded-full bg-[#e8a820]" />Pendiente</span>
                      )}
                    </td>
                    <td>
                      {isPaid ? (
                        <ReceiptButton paymentId={payment.id} />
                      ) : (
                        <NewPaymentModal patients={patientList} currentMonth={currentMonth} currentYear={currentYear} preselectedPatient={p} inline />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Historial de pagos" /></div>
        {(!allPayments || allPayments.length === 0) ? (
          <div className="pb-5"><EmptyState title="Sin pagos registrados" icon={CreditCard} /></div>
        ) : (
          <Table>
            <thead><tr><th>Fecha</th><th>Paciente</th><th>Plan</th><th>Periodo</th><th>Monto</th><th>Metodo</th><th>Recibo</th></tr></thead>
            <tbody>
              {(allPayments as any[]).map((p: any) => (
                <tr key={p.id}>
                  <td>{new Date(p.payment_date).toLocaleDateString("es-AR")}</td>
                  <td className="font-medium text-[#1a2e1a]">{p.patient?.full_name ?? "—"}</td>
                  <td>{p.plan?.name ?? "—"}</td>
                  <td>{MONTHS[p.period_month - 1]} {p.period_year}</td>
                  <td className="tabular-nums font-medium">${parseFloat(p.amount).toLocaleString("es-AR")}</td>
                  <td className="capitalize">{p.payment_method}</td>
                  <td><ReceiptButton paymentId={p.id} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
