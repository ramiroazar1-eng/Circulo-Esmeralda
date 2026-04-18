import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { genetic_id, room_id, seedling_date, notes, plant_count, cycle_id: forced_cycle_id, lot_subtype } = body

  const service = await createServiceClient()

  let activeCycle: any = null

  // Si se pasa cycle_id especifico, usarlo directamente
  if (forced_cycle_id) {
    const { data: fc } = await service
      .from("production_cycles")
      .select("id, name, cycle_type")
      .eq("id", forced_cycle_id)
      .single()
    activeCycle = fc
  }

  // Si no, buscar ciclo productivo activo
  if (!activeCycle) {
    const { data: fc } = await service
      .from("production_cycles")
      .select("id, name, cycle_type")
      .eq("status", "activo")
      .eq("cycle_type", "productivo")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle()
    activeCycle = fc
  }

  if (!activeCycle) return NextResponse.json({
    error: "No hay un ciclo productivo activo. Crea un ciclo productivo primero."
  }, { status: 400 })

  const [geneticRes, roomRes] = await Promise.all([
    genetic_id ? service.from("genetics").select("name").eq("id", genetic_id).single() : Promise.resolve({ data: null }),
    room_id ? service.from("rooms").select("name").eq("id", room_id).single() : Promise.resolve({ data: null }),
  ])

  const geneticName = (geneticRes as any).data?.name ?? null
  const roomName = (roomRes as any).data?.name ?? null

  const { data: lotCode } = await service.rpc("generate_lot_code", {
    p_year: new Date().getFullYear(),
    p_room_name: roomName,
    p_genetic_name: geneticName,
  })

  const { data, error } = await service.from("lots").insert({
    lot_code: lotCode,
    genetic_id: genetic_id || null,
    room_id: room_id || null,
    seedling_date: seedling_date || null,
    start_date: seedling_date || null,
    status: "plantines",
    notes: notes || null,
    plant_count: plant_count || null,
    created_by: user.id,
    cycle_id: activeCycle.id,
    lot_subtype: lot_subtype || "normal",
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, data, cycle_name: activeCycle.name })
}
