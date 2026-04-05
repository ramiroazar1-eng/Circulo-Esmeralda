import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader, Card } from "@/components/ui"
import { BackButton } from "@/components/ui/BackButton"
import OrdersPanel from "./OrdersPanel"

export default async function PedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","administrativo","biologo"].includes(profile?.role ?? "")) redirect("/dashboard")

  const { data: lots } = await supabase
    .from("v_stock_available")
    .select("lot_id, lot_code, available_grams, genetic_name")
    .order("lot_code")

  return (
    <div className="space-y-5">
      <BackButton label="Volver al dashboard" />
      <PageHeader
        title="Panel de pedidos"
        description="Gestion en tiempo real de pedidos de pacientes"
      />
      <OrdersPanel lots={lots ?? []} />
    </div>
  )
}
