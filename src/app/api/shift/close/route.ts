import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!["admin", "administrativo"].includes(profile?.role ?? ""))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { actual_grams, explanation } = await request.json()
  if (actual_grams === undefined || actual_grams === null)
    return NextResponse.json({ error: "Ingresa el peso real del stock" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar que no existe cierre para hoy
  const today = new Date().toISOString().split("T")[0]
  const { data: existing } = await service
    .from("shift_closures")
    .select("id")
    .eq("closure_date", today)
    .maybeSingle()

  if (existing)
    return NextResponse.json({ error: "Ya existe un cierre para hoy" }, { status: 400 })

  // Calcular stock esperado — todo el stock operativo disponible
  const { data: stockPositions } = await service
    .from("stock_positions")
    .select("available_grams")
    .eq("storage_type", "operativo")
    .gt("available_grams", 0)

  const expected_grams = (stockPositions ?? []).reduce((acc: number, s: any) => acc + (s.available_grams ?? 0), 0)
  const difference = actual_grams - expected_grams
  const absDiff = Math.abs(difference)

  // Determinar status
  let status = "ok"
  if (absDiff > 3) {
    status = "bloqueado"
    if (!explanation)
      return NextResponse.json({
        error: `Diferencia de ${absDiff.toFixed(1)}g detectada. Se requiere explicacion obligatoria.`,
        requires_explanation: true,
        difference: absDiff
      }, { status: 400 })
  } else if (absDiff > 0) {
    status = "diferencia"
  }

  // Registrar cierre
  await service.from("shift_closures").insert({
    closed_by: user.id,
    closure_date: today,
    expected_grams,
    actual_grams,
    explanation: explanation || null,
    status
  })

  // Si hay diferencia > 3g crear alerta
  if (absDiff > 3) {
    await service.from("stock_alerts").insert({
      tipo: "diferencia_cierre",
      mensaje: `Diferencia de ${absDiff.toFixed(1)}g en cierre de turno del ${today}. Explicacion: ${explanation}`,
      data: { date: today, expected_grams, actual_grams, difference, closed_by: user.id }
    })
  }

  return NextResponse.json({ success: true, status, difference, expected_grams })
}
