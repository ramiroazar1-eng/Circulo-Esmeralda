import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const isStaff = ["admin","administrativo","biologo"].includes(profile?.role ?? "")

  const body = await request.json()
  const { order_id, status, lot_id } = body

  if (!order_id || !status) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  const { data: order } = await service.from("orders").select("*").eq("id", order_id).single()
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })

  // Solo staff puede cambiar estado salvo cancelar
  if (!isStaff && status !== "cancelado") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  // Solo el paciente dueno puede cancelar su pedido
  if (status === "cancelado" && !isStaff) {
    const { data: patientProfile } = await service.from("profiles").select("patient_id").eq("id", user.id).single()
    if (patientProfile?.patient_id !== order.patient_id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }
  }

  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  }

  if (lot_id) updateData.lot_id = lot_id
  if (status === "empaquetado") { updateData.packed_by = user.id; updateData.packed_at = new Date().toISOString() }
  if (status === "entregado") {
    updateData.delivered_by = user.id
    updateData.delivered_at = new Date().toISOString()
    // Crear dispensas desde los order_items
    const { data: items } = await service
      .from("order_items")
      .select("grams, lot_id, genetic_id")
      .eq("order_id", order_id)
    if (items && items.length > 0) {
      const dispenses = items.map((item: any) => ({
        patient_id: order.patient_id,
        lot_id: item.lot_id,
        grams: item.grams,
        product_desc: "flor seca",
        performed_by: user.id,
        dispensed_at: new Date().toISOString(),
        source: "pedido"
      }))
      await service.from("dispenses").insert(dispenses)
    }
  }

  // Si se cancela, liberar reserva de stock
  if (status === "cancelado" && order.lot_id) {
    await service.from("stock_positions")
      .update({ reserved_grams: service.rpc("greatest", {}) })
      .eq("lot_id", order.lot_id)

    await service.rpc("release_stock_reservation", {
      p_lot_id: order.lot_id,
      p_grams: order.grams
    }).then(() => {})
  }

  const { error } = await service.from("orders").update(updateData).eq("id", order_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await service.from("audit_logs").insert({
    performed_by: user.id,
    action: "cambiar_estado",
    entity_type: "orders",
    entity_id: order_id,
    entity_label: `Pedido ${order_id} -> ${status}`,
    previous_state: { status: order.status },
    new_state: { status },
    performed_at: new Date().toISOString()
  }).then(() => {})

  return NextResponse.json({ success: true })
}
