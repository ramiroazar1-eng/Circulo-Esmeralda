import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get("file") as File
  const periodId = formData.get("period_id") as string

  if (!file || !periodId) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar que el período pertenece al paciente
  const { data: profile } = await service
    .from("profiles")
    .select("patient_id")
    .eq("id", user.id)
    .single()

  if (!profile?.patient_id) return NextResponse.json({ error: "Sin paciente asociado" }, { status: 403 })

  const { data: period } = await service
    .from("membership_periods")
    .select("id, patient_id, payment_status")
    .eq("id", periodId)
    .eq("patient_id", profile.patient_id)
    .single()

  if (!period) return NextResponse.json({ error: "Periodo no encontrado" }, { status: 404 })
  if (period.payment_status === "pagado") return NextResponse.json({ error: "Este periodo ya fue pagado" }, { status: 400 })

  // Subir archivo
  const ext = file.name.split(".").pop()
  const path = `${user.id}/${periodId}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await service.storage
    .from("comprobantes")
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  // Actualizar período
  const { error: updateError } = await service
    .from("membership_periods")
    .update({
      comprobante_url: path,
      comprobante_uploaded_at: new Date().toISOString(),
      payment_status: "pendiente_aprobacion"
    })
    .eq("id", periodId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}