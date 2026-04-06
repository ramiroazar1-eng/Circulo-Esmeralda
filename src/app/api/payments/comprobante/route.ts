import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")
  if (!path) return NextResponse.json({ error: "Falta path" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar permisos
  const { data: profile } = await service.from("profiles").select("role, patient_id").eq("id", user.id).single()
  const isAdmin = ["admin", "administrativo"].includes(profile?.role)
  const isOwner = path.startsWith(user.id + "/")

  if (!isAdmin && !isOwner)
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { data, error } = await service.storage.from("comprobantes").createSignedUrl(path, 60)
  if (error || !data) return NextResponse.json({ error: "No se pudo generar URL" }, { status: 500 })

  return NextResponse.redirect(data.signedUrl)
}