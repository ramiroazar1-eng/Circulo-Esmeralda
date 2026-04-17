import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","biologo","director_de_cultivo","administrativo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { supply_product_id, movement_type, quantity, unit_cost, total_cost, cycle_id, lot_id, room_id, room_ids, notes, movement_date } = await request.json()
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

  // Obtener precio unitario del producto si no se paso
  let unitCostFinal = unit_cost
  if (!unitCostFinal) {
    const { data: product } = await service.from("supply_products").select("last_unit_cost").eq("id", supply_product_id).single()
    unitCostFinal = product?.last_unit_cost ?? null
  }

  // Distribucion por m2 entre multiples salas
  if (room_ids && Array.isArray(room_ids) && room_ids.length > 1) {
    // Obtener m2 de cada sala
    const { data: roomsData } = await service
      .from("rooms")
      .select("id, square_meters")
      .in("id", room_ids)

    const totalM2 = (roomsData ?? []).reduce((acc: number, r: any) => acc + (r.square_meters ?? 0), 0)

    for (const room of (roomsData ?? [])) {
      const proportion = totalM2 > 0 ? (room.square_meters ?? 0) / totalM2 : 1 / room_ids.length
      const roomQty = parseFloat((quantity * proportion).toFixed(3))
      const roomTotal = unitCostFinal ? parseFloat((roomQty * unitCostFinal).toFixed(2)) : null

      await service.from("supply_movements").insert({
        supply_product_id,
        movement_type,
        quantity: roomQty,
        unit_cost: unitCostFinal || null,
        total_cost: roomTotal,
        cycle_id: cycle_id || null,
        lot_id: lot_id || null,
        room_id: room.id,
        notes: notes ? `${notes} (distribuido por m2)` : "Distribuido por m2",
        movement_date,
        created_by: user.id
      })
    }

    return NextResponse.json({ success: true, distributed: true })
  }

  // Movimiento simple (una sala o sin sala)
  const totalCostFinal = unitCostFinal ? quantity * unitCostFinal : (total_cost || null)

  const { error } = await service.from("supply_movements").insert({
    supply_product_id,
    movement_type,
    quantity,
    unit_cost: unitCostFinal || null,
    total_cost: totalCostFinal,
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
