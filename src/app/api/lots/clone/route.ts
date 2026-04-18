import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","biologo","director_de_cultivo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { parent_lot_id, plant_count, room_id, destination, notes } = await request.json()
  if (!parent_lot_id || !plant_count || plant_count <= 0)
    return NextResponse.json({ error: "Faltan datos o cantidad invalida" }, { status: 400 })
  if (!["flora", "vege", "madre"].includes(destination))
    return NextResponse.json({ error: "Destino invalido" }, { status: 400 })

  const service = await createServiceClient()

  // Obtener lote madre
  const { data: parentLot } = await service
    .from("lots")
    .select("id, lot_code, genetic_id, cycle_id, status")
    .eq("id", parent_lot_id)
    .single()

  if (!parentLot) return NextResponse.json({ error: "Lote madre no encontrado" }, { status: 404 })

  // Generar codigo de esqueje
  const { data: cloneCode } = await service.rpc("generate_clone_code", {
    p_parent_lot_code: parentLot.lot_code
  })

  // Determinar ciclo destino
  let cycle_id = parentLot.cycle_id
  const lot_subtype = destination === "madre" ? "madre" : "esqueje"

  if (destination !== "madre") {
    // Buscar ciclo productivo activo
    const { data: activeCycle } = await service
      .from("production_cycles")
      .select("id")
      .eq("status", "activo")
      .eq("cycle_type", "productivo")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeCycle) cycle_id = activeCycle.id
  }

  // Status inicial segun destino
  const initialStatus = destination === "flora" ? "floracion" : "plantines"

  // Crear lote de esquejes
  const { data: newLot, error } = await service
    .from("lots")
    .insert({
      lot_code: cloneCode,
      genetic_id: parentLot.genetic_id,
      room_id: room_id || null,
      cycle_id,
      status: initialStatus,
      lot_subtype,
      parent_lot_id,
      plant_count,
      seedling_date: new Date().toISOString().split("T")[0],
      notes: notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Registrar evento en el ciclo
  await service.from("cycle_events").insert({
    cycle_id: parentLot.cycle_id,
    event_type: "otro",
    event_date: new Date().toISOString().split("T")[0],
    lot_id: parent_lot_id,
    notes: `Esquejes tomados: ${plant_count} plantas → ${cloneCode} (${destination === "madre" ? "nuevas madres" : destination === "flora" ? "a floracion" : "a vegetativo"})`,
    created_by: user.id,
  })

  return NextResponse.json({ success: true, data: newLot, clone_code: cloneCode })
}
