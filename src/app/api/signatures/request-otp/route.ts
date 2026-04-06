import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await request.json()
  const { patient_id, template_id } = body
  if (!patient_id || !template_id) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const service = await createServiceClient()

  // Verificar que no haya firma existente
  const { data: existing } = await service
    .from("document_signatures")
    .select("id, status")
    .eq("patient_id", patient_id)
    .eq("template_id", template_id)
    .eq("status", "firmado")
    .maybeSingle()

  if (existing) return NextResponse.json({ error: "El documento ya fue firmado" }, { status: 400 })

  // Obtener template
  const { data: template } = await service
    .from("document_templates")
    .select("version")
    .eq("id", template_id)
    .single()

  if (!template) return NextResponse.json({ error: "Template no encontrado" }, { status: 404 })

  // Generar OTP
  const otp = generateOTP()
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutos

  // Upsert signature record con OTP
  const { data: sig, error: sigError } = await service
    .from("document_signatures")
    .upsert({
      patient_id,
      template_id,
      template_version: template.version,
      status: "pendiente",
      otp_code: otp,
      otp_sent_at: new Date().toISOString(),
      otp_verified: false,
      updated_at: new Date().toISOString()
    }, { onConflict: "patient_id,template_id" })
    .select()
    .single()

  if (sigError) return NextResponse.json({ error: sigError.message }, { status: 400 })

  // Enviar OTP por email via Brevo
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY ?? ""
      },
      body: JSON.stringify({
        sender: { name: "Circulo Esmeralda", email: "noreply@circuloesmeralda.com.ar" },
        to: [{ email: user.email! }],
        subject: "Codigo de verificacion - AEF Simple Asociacion",
        htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a2e1a;">Circulo Esmeralda - AEF</h2>
          <p>Tu codigo de verificacion para firmar el documento de membresia es:</p>
          <div style="background: #f0f4f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2d5a27;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 13px;">Este codigo vence en 10 minutos.</p>
          <p style="color: #666; font-size: 13px;">Si no solicitaste este codigo, ignora este mensaje.</p>
        </div>`
      })
    })
  } catch(e) {
    console.error("Email send error:", e)
  }

  return NextResponse.json({ success: true, signature_id: sig.id })
}