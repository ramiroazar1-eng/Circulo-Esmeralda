import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","administrativo","biologo","director_de_cultivo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { patientId, lotId, grams, observations } = await request.json()
  if (!patientId || !lotId || !grams) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar stock OPERATIVO especificamente
  const { data: stockOp } = await service
    .from("stock_positions")
    .select("id, available_grams")
    .eq("lot_id", lotId)
    .eq("storage_type", "operativo")
    .maybeSingle()

  if (!stockOp || stockOp.available_grams < grams)
    return NextResponse.json({
      error: `Stock operativo insuficiente. Disponible: ${stockOp?.available_grams ?? 0}g. Solicita una transferencia desde acopio.`
    }, { status: 400 })

  // Registrar dispensa
  const { data: dispense, error } = await service
    .from("dispenses")
    .insert({
      patient_id: patientId,
      lot_id: lotId,
      grams,
      product_desc: "flor seca",
      observations: observations || null,
      performed_by: user.id,
      dispensed_at: new Date().toISOString(),
      source: "presencial",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Descontar del stock operativo
  await service
    .from("stock_positions")
    .update({
      available_grams: stockOp.available_grams - grams,
      updated_at: new Date().toISOString()
    })
    .eq("id", stockOp.id)

  // Registrar movimiento
  await service.from("stock_movements").insert({
    lot_id: lotId,
    movement_type: "dispensa",
    grams,
    dispense_id: dispense.id,
    reference_note: "Dispensa presencial por QR",
    performed_by: user.id,
    performed_at: new Date().toISOString()
  }).then(() => {})

  // Audit log
  await service.from("audit_logs").insert({
    performed_by: user.id,
    action: "dispensar",
    entity_type: "dispenses",
    entity_id: dispense.id,
    entity_label: `${patientId} - ${grams}g lote ${lotId}`,
    new_state: { patient_id: patientId, lot_id: lotId, grams, source: "presencial" },
    performed_at: new Date().toISOString()
  }).then(() => {})

  return NextResponse.json({ success: true, dispense })
}
