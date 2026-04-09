import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","administrativo","biologo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { patientId, lotId, grams, observations } = await request.json()
  if (!patientId || !lotId || !grams) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()
  const { data: stock } = await service.from("stock_positions").select("available_grams").eq("lot_id", lotId).single()
  if (!stock || stock.available_grams < grams)
    return NextResponse.json({ error: `Stock insuficiente. Disponible: ${stock?.available_grams ?? 0}g` }, { status: 400 })

  const { data: dispense, error } = await service
    .from("dispenses")
    .insert({
      patient_id: patientId, lot_id: lotId, grams,
      product_desc: "flor seca",
      observations: observations || null,
      performed_by: user.id,
      dispensed_at: new Date().toISOString(),
      source: "presencial",
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

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