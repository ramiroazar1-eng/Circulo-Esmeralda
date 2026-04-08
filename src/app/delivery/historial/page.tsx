import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { CheckCircle2 } from "lucide-react"

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  })
}

export default async function DeliveryHistorialPage() {
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
      id, status, updated_at, delivery_notes,
      patient:patients(id, full_name, phone, address),
      order_items(id, grams, genetic:genetics(name))
    `)
    .eq("delivered_by", user.id)
    .eq("status", "entregado")
    .order("updated_at", { ascending: false })

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={profile.role} userName={profile.full_name} />
      <main className="flex-1 md:ml-56 pt-14 md:pt-0">
        <div className="px-4 py-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Historial de entregas</h1>
            <p className="text-sm text-slate-500 mt-1">
              {orders?.length ?? 0} entrega{orders?.length !== 1 ? "s" : ""} realizadas
            </p>
          </div>

          {!orders?.length ? (
            <div className="text-center py-16 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Todavia no realizaste entregas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(orders as any[]).map(order => (
                <div key={order.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{order.patient?.full_name ?? "-"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.updated_at)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Entregado
                    </span>
                  </div>
                  {order.delivery_notes && (
                    <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                      {order.delivery_notes}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {order.order_items?.map((item: any) => (
                      <span key={item.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {item.genetic?.name ?? "-"} - {item.grams}g
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}