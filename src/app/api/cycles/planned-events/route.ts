import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","biologo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { cycle_id, lot_id, room_id, event_type, planned_date, notes } = await request.json()
  if (!cycle_id || !event_type || !planned_date)
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })

  const service = await createServiceClient()
  const { error } = await service.from("planned_events").insert({
    cycle_id,
    lot_id: lot_id || null,
    room_id: room_id || null,
    event_type,
    planned_date,
    notes: notes || null,
    created_by: user.id
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","biologo","administrativo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { id, status } = await request.json()
  if (!id || !status) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()
  const { error } = await service
    .from("planned_events")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}