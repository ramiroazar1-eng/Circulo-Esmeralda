import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { QrCode } from "lucide-react"
import { PageHeader, Card, Table, EmptyState, Button } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import { formatDateTime, formatGrams } from "@/lib/utils"
import NewDispenseModal from "./NewDispenseModal"

export default async function DispensasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: dispenses } = await supabase
    .from("dispenses")
    .select("id, dispensed_at, grams, product_desc, observations, source, patient:patients(id, full_name, dni), lot:lots(lot_code), performed_by_profile:profiles(full_name)")
    .order("dispensed_at", { ascending: false })
    .limit(50)

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, dni")
    .is("deleted_at", null)
    .order("full_name")

  const { data: lots } = await supabase
    .from("v_stock_available")
    .select("lot_id, lot_code, available_grams, genetic_name, genetic_id")

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader
        title="Dispensas"
        description="Registro de todas las dispensas realizadas"
        actions={
          <div className="flex gap-2">
            <Link href="/dispensas/qr">
              <Button variant="secondary" size="sm">
                <QrCode className="w-3.5 h-3.5" />
                Dispensa por QR
              </Button>
            </Link>
            <NewDispenseModal patients={patients ?? []} lots={lots ?? []} />
          </div>
        }
      />
      <Card padding={false}>
        {(!dispenses || dispenses.length === 0) ? (
          <EmptyState
            title="Sin dispensas registradas"
            description="Registra la primera dispensa con el boton de arriba."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Paciente</th>
                <th>DNI</th>
                <th>Producto</th>
                <th>Lote</th>
                <th>Cantidad</th>
                <th>Origen</th>
                <th>Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {dispenses.map((d: any) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap">{formatDateTime(d.dispensed_at)}</td>
                  <td>
                    <Link href={`/pacientes/${d.patient?.id}`} className="font-medium text-slate-900 hover:underline">
                      {d.patient?.full_name ?? "â€”"}
                    </Link>
                  </td>
                  <td className="font-mono text-xs">{d.patient?.dni ?? "â€”"}</td>
                  <td>{d.product_desc}</td>
                  <td className="font-mono text-xs">{d.lot?.lot_code ?? "â€”"}</td>
                  <td className="font-medium tabular-nums">{formatGrams(d.grams)}</td>
                  <td>
                  {d.source === "pedido" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Pedido</span>
                  ) : d.source === "manual" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Manual</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#edf7e8] text-[#2d6a1f] border border-[#b8daa8]">Presencial</span>
                  )}
                </td>
                <td className="text-slate-500">{d.performed_by_profile?.full_name ?? "â€”"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}

