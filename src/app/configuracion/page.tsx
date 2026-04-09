import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card, Table, EmptyState, SectionHeader } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatARS, formatGrams } from "@/lib/utils"
import { CreditCard, FlaskConical, DoorOpen, RefreshCw } from "lucide-react"
import NewPlanModal from "./NewPlanModal"
import EditPlanButton from "./EditPlanButton"
import NewGeneticModal from "./NewGeneticModal"
import NewRoomModal from "./NewRoomModal"
import { EditGeneticButton, EditRoomButton } from "./EditGeneticRoomButtons"
import RecurringExpensesSection from "./RecurringExpensesSection"

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: plans } = await supabase.from("membership_plans").select("*").order("monthly_amount")
  const { data: genetics } = await supabase.from("genetics").select("*").order("name")
  const { data: rooms } = await supabase.from("rooms").select("*").order("name")

  const { data: patientCounts } = await supabase
    .from("patients")
    .select("membership_plan_id")
    .is("deleted_at", null)
    .eq("status", "activo")

  const countByPlan: Record<string, number> = {}
  for (const p of (patientCounts ?? [])) {
    if (p.membership_plan_id) {
      countByPlan[p.membership_plan_id] = (countByPlan[p.membership_plan_id] ?? 0) + 1
    }
  }

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader title="Configuracion" description="Planes, geneticas, salas y parametros del sistema" />

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Planes de membresia" actions={<NewPlanModal />} />
        </div>
        {(!plans || plans.length === 0) ? (
          <div className="pb-5"><EmptyState title="Sin planes definidos" icon={CreditCard} /></div>
        ) : (
          <Table>
            <thead>
              <tr><th>Nombre</th><th>Descripcion</th><th>Gramos</th><th>Monto mensual</th><th>Pacientes</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {plans.map((plan: any) => {
                const count = countByPlan[plan.id] ?? 0
                return (
                  <tr key={plan.id}>
                    <td className="font-medium text-slate-900">{plan.name}</td>
                    <td className="text-slate-500">{plan.description ?? "-"}</td>
                    <td className="tabular-nums">{plan.monthly_grams ? formatGrams(plan.monthly_grams) : "-"}</td>
                    <td className="tabular-nums font-medium">{formatARS(plan.monthly_amount)}</td>
                    <td>
                      {count > 0
                        ? <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">{count} paciente{count > 1 ? "s" : ""}</span>
                        : <span className="text-slate-400 text-xs">Sin pacientes</span>
                      }
                    </td>
                    <td>
                      <span className={`text-xs rounded px-1.5 py-0.5 border ${plan.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        {plan.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td><EditPlanButton plan={plan} patientCount={count} /></td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Geneticas" actions={<NewGeneticModal />} />
        </div>
        {(!genetics || genetics.length === 0) ? (
          <div className="pb-5"><EmptyState title="Sin geneticas definidas" icon={FlaskConical} /></div>
        ) : (
          <Table>
            <thead>
              <tr><th>Nombre</th><th>Descripcion</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {genetics.map((g: any) => (
                <tr key={g.id}>
                  <td className="font-medium text-slate-900">{g.name}</td>
                  <td className="text-slate-500">{g.description ?? "-"}</td>
                  <td>
                    <span className={`text-xs rounded px-1.5 py-0.5 border ${g.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      {g.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td><EditGeneticButton genetic={g} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Salas de produccion" actions={<NewRoomModal />} />
        </div>
        {(!rooms || rooms.length === 0) ? (
          <div className="pb-5"><EmptyState title="Sin salas definidas" icon={DoorOpen} /></div>
        ) : (
          <Table>
            <thead>
              <tr><th>Nombre</th><th>Descripcion</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {rooms.map((r: any) => (
                <tr key={r.id}>
                  <td className="font-medium text-slate-900">{r.name}</td>
                  <td className="text-slate-500">{r.description ?? "-"}</td>
                  <td>
                    <span className={`text-xs rounded px-1.5 py-0.5 border ${r.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      {r.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td><EditRoomButton room={r} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card padding={false}>
        <div className="px-5 pt-5 pb-4">
          <SectionHeader title="Gastos recurrentes mensuales" />
          <p className="text-xs text-slate-500 mt-1">Se distribuyen automaticamente el 1 de cada mes entre los ciclos activos por m2 de sala.</p>
        </div>
        <div className="px-5 pb-5">
          <RecurringExpensesSection />
        </div>
      </Card>
    </div>
  )
}