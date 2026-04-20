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

  if (!["admin", "administrativo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { dispense_id, reason } = await request.json()
  if (!dispense_id || !reason)
    return NextResponse.json({ error: "Se requiere motivo para forzar la confirmacion" }, { status: 400 })

  const service = await createServiceClient()

  const { data: confirmation } = await service
    .from("dispense_confirmations")
    .select("id, patient_id, dispense_id")
    .eq("dispense_id", dispense_id)
    .eq("status", "pendiente")
    .maybeSingle()

  if (!confirmation)
    return NextResponse.json({ error: "No hay confirmacion pendiente" }, { status: 404 })

  await service
    .from("dispense_confirmations")
    .update({
      status: "forzado",
      confirmed_at: new Date().toISOString(),
      forced_by: user.id,
      force_reason: reason
    })
    .eq("id", confirmation.id)

  // Descontar stock
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
    }
  }

  // Crear alerta en dashboard
  await service.from("stock_alerts").insert({
    tipo: "dispensa_forzada",
    mensaje: `Dispensa forzada sin confirmacion del paciente. Motivo: ${reason}`,
    data: { dispense_id, forced_by: user.id, reason }
  })

  return NextResponse.json({ success: true })
}
