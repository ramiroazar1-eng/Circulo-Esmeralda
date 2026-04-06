import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await (await createServiceClient())
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || !["admin", "administrativo"].includes(profile.role))
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { period_id, action } = await request.json()
  if (!period_id || !["aprobar", "rechazar"].includes(action))
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 })

  const service = await createServiceClient()
  const newStatus = action === "aprobar" ? "pagado" : "pendiente"

  const updates: any = {
    payment_status: newStatus,
    registered_by: user.id
  }
  if (action === "aprobar") updates.paid_at = new Date().toISOString()
  if (action === "rechazar") {
    updates.comprobante_url = null
    updates.comprobante_uploaded_at = null
  }

  const { error } = await service
    .from("membership_periods")
    .update(updates)
    .eq("id", period_id)
    .eq("payment_status", "pendiente_aprobacion")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, status: newStatus })
}