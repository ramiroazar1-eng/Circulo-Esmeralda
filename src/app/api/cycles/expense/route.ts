import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { cycle_id, category, description, supplier, invoice_number, quantity, unit, unit_price, total_amount, purchase_date, useful_cycles, allocated_amount, notes, is_recurring } = body

  if (!cycle_id || !category || !description || !total_amount || !purchase_date)
    return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })

  const service = await createServiceClient()

  // Crear el gasto
  const { data: expense, error: expenseError } = await service
    .from("cycle_expenses")
    .insert({ category, description, supplier, invoice_number, quantity, unit, unit_price, total_amount, purchase_date, useful_cycles: useful_cycles ?? 1, notes, is_recurring: is_recurring ?? false, created_by: user.id })
    .select()
    .single()

  if (expenseError) return NextResponse.json({ error: expenseError.message }, { status: 400 })

  if (is_recurring) {
    // Distribuir automaticamente entre ciclos activos por m2
    const purchaseDate = new Date(purchase_date)
    const month = purchaseDate.getMonth() + 1
    const year = purchaseDate.getFullYear()
    await service.rpc("distribute_recurring_expenses", { p_month: month, p_year: year })
  } else {
    // Asignar al ciclo actual
    const { error: allocError } = await service
      .from("cycle_expense_allocations")
      .insert({ expense_id: expense.id, cycle_id, allocated_amount: allocated_amount ?? total_amount })
    if (allocError) return NextResponse.json({ error: allocError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}