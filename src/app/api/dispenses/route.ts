import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","administrativo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { patient_id, items, product_desc, observations, dispensed_at } = await request.json()
  if (!patient_id || !items || items.length === 0)
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar stock operativo para cada lote
  for (const item of items) {
    const { data: stockPos } = await service
      .from("stock_positions")
      .select("id, available_grams")
      .eq("lot_id", item.lot_id)
      .eq("storage_type", "operativo")
      .single()

    if (!stockPos || stockPos.available_grams < item.grams) {
      return NextResponse.json({
        error: `Stock operativo insuficiente para el lote. Disponible: ${stockPos?.available_grams ?? 0}g, solicitado: ${item.grams}g`
      }, { status: 400 })
    }
  }

  // Registrar dispensas y descontar stock
  const dispensedAtDate = dispensed_at || new Date().toISOString()

  for (const item of items) {
    // Insertar dispensa
    const { data: dispense, error: dispenseError } = await service
      .from("dispenses")
      .insert({
        patient_id,
        lot_id: item.lot_id,
        grams: item.grams,
        product_desc: product_desc || "flor seca",
        observations: observations || null,
        dispensed_at: dispensedAtDate,
        performed_by: user.id
      })
      .select()
      .single()

    if (dispenseError) return NextResponse.json({ error: dispenseError.message }, { status: 400 })

    // Descontar del stock operativo
    const { data: stockPos } = await service
      .from("stock_positions")
      .select("id, available_grams")
      .eq("lot_id", item.lot_id)
      .eq("storage_type", "operativo")
      .single()

    if (stockPos) {
      await service
        .from("stock_positions")
        .update({ available_grams: stockPos.available_grams - item.grams, updated_at: new Date().toISOString() })
        .eq("id", stockPos.id)

      // Registrar movimiento de stock
      await service.from("stock_movements").insert({
        lot_id: item.lot_id,
        movement_type: "dispensa",
        grams: item.grams,
        dispense_id: dispense.id,
        reference_note: `Dispensa a paciente`,
        performed_by: user.id,
        performed_at: dispensedAtDate
      })
    }
  }

  return NextResponse.json({ success: true })
}

