import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import QRCode from "qrcode"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { lotId } = await request.json()
  const service = await createServiceClient()

  const { data: lot } = await service
    .from("lots")
    .select("id, lot_code, qr_token, genetic:genetics(name)")
    .eq("id", lotId)
    .single()

  if (!lot) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })

  let token = lot.qr_token
  if (!token) {
    token = "lt_" + Math.random().toString(36).substr(2, 8)
    await service.from("lots").update({ qr_token: token }).eq("id", lotId)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const qrUrl = `${appUrl}/l/${token}`
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 300,
    margin: 2,
    color: { dark: "#1e293b", light: "#ffffff" }
  })

  return NextResponse.json({ qrDataUrl, token, qrUrl, lotCode: lot.lot_code, genetic: (lot as any).genetic?.name })
}
