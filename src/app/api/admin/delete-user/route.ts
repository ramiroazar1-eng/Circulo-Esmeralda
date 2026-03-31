import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: "Falta el ID" }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: "No podes eliminar tu propio usuario" }, { status: 400 })
  const service = await createServiceClient()
  await service.from("profiles").delete().eq("id", userId)
  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
