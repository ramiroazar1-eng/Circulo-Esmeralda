import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { notes } = body

  const service = await createServiceClient()

  const now = new Date()
  const start_date = now.toISOString().split("T")[0]

  // Usar secuencia para numero correlativo
  const { data: cycleNumber } = await service.rpc("nextval_cycle_number")
  const year = now.getFullYear()
  const name = `Ciclo ${String(cycleNumber).padStart(2, "0")}/${year}`

  const { data, error } = await service
    .from("production_cycles")
    .insert({
      name,
      start_date,
      status: "activo",
      notes: notes || null,
      created_by: user.id
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, data })
}