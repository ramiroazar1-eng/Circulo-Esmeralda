import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createHash } from "crypto"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","biologo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { cycle_id, closure_date, notes } = await request.json()
  if (!cycle_id || !closure_date)
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar que no exista ya un cierre para ese dia y ciclo
  const { data: existing } = await service
    .from("daily_closures")
    .select("id")
    .eq("closure_date", closure_date)
    .eq("cycle_id", cycle_id)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: "Ya existe un cierre para este dia y ciclo" }, { status: 400 })

  // Obtener eventos del dia sin cierre
  const { data: events } = await service
    .from("cycle_events")
    .select("id, event_type, event_date, notes, lot:lots(lot_code), room:rooms(name), created_by")
    .eq("cycle_id", cycle_id)
    .eq("event_date", closure_date)
    .is("closure_id", null)
    .order("created_at", { ascending: true })

  if (!events || events.length === 0)
    return NextResponse.json({ error: "No hay eventos sin cerrar para este dia" }, { status: 400 })

  // Generar hash del conjunto de eventos
  const eventsContent = JSON.stringify(events.map((e: any) => ({
    id: e.id, event_type: e.event_type, event_date: e.event_date,
    notes: e.notes, lot: e.lot?.lot_code, room: e.room?.name
  })))
  const eventsHash = createHash("sha256").update(eventsContent + closure_date + cycle_id).digest("hex")

  // Crear el cierre
  const { data: closure, error: closureError } = await service
    .from("daily_closures")
    .insert({
      closure_date,
      cycle_id,
      status: "cerrado",
      events_count: events.length,
      events_hash: eventsHash,
      notes: notes || null,
      closed_by: user.id,
    })
    .select()
    .single()
  if (closureError) return NextResponse.json({ error: closureError.message }, { status: 400 })

  // Bloquear los eventos del dia
  const eventIds = events.map((e: any) => e.id)
  await service
    .from("cycle_events")
    .update({ closure_id: closure.id, is_locked: true })
    .in("id", eventIds)

  return NextResponse.json({ success: true, closure_id: closure.id, events_count: events.length, events_hash: eventsHash })
}