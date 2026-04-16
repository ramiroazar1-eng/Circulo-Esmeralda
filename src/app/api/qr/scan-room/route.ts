import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }
  const role = profile?.role ?? "guest"

  const service = await createServiceClient()

  const { data: room } = await service
    .from("rooms")
    .select("id, name, square_meters")
    .eq("qr_token", token)
    .single()

  if (!room) return NextResponse.json({ error: "Sala no encontrada" }, { status: 404 })

  // Lotes activos en esta sala
  const { data: lots } = await service
    .from("lots")
    .select("id, lot_code, status, plant_count, seedling_date, veg_date, flower_date, genetic:genetics(name), cycle:production_cycles(id, name, status)")
    .eq("room_id", room.id)
    .in("status", ["plantines","vegetativo","floracion","cosecha","secado","curado"])
    .order("created_at", { ascending: false })

  // Ciclo activo
  const { data: activeCycle } = await service
    .from("production_cycles")
    .select("id, name")
    .eq("status", "activo")
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    room,
    lots: lots ?? [],
    active_cycle: activeCycle,
    role,
  })
}