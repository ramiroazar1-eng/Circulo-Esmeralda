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

  // Verificar que no hay dispensas pendientes de confirmacion para este paciente
  const { data: pendingDispenses } = await service
    .from("dispense_confirmations")
    .select("id, dispense:dispenses(patient_id)")
    .eq("status", "pendiente")

  const hasPending = (pendingDispenses ?? []).some((dc: any) => dc.dispense?.patient_id === patient_id)
  if (hasPending)
    return NextResponse.json({
      error: "Este paciente tiene una dispensa pendiente de confirmacion. Debe confirmar antes de registrar una nueva."
    }, { status: 400 })

  // Verificar stock operativo para cada lote
  for (const item of items) {
    const { data: stockPos } = await service
      .from("stock_positions")
      .select("id, available_grams")
      .eq("lot_id", item.lot_id)
      .eq("storage_type", "operativo")
      .single()

    if (!stockPos || stockPos.available_grams < item.grams)
      return NextResponse.json({
        error: `Stock operativo insuficiente. Disponible: ${stockPos?.available_grams ?? 0}g`
      }, { status: 400 })
  }

  const dispensedAtDate = dispensed_at || new Date().toISOString()
  const dispenseIds: string[] = []

  // Registrar dispensas SIN descontar stock todavia
  for (const item of items) {
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
    dispenseIds.push(dispense.id)

    // Crear confirmacion pendiente
    await service.from("dispense_confirmations").insert({
      dispense_id: dispense.id,
      patient_id,
      status: "pendiente"
    })
  }

  // Buscar perfil del paciente para mandar push
  const { data: patientProfile } = await service
    .from("profiles")
    .select("id")
    .eq("patient_id", patient_id)
    .eq("role", "paciente")
    .maybeSingle()

  if (patientProfile) {
    const totalGrams = items.reduce((acc: number, i: any) => acc + i.grams, 0)
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Confirma tu retiro",
        body: `Hay ${totalGrams}g listos para retirar. Abre la app para confirmar.`,
        url: "/mi-perfil",
        user_id: patientProfile.id
      })
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, dispense_ids: dispenseIds, pending_confirmation: true })
}
