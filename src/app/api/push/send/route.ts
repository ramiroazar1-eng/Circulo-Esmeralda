import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import webpush from "web-push"

export async function POST(request: Request) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const { title, body, order_id } = await request.json()
  if (!title || !body) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  const { data: profiles } = await service
    .from("profiles")
    .select("id")
    .in("role", ["admin","administrativo"])
    .eq("is_active", true)

  if (!profiles || profiles.length === 0)
    return NextResponse.json({ success: true, sent: 0 })

  const userIds = profiles.map(p => p.id)

  const { data: subscriptions } = await service
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds)

  if (!subscriptions || subscriptions.length === 0)
    return NextResponse.json({ success: true, sent: 0 })

  const payload = JSON.stringify({
    title,
    body,
    url: order_id ? "/dispensas/pedidos" : "/dashboard",
    icon: "/icons/icon-192x192.png",
  })

  let sent = 0
  const failed: string[] = []

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        failed.push(sub.id)
      }
    }
  }

  if (failed.length > 0) {
    await service.from("push_subscriptions").delete().in("id", failed)
  }

  return NextResponse.json({ success: true, sent })
}