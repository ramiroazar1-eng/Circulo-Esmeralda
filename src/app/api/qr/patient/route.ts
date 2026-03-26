import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import QRCode from "qrcode"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { patientId } = await request.json()
  const service = await createServiceClient()

  const { data: patient } = await service
    .from("patients")
    .select("id, full_name, qr_token")
    .eq("id", patientId)
    .single()

  if (!patient) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

  let token = patient.qr_token
  if (!token) {
    token = "pt_" + Math.random().toString(36).substr(2, 8)
    await service.from("patients").update({ qr_token: token }).eq("id", patientId)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const qrUrl = `${appUrl}/p/${token}`
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 300,
    margin: 2,
    color: { dark: "#1e293b", light: "#ffffff" }
  })

  return NextResponse.json({ qrDataUrl, token, qrUrl, patientName: patient.full_name })
}
