import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { genetic_id, room_id, seedling_date, notes } = body

  const service = await createServiceClient()

  // Buscar ciclo activo
  const { data: activeCycle } = await service
    .from("production_cycles")
    .select("id, name")
    .eq("status", "activo")
    .order("start_date", { ascending: false })
    .limit(1)
    .single()

  if (!activeCycle) return NextResponse.json({ error: "No hay un ciclo activo. Crea un ciclo de produccion primero." }, { status: 400 })

  // Obtener nombre de sala y genetica para el codigo
  const [geneticRes, roomRes] = await Promise.all([
    genetic_id ? service.from("genetics").select("name").eq("id", genetic_id).single() : Promise.resolve({ data: null }),
    room_id ? service.from("rooms").select("name").eq("id", room_id).single() : Promise.resolve({ data: null }),
  ])

  const geneticName = (geneticRes as any).data?.name ?? null
  const roomName = (roomRes as any).data?.name ?? null

  // Generar codigo con nuevo formato L-Año-Sala-Genetica-Nro
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
    created_by: user.id,
    cycle_id: activeCycle.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, data, cycle_name: activeCycle.name })
}