import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "delivery")
    return NextResponse.json({ error: "Solo delivery puede confirmar entregas" }, { status: 403 })

  const { order_id, delivery_code } = await request.json()
  if (!order_id || !delivery_code)
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  const { data: order } = await service
    .from("orders")
    .select("id, status, delivery_code, delivery_code_used_at, patient_id, grams")
    .eq("id", order_id)
    .single()

  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
  if (order.status !== "empaquetado") return NextResponse.json({ error: "El pedido no esta listo para entregar" }, { status: 400 })
  if (order.delivery_code_used_at) return NextResponse.json({ error: "El codigo ya fue utilizado" }, { status: 400 })
  if (order.delivery_code !== delivery_code) return NextResponse.json({ error: "Codigo incorrecto" }, { status: 400 })

  // Marcar codigo como usado y cambiar estado a entregado
  await service.from("orders").update({
    status: "entregado",
    delivery_code_used_at: new Date().toISOString(),
    delivered_by: user.id,
    delivered_at: new Date().toISOString()
  }).eq("id", order_id)

  // Llamar al update de orders para crear dispensas y descontar stock
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/orders/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id, status: "entregado" })
  })

  return NextResponse.json({ success: true })
}
