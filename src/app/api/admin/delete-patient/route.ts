import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  const { patientId, permanent } = await request.json()
  if (!patientId) return NextResponse.json({ error: "Falta el ID" }, { status: 400 })
  const service = await createServiceClient()
  if (permanent) {
    await service.from("profiles").update({ patient_id: null }).eq("patient_id", patientId)
    const { data: docs } = await service.from("patient_documents").select("file_path").eq("patient_id", patientId).not("file_path", "is", null)
    if (docs && docs.length > 0) {
      const paths = docs.map((d: any) => d.file_path).filter(Boolean)
      if (paths.length > 0) await service.storage.from("patient-documents").remove(paths)
    }
    await service.from("patient_documents").delete().eq("patient_id", patientId)
    await service.from("dispenses").delete().eq("patient_id", patientId)
    await service.from("membership_periods").delete().eq("patient_id", patientId)
    const { error } = await service.from("patients").delete().eq("id", patientId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } else {
    const { error } = await service.from("patients").update({ deleted_at: new Date().toISOString() }).eq("id", patientId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }
}
