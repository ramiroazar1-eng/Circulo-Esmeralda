import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

  const service = await createServiceClient()
  const { data: lot } = await service
    .from("lots")
    .select(`
      id, lot_code, status, harvest_date,
      genetic:genetics(name, description),
      room:rooms(name),
      stock_position:stock_positions(available_grams)
    `)
    .eq("qr_token", token)
    .single()

  if (!lot) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
  if (lot.status !== "finalizado") return NextResponse.json({ error: "Lote no disponible para dispensa" }, { status: 400 })

  return NextResponse.json(lot)
}
