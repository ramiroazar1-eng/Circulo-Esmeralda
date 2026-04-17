import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","biologo","director_de_cultivo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { name, category, unit, stock_alert_threshold, notes } = await request.json()
  if (!name || !category || !unit)
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })

  const service = await createServiceClient()
  const { error } = await service.from("supply_products").insert({
    name, category, unit,
    stock_alert_threshold: stock_alert_threshold ?? 0,
    notes: notes || null,
    created_by: user.id
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
