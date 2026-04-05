import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { patient_id, genetic_id, lot_id, grams, product_desc, notes } = body

  if (!patient_id || !grams) return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
  if (grams <= 0) return NextResponse.json({ error: "Los gramos deben ser mayor a 0" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar limite mensual del paciente
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data: patient } = await service
    .from("patients")
    .select("membership_plan:membership_plans(monthly_grams)")
    .eq("id", patient_id)
    .single()

  const monthlyLimit = (patient as any)?.membership_plan?.monthly_grams
  if (monthlyLimit) {
    const { data: monthDispenses } = await service
      .from("dispenses")
      .select("grams")
      .eq("patient_id", patient_id)
      .gte("dispensed_at", startOfMonth)
      .lte("dispensed_at", endOfMonth)

    const { data: monthOrders } = await service
      .from("orders")
      .select("grams")
      .eq("patient_id", patient_id)
      .not("status", "eq", "cancelado")
      .gte("created_at", startOfMonth)
      .lte("created_at", endOfMonth)

    const usedGrams = (monthDispenses ?? []).reduce((acc: number, d: any) => acc + parseFloat(d.grams), 0)
    const reservedGrams = (monthOrders ?? []).reduce((acc: number, o: any) => acc + parseFloat(o.grams), 0)
    const totalUsed = usedGrams + reservedGrams

    if (totalUsed + grams > monthlyLimit) {
      return NextResponse.json({
        error: `Supera el limite mensual. Disponible: ${(monthlyLimit - totalUsed).toFixed(1)}g de ${monthlyLimit}g`
      }, { status: 400 })
    }
  }

  const { data: order, error } = await service
    .from("orders")
    .insert({
      patient_id,
      genetic_id: genetic_id || null,
      lot_id: lot_id || null,
      grams: parseFloat(grams),
      product_desc: product_desc || "flor seca",
      notes: notes || null,
      status: "nuevo",
      created_by: user.id
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Log en audit
  await service.from("audit_logs").insert({
    user_id: user.id,
    action: "order_created",
    table_name: "orders",
    record_id: order.id,
    new_values: { patient_id, grams, genetic_id }
  }).then(() => {})

  return NextResponse.json({ success: true, data: order })
}
