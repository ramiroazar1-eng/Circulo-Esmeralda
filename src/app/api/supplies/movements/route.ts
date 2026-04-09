import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","biologo","administrativo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { supply_product_id, movement_type, quantity, unit_cost, total_cost, cycle_id, lot_id, room_id, notes, movement_date } = await request.json()
  if (!supply_product_id || !movement_type || !quantity || !movement_date)
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
  if (quantity <= 0)
    return NextResponse.json({ error: "La cantidad debe ser mayor a 0" }, { status: 400 })

  const service = await createServiceClient()

  // Si tiene ciclo asignado, verificar que este activo
  if (cycle_id) {
    const { data: cycleCheck } = await service.from("production_cycles").select("status").eq("id", cycle_id).single()
    if (cycleCheck?.status !== "activo")
      return NextResponse.json({ error: "No se pueden registrar movimientos en un ciclo cerrado" }, { status: 400 })
  }

  const { error } = await service.from("supply_movements").insert({
    supply_product_id, movement_type, quantity,
    unit_cost: unit_cost || null,
    total_cost: total_cost || null,
    cycle_id: cycle_id || null,
    lot_id: lot_id || null,
    room_id: room_id || null,
    notes: notes || null,
    movement_date,
    created_by: user.id
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}