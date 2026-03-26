import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 })

  const service = await createServiceClient()
  const { data: patient } = await service
    .from("patients")
    .select(`
      id, full_name, dni, status, compliance_status,
      reprocann_status, reprocann_expiry,
      membership_plan:membership_plans(name, monthly_grams, monthly_amount)
    `)
    .eq("qr_token", token)
    .is("deleted_at", null)
    .single()

  if (!patient) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

  // Docs pendientes
  const { data: docs } = await service
    .from("patient_documents")
    .select("status")
    .eq("patient_id", patient.id)

  const docsCriticos = (docs ?? []).filter(d => ["faltante","vencido"].includes(d.status)).length
  const docsPendientes = (docs ?? []).filter(d => d.status === "pendiente_revision").length

  return NextResponse.json({ ...patient, docsCriticos, docsPendientes })
}
