import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { cycle_id } = await request.json()
  if (!cycle_id) return NextResponse.json({ error: "Falta cycle_id" }, { status: 400 })

  const service = await createServiceClient()

  // Calcular metricas finales
  const { data: lots } = await service
    .from("lots")
    .select("net_grams, gross_grams, waste_grams, start_date, harvest_date")
    .eq("cycle_id", cycle_id)

  const totalNet = (lots ?? []).reduce((acc: number, l: any) => acc + (parseFloat(l.net_grams) || 0), 0)
  const totalGross = (lots ?? []).reduce((acc: number, l: any) => acc + (parseFloat(l.gross_grams) || 0), 0)

  // Usar fecha del ultimo lote finalizado como fecha de fin
  const lastFinished = (lots ?? []).filter((l: any) => l.harvest_date).map((l: any) => l.harvest_date).sort().pop()
  const endDate = lastFinished ?? new Date().toISOString().split("T")[0]

  // Cerrar el ciclo
  const { error } = await service
    .from("production_cycles")
    .update({
      status: "finalizado",
      end_date: endDate,
    })
    .eq("id", cycle_id)
    .eq("status", "activo")

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true, totalNet, totalGross })
}