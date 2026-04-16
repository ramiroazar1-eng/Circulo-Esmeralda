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
  const { data: lot } = await service
    .from("lots")
    .select("id, lot_code, status, harvest_date, genetic:genetics(name, description), room:rooms(name)")
    .eq("qr_token", token)
    .single()

  if (!lot) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })

  // Obtener stock acopio y operativo
  const { data: stockPositions } = await service
    .from("stock_positions")
    .select("available_grams, reserved_grams, storage_type")
    .eq("lot_id", lot.id)

  const acopio = stockPositions?.find(s => s.storage_type === "acopio")
  const operativo = stockPositions?.find(s => s.storage_type === "operativo")

  return NextResponse.json({
    ...lot,
    role,
    stock_acopio: acopio?.available_grams ?? 0,
    stock_operativo: operativo?.available_grams ?? 0,
    stock_reservado: operativo?.reserved_grams ?? 0,
  })
}