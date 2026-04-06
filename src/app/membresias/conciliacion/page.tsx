import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, SectionHeader } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { CreditCard } from "lucide-react"
import ConciliacionActions from "./ConciliacionActions"

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

export default async function ConciliacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["admin", "administrativo"].includes(profile.role)) redirect("/dashboard")

  const { data: pending } = await supabase
    .from("membership_periods")
    .select("id, period_year, period_month, amount, payment_status, comprobante_url, comprobante_uploaded_at, patient:patients(full_name, dni), plan:membership_plans(name)")
    .eq("payment_status", "pendiente_aprobacion")
    .order("comprobante_uploaded_at", { ascending: true })

  const { data: recent } = await supabase
    .from("membership_periods")
    .select("id, period_year, period_month, amount, payment_status, paid_at, comprobante_url, patient:patients(full_name, dni), plan:membership_plans(name)")
    .in("payment_status", ["pagado", "pendiente"])
    .not("comprobante_url", "is", null)
    .order("paid_at", { ascending: false })
    .limit(20)

  const pendingList = (pending ?? []) as any[]
  const recentList = (recent ?? []) as any[]

  return (
    <div className="space-y-5">
      <BackButton label="Volver a membresias" />
      <PageHeader
        title="Conciliacion de pagos"
        description="Comprobantes pendientes de aprobacion"
      />

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title={`Pendientes de aprobacion (${pendingList.length})`} />
        </div>
        {pendingList.length === 0 ? (
          <div className="pb-5"><EmptyState title="No hay comprobantes pendientes" icon={CreditCard} /></div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>DNI</th>
                <th>Plan</th>
                <th>Periodo</th>
                <th>Monto</th>
                <th>Enviado</th>
                <th>Comprobante</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pendingList.map((p: any) => (
                <tr key={p.id}>
                  <td className="font-medium text-[#1a2e1a]">{p.patient?.full_name}</td>
                  <td className="font-mono text-xs">{p.patient?.dni}</td>
                  <td>{p.plan?.name}</td>
                  <td>{MONTHS[p.period_month - 1]} {p.period_year}</td>
                  <td className="tabular-nums">${parseFloat(p.amount).toLocaleString("es-AR")}</td>
                  <td className="text-xs">{p.comprobante_uploaded_at ? new Date(p.comprobante_uploaded_at).toLocaleDateString("es-AR") : "-"}</td>
                  <td>
                    <a href={/api/payments/comprobante?path=+encodeURIComponent(p.comprobante_url)} target="_blank" className="text-xs text-blue-600 underline">Ver</a>
                  </td>
                  <td><ConciliacionActions periodId={p.id} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4"><SectionHeader title="Historial reciente" /></div>
        {recentList.length === 0 ? (
          <div className="pb-5"><EmptyState title="Sin historial" icon={CreditCard} /></div>
        ) : (
          <Table>
            <thead>
              <tr><th>Paciente</th><th>Periodo</th><th>Monto</th><th>Estado</th><th>Aprobado</th></tr>
            </thead>
            <tbody>
              {recentList.map((p: any) => (
                <tr key={p.id}>
                  <td className="font-medium text-[#1a2e1a]">{p.patient?.full_name}</td>
                  <td>{MONTHS[p.period_month - 1]} {p.period_year}</td>
                  <td className="tabular-nums">${parseFloat(p.amount).toLocaleString("es-AR")}</td>
                  <td>
                    {p.payment_status === "pagado" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8]">Pagado</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#fdf8ec] text-[#8a6010] border border-[#e8d48a]">Rechazado</span>
                    )}
                  </td>
                  <td className="text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString("es-AR") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}