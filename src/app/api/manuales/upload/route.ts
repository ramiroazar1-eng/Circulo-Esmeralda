import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","administrativo"].includes(profile?.role ?? "")) return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const body = await request.json()
  const { title, description, category, file_path, file_name, file_size_bytes } = body

  const service = await createServiceClient()
  const { error } = await service.from("manuales").insert({
    title, description: description || null, category: category || "general",
    file_path, file_name, file_size_bytes,
    uploaded_by: user.id, uploaded_at: new Date().toISOString()
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
