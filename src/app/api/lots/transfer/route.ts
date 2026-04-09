import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","biologo","administrativo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { lot_id, new_room_id, transfer_date, notes } = await request.json()
  if (!lot_id || !new_room_id || !transfer_date)
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })

  const service = await createServiceClient()

  // Obtener sala actual del lote
  const { data: lot } = await service
    .from("lots")
    .select("id, lot_code, room_id, cycle_id")
    .eq("id", lot_id)
    .single()
  if (!lot) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })

  // Cerrar entrada anterior en historial
  if (lot.room_id) {
    await service
      .from("lot_room_history")
      .update({ exited_at: transfer_date })
      .eq("lot_id", lot_id)
      .eq("room_id", lot.room_id)
      .is("exited_at", null)
  }

  // Registrar nueva entrada
  await service.from("lot_room_history").insert({
    lot_id,
    room_id: new_room_id,
    entered_at: transfer_date,
    notes: notes || null,
    created_by: user.id,
  })

  // Actualizar sala actual del lote
  await service.from("lots").update({ room_id: new_room_id }).eq("id", lot_id)

  // Registrar evento de traslado en cycle_events
  if (lot.cycle_id) {
    await service.from("cycle_events").insert({
      cycle_id: lot.cycle_id,
      lot_id,
      room_id: new_room_id,
      event_type: "traslado",
      event_date: transfer_date,
      notes: notes || `Traslado a nueva sala`,
      created_by: user.id,
    })
  }

  return NextResponse.json({ success: true })
}