import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data } = await supabase
    .from("recurring_expense_templates")
    .select("*")
    .order("category")
    .order("description")

  return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { category, description, supplier, amount } = await request.json()
  if (!category || !description || !amount)
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()
  const { error } = await service.from("recurring_expense_templates").insert({
    category, description, supplier: supplier || null, amount, created_by: user.id
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { id } = await request.json()
  const service = await createServiceClient()
  const { error } = await service.from("recurring_expense_templates").update({ is_active: false }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}