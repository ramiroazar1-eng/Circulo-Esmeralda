import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { patient_id, items, notes, delivery_type, delivery_address, delivery_phone } = body

  if (!patient_id || !items || !Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })

  for (const item of items) {
    if (!item.genetic_id || !item.grams || item.grams <= 0)
      return NextResponse.json({ error: "Cada item debe tener genetica y gramos validos" }, { status: 400 })
  }

  const service = await createServiceClient()
  const totalGrams = items.reduce((acc: number, item: any) => acc + parseFloat(item.grams), 0)

  // Verificar stock disponible por genetica
  for (const item of items) {
    const { data: stockRows } = await service
      .from("v_stock_available")
      .select("available_grams")
      .eq("genetic_id", item.genetic_id)
      .gt("available_grams", 0)
    const totalStock = (stockRows ?? []).reduce((acc: number, r: any) => acc + parseFloat(r.available_grams), 0)
    if (totalStock < item.grams)
      return NextResponse.json({ error: `Stock insuficiente para la genetica solicitada. Disponible: ${totalStock.toFixed(1)}g` }, { status: 400 })
  }

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
    const { data: monthDispenses } = await service.from("dispenses").select("grams").eq("patient_id", patient_id).gte("dispensed_at", startOfMonth)
    const { data: monthOrders } = await service.from("orders").select("grams").eq("patient_id", patient_id).in("status", ["nuevo","pendiente_aprobacion","aprobado","en_preparacion","empaquetado"]).gte("created_at", startOfMonth)
    const usedGrams = (monthDispenses ?? []).reduce((acc: number, d: any) => acc + parseFloat(d.grams), 0)
    const reservedGrams = (monthOrders ?? []).reduce((acc: number, o: any) => acc + parseFloat(o.grams), 0)
    if (usedGrams + reservedGrams + totalGrams > monthlyLimit)
      return NextResponse.json({ error: `Supera el limite mensual. Disponible: ${(monthlyLimit - usedGrams - reservedGrams).toFixed(1)}g` }, { status: 400 })
  }

  // Crear orden
  const { data: order, error: orderError } = await service
    .from("orders")
    .insert({
      patient_id,
      grams: totalGrams,
      product_desc: "flor seca",
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

  // Auto-asignar lotes FIFO por genetica
  const orderItems: any[] = []
  for (const item of items) {
    // Obtener lotes disponibles de esta genetica ordenados por start_date (FIFO)
    const { data: lots } = await service
      .from("lots")
      .select("id, start_date, lot_code")
      .eq("genetic_id", item.genetic_id)
      .in("status", ["cosecha", "secado", "curado", "disponible", "finalizado"])
      .order("start_date", { ascending: true })
    
    // Obtener stock disponible por lote
    const { data: stockRows } = await service
      .from("v_stock_available")
      .select("lot_id, available_grams")
      .eq("genetic_id", item.genetic_id)
      .gt("available_grams", 0)
    
    const stockByLot: Record<string, number> = {}
    for (const row of (stockRows ?? [])) {
      stockByLot[row.lot_id] = parseFloat(row.available_grams)
    }

    // Distribuir gramos FIFO
    let remaining = parseFloat(item.grams)
    for (const lot of (lots ?? [])) {
      if (remaining <= 0) break
      const available = stockByLot[lot.id] ?? 0
      if (available <= 0) continue
      const take = Math.min(remaining, available)
      orderItems.push({
        order_id: order.id,
        genetic_id: item.genetic_id,
        lot_id: lot.id,
        grams: take
      })
      remaining -= take
    }

    // Si queda restante sin lote (no deberia pasar por la validacion previa)
    if (remaining > 0) {
      orderItems.push({ order_id: order.id, genetic_id: item.genetic_id, lot_id: null, grams: remaining })
    }
  }

  const { error: itemsError } = await service.from("order_items").insert(orderItems)
  if (itemsError) {
    await service.from("orders").delete().eq("id", order.id)
    return NextResponse.json({ error: itemsError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, data: order })
}