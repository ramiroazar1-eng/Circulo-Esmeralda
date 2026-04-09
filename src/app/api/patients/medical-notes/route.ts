import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","medico"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { patient_id, medical_notes } = await request.json()
  if (!patient_id) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()
  const { error } = await service
    .from("patients")
    .update({ medical_notes: medical_notes || null, updated_at: new Date().toISOString() })
    .eq("id", patient_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await service.from("audit_logs").insert({
    performed_by: user.id,
    action: "editar",
    entity_type: "patients",
    entity_id: patient_id,
    entity_label: "Notas clinicas actualizadas",
    performed_at: new Date().toISOString()
  }).then(() => {})

  return NextResponse.json({ success: true })
}