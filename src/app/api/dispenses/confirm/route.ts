import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, patient_id")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "paciente")
    return NextResponse.json({ error: "Solo pacientes pueden confirmar dispensas" }, { status: 403 })

  const { dispense_id } = await request.json()
  if (!dispense_id) return NextResponse.json({ error: "Falta dispense_id" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar que la dispensa pertenece al paciente
  const { data: confirmation } = await service
    .from("dispense_confirmations")
    .select("id, status, dispense_id, patient_id")
    .eq("dispense_id", dispense_id)
    .eq("patient_id", profile.patient_id)
    .eq("status", "pendiente")
    .maybeSingle()

  if (!confirmation)
    return NextResponse.json({ error: "No hay dispensa pendiente de confirmacion" }, { status: 404 })

  // Confirmar
  await service
    .from("dispense_confirmations")
    .update({ status: "confirmado", confirmed_at: new Date().toISOString() })
    .eq("id", confirmation.id)

  // Descontar stock recién ahora
  const { data: dispense } = await service
    .from("dispenses")
    .select("lot_id, grams")
    .eq("id", dispense_id)
    .single()

  if (dispense) {
    const { data: stockOp } = await service
      .from("stock_positions")
      .select("id, available_grams")
      .eq("lot_id", dispense.lot_id)
      .eq("storage_type", "operativo")
      .maybeSingle()

    if (stockOp) {
      await service
        .from("stock_positions")
        .update({
          available_grams: stockOp.available_grams - dispense.grams,
          updated_at: new Date().toISOString()
        })
        .eq("id", stockOp.id)

      await service.from("stock_movements").insert({
        lot_id: dispense.lot_id,
        movement_type: "dispensa",
        grams: dispense.grams,
        dispense_id,
        reference_note: "Dispensa confirmada por paciente",
        performed_by: user.id,
        performed_at: new Date().toISOString()
      })
    }
  }

  return NextResponse.json({ success: true })
}
