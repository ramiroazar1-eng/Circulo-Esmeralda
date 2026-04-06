content = '''import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { patient_id, items, product_desc, notes, delivery_type, delivery_address, delivery_phone } = body

  if (!patient_id || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
  }

  for (const item of items) {
    if (!item.genetic_id || !item.grams || item.grams <= 0) {
      return NextResponse.json({ error: "Cada item debe tener genetica y gramos validos" }, { status: 400 })
    }
  }

  const service = await createServiceClient()
  const totalGrams = items.reduce((acc: number, item: any) => acc + parseFloat(item.grams), 0)

  // Verificar limite mensual
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

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

    const { data: monthOrders } = await service
      .from("orders")
      .select("grams")
      .eq("patient_id", patient_id)
      .in("status", ["nuevo", "pendiente_aprobacion", "aprobado", "en_preparacion", "empaquetado"])
      .gte("created_at", startOfMonth)

    const usedGrams = (monthDispenses ?? []).reduce((acc: number, d: any) => acc + parseFloat(d.grams), 0)
    const reservedGrams = (monthOrders ?? []).reduce((acc: number, o: any) => acc + parseFloat(o.grams), 0)
    const totalUsed = usedGrams + reservedGrams

    if (totalUsed + totalGrams > monthlyLimit) {
      return NextResponse.json({
        error: `Supera el limite mensual. Disponible: ${(monthlyLimit - totalUsed).toFixed(1)}g de ${monthlyLimit}g`
      }, { status: 400 })
    }
  }

  // Crear orden
  const { data: order, error: orderError } = await service
    .from("orders")
    .insert({
      patient_id,
      grams: totalGrams,
      product_desc: product_desc || "flor seca",
      notes: notes || null,
      delivery_type: delivery_type || "retiro",
      delivery_address: delivery_address || null,
      delivery_phone: delivery_phone || null,
      status: "nuevo",
      created_by: user.id
    })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 })

  // Crear items - el trigger asigna lote automaticamente
  const orderItems = items.map((item: any) => ({
    order_id: order.id,
    genetic_id: item.genetic_id,
    lot_id: item.lot_id || null,
    grams: parseFloat(item.grams)
  }))

  const { error: itemsError } = await service
    .from("order_items")
    .insert(orderItems)

  if (itemsError) {
    // Rollback: eliminar la orden
    await service.from("orders").delete().eq("id", order.id)
    return NextResponse.json({ error: itemsError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, data: order })
}'''

with open("src/app/api/orders/create/route.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("OK - " + str(len(content.splitlines())) + " lineas")
