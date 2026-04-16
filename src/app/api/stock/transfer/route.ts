import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Solo el admin puede transferir stock" }, { status: 403 })

  const { lot_id, grams, notes } = await request.json()
  if (!lot_id || !grams || grams <= 0)
    return NextResponse.json({ error: "Faltan datos o gramos invalidos" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar que hay suficiente en acopio
  const { data: acopio } = await service
    .from("stock_positions")
    .select("id, available_grams")
    .eq("lot_id", lot_id)
    .eq("storage_type", "acopio")
    .single()

  if (!acopio || acopio.available_grams < grams)
    return NextResponse.json({ error: `Stock insuficiente en acopio. Disponible: ${acopio?.available_grams ?? 0}g` }, { status: 400 })

  // Verificar que existe posicion operativa
  const { data: operativo } = await service
    .from("stock_positions")
    .select("id, available_grams")
    .eq("lot_id", lot_id)
    .eq("storage_type", "operativo")
    .maybeSingle()

  // Descontar del acopio
  await service
    .from("stock_positions")
    .update({ available_grams: acopio.available_grams - grams })
    .eq("id", acopio.id)

  // Sumar al operativo
  if (operativo) {
    await service
      .from("stock_positions")
      .update({ available_grams: operativo.available_grams + grams })
      .eq("id", operativo.id)
  } else {
    await service
      .from("stock_positions")
      .insert({ lot_id, available_grams: grams, reserved_grams: 0, storage_type: "operativo" })
  }

  // Registrar transferencia
  await service.from("stock_transfers").insert({
    lot_id,
    grams,
    notes: notes || null,
    authorized_by: user.id,
  })

  // Audit log
  await service.from("audit_logs").insert({
    performed_by: user.id,
    action: "transferir_stock",
    entity_type: "stock_positions",
    entity_id: lot_id,
    entity_label: `Transferencia de ${grams}g de acopio a operativo`,
    new_state: { lot_id, grams, notes },
    performed_at: new Date().toISOString()
  }).then(() => {})

  return NextResponse.json({ success: true })
}