import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const isStaff = ["admin","administrativo","biologo","director_de_cultivo"].includes(profile?.role ?? "")

  const body = await request.json()
  const { order_id, status, lot_id } = body
  if (!order_id || !status) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  const { data: order } = await service.from("orders").select("*").eq("id", order_id).single()
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })

  if (!isStaff && status !== "cancelado")
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  if (status === "cancelado" && !isStaff) {
    const { data: patientProfile } = await service.from("profiles").select("patient_id").eq("id", user.id).single()
    if (patientProfile?.patient_id !== order.patient_id)
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const updateData: any = { status, updated_at: new Date().toISOString() }
  if (lot_id) updateData.lot_id = lot_id
  if (status === "empaquetado") { updateData.packed_by = user.id; updateData.packed_at = new Date().toISOString() }

  // Si se aprueba un pedido de delivery, generar codigo de 4 digitos
  if (status === "aprobado" && order.delivery_type === "envio") {
    const { data: code } = await service.rpc("generate_delivery_code")
    if (code) {
      updateData.delivery_code = code
      // Mandar codigo al paciente por push
      const { data: patientProfile } = await service
        .from("profiles")
        .select("id")
        .eq("patient_id", order.patient_id)
        .eq("role", "paciente")
        .maybeSingle()
      if (patientProfile) {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Tu pedido fue aprobado",
            body: `Tu codigo de entrega es: ${code}. Mostralo al delivery al recibir tu pedido.`,
            url: "/mi-perfil",
            user_id: patientProfile.id
          })
        }).catch(() => {})
      }
    }
  }

  // Al entregar — crear dispensas Y descontar stock operativo
  if (status === "entregado") {
    updateData.delivered_by = user.id
    updateData.delivered_at = new Date().toISOString()

    const { data: items } = await service
      .from("order_items")
      .select("grams, lot_id, genetic_id")
      .eq("order_id", order_id)

    if (items && items.length > 0) {
      for (const item of items) {
        if (!item.lot_id || !item.grams) continue

        // Verificar stock operativo
        const { data: stockOp } = await service
          .from("stock_positions")
          .select("id, available_grams")
          .eq("lot_id", item.lot_id)
          .eq("storage_type", "operativo")
          .maybeSingle()

        if (!stockOp || stockOp.available_grams < item.grams)
          return NextResponse.json({
            error: `Stock operativo insuficiente para entregar. Disponible: ${stockOp?.available_grams ?? 0}g`
          }, { status: 400 })

        // Crear dispensa
        const { data: dispense } = await service.from("dispenses").insert({
          patient_id: order.patient_id,
          lot_id: item.lot_id,
          grams: item.grams,
          product_desc: "flor seca",
          performed_by: user.id,
          dispensed_at: new Date().toISOString(),
          source: "pedido"
        }).select().single()

        // Descontar stock operativo
        await service.from("stock_positions")
          .update({ available_grams: stockOp.available_grams - item.grams, updated_at: new Date().toISOString() })
          .eq("id", stockOp.id)

        // Registrar movimiento
        if (dispense) {
          await service.from("stock_movements").insert({
            lot_id: item.lot_id,
            movement_type: "dispensa",
            grams: item.grams,
            dispense_id: dispense.id,
            reference_note: `Entrega de pedido ${order_id}`,
            performed_by: user.id,
            performed_at: new Date().toISOString()
          }).then(() => {})
        }
      }
    }
  }

  // Al cancelar — liberar reserva si hay stock reservado
  if (status === "cancelado") {
    const { data: items } = await service
      .from("order_items")
      .select("grams, lot_id")
      .eq("order_id", order_id)

    for (const item of (items ?? [])) {
      if (!item.lot_id) continue
      const { data: stockOp } = await service
        .from("stock_positions")
        .select("id, available_grams, reserved_grams")
        .eq("lot_id", item.lot_id)
        .eq("storage_type", "operativo")
        .maybeSingle()

      if (stockOp && stockOp.reserved_grams > 0) {
        const release = Math.min(item.grams, stockOp.reserved_grams)
        await service.from("stock_positions")
          .update({
            reserved_grams: stockOp.reserved_grams - release,
            available_grams: stockOp.available_grams + release,
            updated_at: new Date().toISOString()
          })
          .eq("id", stockOp.id)
      }
    }
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

  const statusLabels: Record<string, string> = {
    nuevo: "Nuevo pedido", pendiente_aprobacion: "Pendiente de aprobacion",
    aprobado: "Pedido aprobado", en_preparacion: "En preparacion",
    empaquetado: "Listo para entregar", entregado: "Entregado", cancelado: "Cancelado"
  }

  await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.circuloesmeralda.com.ar"}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: statusLabels[status] ?? status,
      body: `Estado actualizado a: ${statusLabels[status] ?? status}`,
      order_id
    })
  }).catch(() => {})

  return NextResponse.json({ success: true })
}

