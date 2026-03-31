import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { patient_id, plan_id, period_month, period_year, amount, payment_date, payment_method, notes } = body

  const service = await createServiceClient()

  const { data: existing } = await service
    .from("membership_payments")
    .select("id")
    .eq("patient_id", patient_id)
    .eq("period_month", period_month)
    .eq("period_year", period_year)
    .single()

  if (existing) return NextResponse.json({ error: "Ya existe un pago registrado para este periodo" }, { status: 400 })

  const { data: seqResult } = await service.rpc("nextval", { sequence_name: "receipt_number_seq" }).single()
  const receipt_number = (seqResult as any) ?? 1

  const { data, error } = await service
    .from("membership_payments")
    .insert({
      patient_id, plan_id, period_month, period_year,
      amount, payment_date, payment_method: payment_method ?? "efectivo",
      receipt_number, notes: notes ?? null, created_by: user.id
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, data })
}
