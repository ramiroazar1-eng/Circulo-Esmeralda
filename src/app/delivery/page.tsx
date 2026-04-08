import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import DeliveryOrderCard from "@/components/modules/delivery/DeliveryOrderCard"
import { Package } from "lucide-react"

export default async function DeliveryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "delivery") redirect("/dashboard")

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, status, created_at, delivery_notes,
      patient:patients(id, full_name, phone, address),
      order_items(id, grams, genetic:genetics(name))
    `)
    .eq("status", "empaquetado")
    .order("created_at", { ascending: true })

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={profile.role} userName={profile.full_name} />
      <main className="flex-1 md:ml-56 pt-14 md:pt-0">
        <div className="px-4 py-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Entregas pendientes</h1>
            <p className="text-sm text-slate-500 mt-1">
              {orders?.length ?? 0} pedido{orders?.length !== 1 ? "s" : ""} para entregar
            </p>
          </div>

          {!orders?.length ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay pedidos empaquetados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(orders as any[]).map(order => (
                <DeliveryOrderCard key={order.id} order={order} deliveredBy={user.id} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

