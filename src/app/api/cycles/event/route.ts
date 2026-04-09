import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { cycle_id, event_type, event_date, notes, lot_id, room_id } = body

  if (!cycle_id || !event_type || !event_date)
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar que el ciclo este activo
  const { data: cycle } = await service.from("production_cycles").select("status").eq("id", cycle_id).single()
  if (cycle?.status !== "activo")
    return NextResponse.json({ error: "No se pueden agregar eventos a un ciclo cerrado" }, { status: 400 })

  const { error } = await service
    .from("cycle_events")
    .insert({
      cycle_id,
      event_type,
      event_date,
      notes: notes || null,
      lot_id: lot_id || null,
      room_id: room_id || null,
      created_by: user.id
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}