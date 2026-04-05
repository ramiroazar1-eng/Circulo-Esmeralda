import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { patient_id, request_type, requested_plan_id, requested_grams, reason } = body

  if (!patient_id || !request_type) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
  if (request_type === "upgrade" && !requested_plan_id) return NextResponse.json({ error: "Falta el plan solicitado" }, { status: 400 })
  if (request_type === "exception" && !requested_grams) return NextResponse.json({ error: "Falta la cantidad de gramos" }, { status: 400 })

  const service = await createServiceClient()

  const { data: existing } = await service
    .from("plan_requests")
    .select("id")
    .eq("patient_id", patient_id)
    .eq("status", "pendiente")
    .single()

  if (existing) return NextResponse.json({ error: "Ya tenes una solicitud pendiente de revision" }, { status: 400 })

  const { data: patient } = await service
    .from("patients")
    .select("membership_plan_id")
    .eq("id", patient_id)
    .single()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: monthDispenses } = await service
    .from("dispenses")
    .select("grams")
    .eq("patient_id", patient_id)
    .gte("dispensed_at", startOfMonth)

  const usedGrams = (monthDispenses ?? []).reduce((acc: number, d: any) => acc + parseFloat(d.grams), 0)

  let pendingDeduction = 0
  let appliesFrom = null

  if (request_type === "upgrade") {
    const { data: currentPlan } = await service
      .from("membership_plans")
      .select("monthly_grams")
      .eq("id", (patient as any)?.membership_plan_id)
      .single()

    const currentLimit = (currentPlan as any)?.monthly_grams ?? 0
    if (usedGrams > currentLimit) pendingDeduction = usedGrams - currentLimit

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    appliesFrom = nextMonth.toISOString().split("T")[0]
  }

  const { data: req, error } = await service
    .from("plan_requests")
    .insert({
      patient_id,
      request_type,
      current_plan_id: (patient as any)?.membership_plan_id ?? null,
      requested_plan_id: requested_plan_id ?? null,
      requested_grams: requested_grams ?? null,
      reason: reason ?? null,
      pending_deduction: pendingDeduction,
      applies_from: appliesFrom,
      status: "pendiente"
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, data: req })
}
