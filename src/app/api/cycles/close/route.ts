import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { cycle_id, force = false } = await request.json()
  if (!cycle_id) return NextResponse.json({ error: "Falta cycle_id" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar stock remanente en acopio y operativo
  const { data: lotIds } = await service
    .from("lots")
    .select("id")
    .eq("cycle_id", cycle_id)

  const ids = (lotIds ?? []).map((l: any) => l.id)

  let stockRemanente = 0
  if (ids.length > 0) {
    const { data: stockPos } = await service
      .from("stock_positions")
      .select("available_grams, storage_type, lot:lots(lot_code)")
      .in("lot_id", ids)
      .gt("available_grams", 0)

    stockRemanente = (stockPos ?? []).reduce((acc: number, s: any) => acc + (s.available_grams ?? 0), 0)

    // Si hay stock y no se fuerza el cierre, advertir
    if (stockRemanente > 0 && !force) {
      return NextResponse.json({
        warning: true,
        message: `Hay ${stockRemanente.toFixed(1)}g de stock remanente en este ciclo. Descargá el historial antes de cerrar.`,
        stock_remanente: stockRemanente
      }, { status: 200 })
    }
  }

  // Calcular metricas finales
  const { data: lots } = await service
    .from("lots")
    .select("net_grams, gross_grams, waste_grams, start_date, harvest_date")
    .eq("cycle_id", cycle_id)

  const totalNet = (lots ?? []).reduce((acc: number, l: any) => acc + (parseFloat(l.net_grams) || 0), 0)
  const totalGross = (lots ?? []).reduce((acc: number, l: any) => acc + (parseFloat(l.gross_grams) || 0), 0)

  const lastFinished = (lots ?? []).filter((l: any) => l.harvest_date).map((l: any) => l.harvest_date).sort().pop()
  const endDate = lastFinished ?? new Date().toISOString().split("T")[0]

  const { error } = await service
    .from("production_cycles")
    .update({ status: "finalizado", end_date: endDate })
    .eq("id", cycle_id)
    .eq("status", "activo")

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, totalNet, totalGross })
}
