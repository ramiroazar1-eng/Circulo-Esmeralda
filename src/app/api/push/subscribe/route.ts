import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { endpoint, p256dh, auth } = await request.json()
  if (!endpoint || !p256dh || !auth)
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()
  const { error } = await service.from("push_subscriptions").upsert({
    user_id: user.id, endpoint, p256dh, auth
  }, { onConflict: "user_id,endpoint" })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { endpoint } = await request.json()
  const service = await createServiceClient()
  await service.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint)
  return NextResponse.json({ success: true })
}