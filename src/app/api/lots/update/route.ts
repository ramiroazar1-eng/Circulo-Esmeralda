import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","biologo","director_de_cultivo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const body = await request.json()
  const { lot_id, ...updates } = body
  if (!lot_id) return NextResponse.json({ error: "Falta lot_id" }, { status: 400 })

  const service = await createServiceClient()

  // Obtener estado anterior del lote
  const { data: prevLot } = await service.from("lots").select("net_grams, status").eq("id", lot_id).single()

  // Determinar nuevo status segun etapas completadas
  let newStatus = prevLot?.status ?? "plantines"
  if (updates.curing_start_date) newStatus = "curado"
  else if (updates.drying_start_date) newStatus = "secado"
  else if (updates.harvest_date) newStatus = "cosecha"
  else if (updates.flower_date) newStatus = "floracion"
  else if (updates.veg_date) newStatus = "vegetativo"
  else if (updates.seedling_date) newStatus = "plantines"

  // Actualizar lote
  const { error: lotError } = await service
    .from("lots")
    .update({ ...updates, status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", lot_id)

  if (lotError) return NextResponse.json({ error: lotError.message }, { status: 400 })

  // Si hay net_grams nuevos, actualizar stock_positions en acopio
  const newNetGrams = parseFloat(updates.net_grams) || 0
  const prevNetGrams = parseFloat(prevLot?.net_grams) || 0

  if (newNetGrams > 0 && newNetGrams !== prevNetGrams) {
    // Verificar si ya existe posicion de acopio
    const { data: existing } = await service
      .from("stock_positions")
      .select("id, available_grams")
      .eq("lot_id", lot_id)
      .eq("storage_type", "acopio")
      .maybeSingle()

    if (existing) {
      // Recalcular: acopio = net_grams - lo que ya se transfirió
      const { data: transfers } = await service
        .from("stock_transfers")
        .select("grams")
        .eq("lot_id", lot_id)
      const transferred = (transfers ?? []).reduce((acc: number, t: any) => acc + (t.grams ?? 0), 0)
      const newAcopio = Math.max(0, newNetGrams - transferred)
      await service.from("stock_positions").update({ available_grams: newAcopio, updated_at: new Date().toISOString() }).eq("id", existing.id)
    } else {
      // Crear nueva posicion de acopio
      await service.from("stock_positions").insert({
        lot_id,
        available_grams: newNetGrams,
        reserved_grams: 0,
        storage_type: "acopio",
      })
    }
  }

  return NextResponse.json({ success: true, status: newStatus })
}
