import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { genetic_id, room_id, seedling_date, notes } = body

  const service = await createServiceClient()

  // Buscar el ciclo activo mas reciente
  const { data: activeCycle } = await service
    .from("production_cycles")
    .select("id, name")
    .eq("status", "activo")
    .order("start_date", { ascending: false })
    .limit(1)
    .single()

  if (!activeCycle) return NextResponse.json({ error: "No hay un ciclo activo. Crea un ciclo de produccion primero." }, { status: 400 })

  const { data, error } = await service.from("lots").insert({
    genetic_id: genetic_id || null,
    room_id: room_id || null,
    seedling_date: seedling_date || null,
    start_date: seedling_date || null,
    status: "plantines",
    notes: notes || null,
    created_by: user.id,
    cycle_id: activeCycle.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, data, cycle_name: activeCycle.name })
}