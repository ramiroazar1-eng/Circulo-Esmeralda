import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin","administrativo"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await request.json()
  const { request_id, status, admin_notes } = body

  if (!request_id || !status) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  const { data: planReq } = await service
    .from("plan_requests")
    .select("*")
    .eq("id", request_id)
    .single()

  if (!planReq) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })

  await service.from("plan_requests").update({
    status,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    admin_notes: admin_notes ?? null,
    updated_at: new Date().toISOString()
  }).eq("id", request_id)

  if (status === "aprobado") {
    if (planReq.request_type === "upgrade" && planReq.requested_plan_id) {
      await service.from("patients").update({
        membership_plan_id: planReq.requested_plan_id,
        pending_deduction: planReq.pending_deduction ?? 0,
        updated_at: new Date().toISOString()
      }).eq("id", planReq.patient_id)
    }

    if (planReq.request_type === "exception" && planReq.requested_grams) {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

      const { data: patient } = await service
        .from("patients")
        .select("membership_plan:membership_plans(monthly_grams), pending_deduction")
        .eq("id", planReq.patient_id)
        .single()

      const currentLimit = (patient as any)?.membership_plan?.monthly_grams ?? 0
      const pendingDed = (patient as any)?.pending_deduction ?? 0
      const newDeduction = pendingDed + planReq.requested_grams

      await service.from("patients").update({
        pending_deduction: newDeduction,
        updated_at: new Date().toISOString()
      }).eq("id", planReq.patient_id)
    }
  }

  return NextResponse.json({ success: true })
}
